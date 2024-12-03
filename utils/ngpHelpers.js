/**
 * @file ngpHelpers.js
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
const eventEmitter = require('./ngpEvents'); // Assuming you already have this imported
const { ButtonBuilder, EmbedBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const ngpEventsPath = path.join(__dirname, '../data/ngpEvents.json');
const winnersPath = path.join(__dirname, '../data/winners.json');
const { getUserBalance, updateUserBalance, logTransaction, distributePointsIfNotDone } = require('./pointsHelper');
const { saveNGPEvents, getCurrentEvents } = require('./eventUtils');
const distributorPing = config.roles.distributor
const logChannelId = config.channels.ngpLog
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**
 * @function getNGPEventById
 * @description Fetch an NGP event by its ID.
 * @param {string} eventId The ID of the NGP event.
 * @returns {object} The NGP event object.
 */
function getNGPEventById(eventId) {
    const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
    const event = eventsData.find(event => event.event_id === eventId);

    if (!event) {
        console.error(`Event with ID ${eventId} not found.`);
        return null; // Return early if event is invalid
    }

    if (!Array.isArray(event.participants)) {
        console.error(`Invalid participants array for event ID: ${eventId}. Participants:`, event.participants);
        // event.participants = []; // Fix by initializing as an empty array
    }

    return event;
}

/**
 * Validates the client object before accessing its properties.
 * @param {object} client - The Discord client object.
 * @returns {boolean} True if valid, false otherwise.
 */
function isValidClient(client) {
    return client && client.channels && typeof client.channels.fetch === 'function';
}


/**
 * @function checkAndDeclareWinner
 * @description Checks if all participants have rolled and declares the winner.
 * If it's an open NGP, waits until expiration to declare the winner.
 * @param {string} eventId The ID of the NGP event.
 * @param {object} interaction The interaction object for the current event.
 */
async function checkAndDeclareWinner(eventId, interaction, client) {
    // console.log('Debug: checkAndDeclareWinner called with client:', client);
    
    if (!isValidClient(client)) {
        console.error('Invalid client passed to checkAndDeclareWinner.');
        return;
    }
    
    
    
    const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
    const event = eventsData.find(event => event.event_id === eventId);
    if (!event || !Array.isArray(event.participants)) {
        console.error(`Invalid event or participants data for event ID ${eventId}`);
        return;
    }

    const participants = event.participants;

    if (event.is_open_ngp) {
        console.log(`Skipping private event handling for Open NGP event: ${event.event_id}`);
        return;
    }


    if (participants.length === 0) {
        console.error(`No participants available for event ${eventId}. Cannot determine winner.`);
        return;
    }

    // Check if all participants chose to pass
    const allPassed = participants.every(p => p.roll_type === 'Pass');
    if (allPassed) {
        console.log(`All participants passed in NGP event ${eventId}.`);

        // Distribute points among participants who passed
        if (guildPointsSystemEnabled) {
            distributePointsIfNotDone(event, client);
            }

        if (!event.is_open_ngp) {
            // Mark private events as inactive and create an open NGP
            event.active = false;
            saveNGPEvents(eventsData);

            // Post a summary in the designated log channel if not a debug event
            if (!event.debug) await postEventSummary(client, event);

            console.log(`Creating new Open NGP for private event ${eventId}.`);
            await createOpenNGPPost(client, event);
        } else {
            console.log(`No action taken as this is an Open NGP.`);
            // Do not mark open NGPs as inactive
            saveNGPEvents(eventsData);
        }

        return;
    }

    // Ensure all participants have rolled or passed
    const allRolledOrPassed = participants.every(p => p.roll_value !== null || p.roll_type === 'Pass');
    if (!allRolledOrPassed) return;

    // If the event is open, do not immediately declare a winner; wait until expiration
    if (event.is_open_ngp) {
        console.log(`Open NGP event ${eventId} - winner will be declared upon expiration.`);
        return;
    }

    // For private events, determine the winner immediately after all rolls are completed
    const winner = determineWinner(client, event); // Pass the entire event for highest bid check
    if (!winner) return;

    // Distribute points to participants who passed based on event rarity
    if (guildPointsSystemEnabled) {
        distributePointsIfNotDone(event, client);
        }
    finalizeEvent(event, winner, client); // Mark event as inactive
    saveNGPEvents(eventsData);

    try {
        await announceWinner(client, event, winner);

        // Post a summary in the designated log channel if not a debug event
        if (!event.debug) await postEventSummary(client, event);

    } catch (error) {
        console.error('Error fetching message or creating thread:', error);
        await interaction.reply({ content: 'An error occurred while declaring the winner. Please try again later.', ephemeral: true });
    }
}

/**
 * @function handleNGPExpiration
 * @description Checks for expired NGP events and handles any that have passed their expiration time.
 * @param {Client} client - The Discord client object.
 */
async function handleNGPExpiration(client) {
    const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));

    // // Check for anti-snipe before processing expirations
    // checkForAntiSnipe();

    const currentTime = Math.floor(Date.now() / 1000);

    for (const event of eventsData) {
        if (event.active && event.expires_at < currentTime) {
            console.log(`NGP event expired: ${event.event_id}`);
            await processExpiredEvent(client, event, eventsData);

            if (!event.debug) {
                await postEventSummary(client, event);
            }
        }
    }
}

/**
 * @function postEventSummary
 * @description Creates and sends an embed of the expired event's details to the designated log channel.
 * @param {Client} client - The Discord client object.
 * @param {object} event - The expired event object.
 */
async function postEventSummary(client, event) {
    if (!isValidClient(client)) {
        console.error('Invalid client passed to postEventSummary.');
        return;
    }

    // Determine the guild involved in the event
    let guildInvolved = 'None';
    const participant = event.participants[0];
    if (participant) {
        const member = await client.guilds.cache
            .first() // Assuming only one guild, adjust if there are multiple guilds.
            .members.fetch(participant.name.replace(/[<@>]/g, ''))
            .catch(() => null);

        if (member) {
            for (const [key, guild] of Object.entries(config.guilds)) {
                if (member.roles.cache.has(guild.role_id)) {
                    guildInvolved = guild.name;
                    break;
                }
            }
        }
    }

    const embed = new EmbedBuilder()
        .setTitle(`Expired NGP Event Summary: ${event.item}`)
        .setDescription(`**Rarity**: ${event.rarity}\n**Event ID**: ${event.event_id}\n**Guild Involved**: ${guildInvolved}`)
        .addFields(
            { name: 'Created At', value: `<t:${event.created_at}:f>`, inline: true },
            { name: 'Expired At', value: `<t:${event.expires_at}:f>`, inline: true },
            { name: 'Winner', value: event.winner || 'No Winner', inline: false },
            {
                name: 'Participants',
                value: event.participants.map(p =>
                    `• ${p.name}: **${p.roll_type || 'None'}** - ${p.roll_value || 'N/A'}`
                ).join('\n')
            }
        )
        .setColor(event.rarity === 'rare' ? 'Blue' : 'Purple') // Example color based on rarity
        .setFooter({ text: 'NGP Event Summary' })
        .setTimestamp(new Date(event.expires_at * 1000)); // Convert expires_at to ms timestamp

    try {
        // Fetch the logging channel and send the embed
        const logChannel = await client.channels.fetch(logChannelId);
        await logChannel.send({ embeds: [embed] });

        console.log(`Posted summary for expired event ${event.event_id}`);
    } catch (error) {
        console.error(`Error posting event summary for expired event ${event.event_id}:`, error);
    }
}

/**
 * @function processExpiredEvent
 * @description Handles the expiration of a single event.
 * @param {Client} client - The Discord client object.
 * @param {object} event - The expired event object.
 * @param {Array} eventsData - The list of all events.
 */
async function processExpiredEvent(client, event, eventsData) {
    const participants = event.participants || [];
    if (participants.length === 0) {
        console.error(`No participants for expired event ${event.event_id}. Skipping winner determination.`);
        return; // Exit if no participants
    }

    const winner = determineWinner(client, event); // Pass event instead of participants
    if (winner) {
        finalizeEvent(event, winner, client);
        saveNGPEvents(eventsData);
        await announceWinner(client, event, winner);
        // Distribute points to eligible participants (passers who didn't bid)
        if (guildPointsSystemEnabled) {
            distributePointsIfNotDone(event, client);
            }
    } else {
        await handleNoWinner(client, event, eventsData);
        // Distribute points to eligible participants (passers who didn't bid)
        if (guildPointsSystemEnabled) {
            distributePointsIfNotDone(event, client);
            }
    }
}

/**
 * @function logWinner
 * @description Logs the winner's information into the winners.json file.
 * @param {string} userId - Discord ID of the winner.
 * @param {string} userName - Name of the winner.
 * @returns {void}
 */
function logWinner(userId, userName) {
    let winnersData = [];
    const now = Date.now();

    // Load existing winners data
    if (fs.existsSync(winnersPath)) {
        winnersData = JSON.parse(fs.readFileSync(winnersPath, 'utf-8'));
    }

    // Find the winner entry or create a new one
    let winner = winnersData.find(w => w.discord_id === userId);
    if (winner) {
        winner.last_won = now;
        winner.won_count += 1;
    } else {
        winner = {
            discord_id: userId,
            name: userName,
            last_won: now,
            won_count: 1,
        };
        winnersData.push(winner);
    }

    // Save updated winners data
    fs.writeFileSync(winnersPath, JSON.stringify(winnersData, null, 2));
}


/**
 * @function determineWinner
 * @description Determines the winner based on highest bid or roll type.
 * @param {Client} client - The Discord client object.
 * @param {object} event - The event object containing highest_bid and participants.
 * @returns {object|null} - The winning participant or null if no winner.
 */
function determineWinner(client, event) {
    const { highest_bid, participants = [] } = event;

    // Check for highest bid winner
    if (highest_bid && highest_bid.amount != null) {
        updateUserBalance(highest_bid.user_id, -highest_bid.amount);
        logTransaction(client, {
            from: highest_bid.user_id,
            to: config.client_id,
            amount: highest_bid.amount,
            reason: `Winning bid for item ${event.item}`,
            timestamp: Math.floor(Date.now() / 1000),
        });

        const winnerId = highest_bid.user_id;
        const winnerName = `<@${winnerId}>`;
        logWinner(winnerId, winnerName);

        return {
            name: `<@${highest_bid.user_id}>`,
            roll_type: 'Bid',
            roll_value: highest_bid.amount,
        };
    }

    // Fallback to roll types if no highest bid
    const needRolls = participants.filter(p => p.roll_type === 'Need');
    const greedRolls = participants.filter(p => p.roll_type === 'Greed');

    // Determine highest roll
    if (needRolls.length > 0) return needRolls.reduce((highest, p) => (p.roll_value > highest.roll_value ? p : highest));
    if (greedRolls.length > 0) return greedRolls.reduce((highest, p) => (p.roll_value > highest.roll_value ? p : highest));

    // No valid winner found
    return null;
}
/**
 * @function finalizeEvent
 * @description Marks the event as inactive and sets the winner.
 * @param {object} event - The event object.
 * @param {object} winner - The winning participant object.
 */
function finalizeEvent(event, winner, client) {
    event.winner = winner.name;
    event.active = false;

    // Distribute points to eligible participants (passers who didn't bid)
    if (guildPointsSystemEnabled) {
        distributePointsIfNotDone(event, client);
        }
}
/**
 * @function announceWinner
 * @description Announces the winner in the appropriate Discord channel or thread.
 * @param {Client} client - The Discord client object.
 * @param {object} event - The event object.
 * @param {object} winner - The winner participant object.
 */
async function announceWinner(client, event, winner) {
    try {
        const channel = client.channels.cache.get(event.channel_id);
        if (!channel) {
            console.error(`Channel with ID ${event.channel_id} not found.`);
            return; // Exit if the channel is undefined
        }

        const message = await channel.messages.fetch(event.message_id);

        // Find or create the thread
        const thread = await findOrCreateThread(message, event.item, event.event_id);

        // Prepare the announcement message
        let announcement = `🎉 Congratulations\n# ${winner.name}! \n\nYou have won the item:\n# **${event.item}**\n with a ${winner.roll_type} of ${winner.roll_value}.`;

        // If the winner's roll type was "Need", include reminder to check the user's build post
        if (winner.roll_type === 'Need') {
            // Fetch the forum channel and search for the user's post
            const forumChannelId = config.channels.ngpNeedValidationSubsystemForumID;
            const forumChannel = await client.channels.fetch(forumChannelId);

            // Fetch all threads, including archived ones
            const activeThreads = await forumChannel.threads.fetchActive();
            const archivedThreads = await forumChannel.threads.fetchArchived();

            // Combine active and archived threads
            const allThreads = [
                ...activeThreads.threads.values(),
                ...archivedThreads.threads.values(),
            ];

            // Find the thread that matches the winner's ID or name
            const winnerIdRaw = winner.name.replace(/[<@>]/g, ''); // Extract user ID
            const normalizedName = winner.name.toLowerCase();
            const matchingThread = allThreads.find(thread => 
                thread.name.includes(winnerIdRaw) || thread.name.toLowerCase().includes(normalizedName)
            );

            // If a matching thread is found, include a link to it
            if (matchingThread) {
                announcement += `\n\n<@&${distributorPing}>, please double-check the winner's build in their post: ${matchingThread.url}`;
            } else {
                announcement += `\n\n<@&${distributorPing}>, please double-check the winner's build. No forum post was found.`;
            }
        } else {
            // Default reminder to distribute the items
            announcement += `\n\n<@&${distributorPing}> please distribute the items.`;
        }

        // Send the announcement either in the thread or reply to the original message
        if (thread) {
            await thread.send({ content: announcement, allowedMentions: { parse: ["users", "roles"] } });
        } else {
            await message.reply({ content: announcement, allowedMentions: { parse: ["users", "roles"] } });
        }
    } catch (error) {
        console.error('Failed to declare winner:', error);
    }
}
/**
 * @function handleNoWinner
 * @description Manages expired events with no winner.
 * @param {Client} client - The Discord client object.
 * @param {object} event - The event object.
 * @param {Array} eventsData - The list of all events.
 */
async function handleNoWinner(client, event, eventsData) {
    event.active = false;
    saveNGPEvents(eventsData);

    if (event.is_open_ngp) {
        console.log(`Open NGP expired with no winner for item: ${event.item}.`);
        await notifyExpiration(client, event, `⚠️ Open NGP expired. Item **${event.item}** remains in the guild chest for future claim.`);
    } else {
        console.log(`Private NGP expired with no winner for item: ${event.item}.`);
        await createOpenNGPPost(client, event);
    }
}
/**
 * @function findOrCreateThread
 * @description Finds or creates a thread for the event announcement.
 * @param {object} message - The original event message.
 * @param {string} itemName - The name of the item for the NGP event.
 * @param {string} eventId - The unique identifier for the event.
 * @returns {Promise<ThreadChannel|null>} - The thread object or null if creation fails.
 */
async function findOrCreateThread(message, itemName, eventId) {
    try {
        // Define possible thread names
        const threadNames = [
            `Rolls for ${itemName} | id:${eventId}`,
            `Bid for ${itemName} | id:${eventId}`,
        ];

        // Attempt to find an existing thread
        const thread = message.channel.threads.cache.find(t => threadNames.includes(t.name));
        if (thread) {
            console.log(`Found existing thread for item: ${itemName}`);
            return thread;
        }

        // Create a new thread if none found
        return await message.startThread({
            name: threadNames[0], // Default to the "Rolls for" format if creating a new thread
            autoArchiveDuration: 60, // Auto-archive after 60 minutes of inactivity
            reason: `Thread for NGP event ${eventId}`,
        });
    } catch (error) {
        if (error.code === 'MessageExistingThread') {
            console.error(`Thread already exists for message ID: ${message.id}`);
        } else {
            console.error(`Failed to find or create thread:`, error);
        }
        return null;
    }
}


/**
 * @function notifyExpiration
 * @description Notifies in the message or thread that the event expired with no winner.
 * @param {Client} client - The Discord client object.
 * @param {object} event - The event object.
 * @param {string} content - The expiration message content.
 */
async function notifyExpiration(client, event, content) {
    try {
        const channel = client.channels.cache.get(event.channel_id);
        if (!channel) throw new Error(`Channel with ID ${event.channel_id} not found.`);

        const message = await channel.messages.fetch(event.message_id);
        const thread = await findOrCreateThread(message, event.item, event.event_id);

        if (thread) {
            await thread.send(content);
        } else {
            console.warn(`Thread creation failed or not found. Sending message to main channel.`);
            await message.reply(content);
        }
    } catch (error) {
        console.error('Failed to notify expiration:', error);
    }
}


/**
 * @function createOpenNGPPost
 * @description Creates a new Open NGP post with buttons for "Need," "Greed," "Pass," and "Help" in the specified Discord channel.
 * The "Need" button will not appear if the item's rarity is "rare."
 * @param {Client} client - The Discord client object.
 * @param {object} event - The expired event object.
 */
async function createOpenNGPPost(client, event) {
    if (!isValidClient(client)) {
        console.error('Invalid client passed to createOpenNGPPost.');
        return;
    }

    try {
        const channel = client.channels.cache.get(event.channel_id);
        if (!channel) {
            console.error(`Channel with ID ${event.channel_id} not found.`);
            return;
        }

        // Fetch the original message to extract the image
        let imageUrl = null;
        try {
            const originalMessage = await channel.messages.fetch(event.message_id);
            if (originalMessage.embeds.length > 0) {
                const embed = originalMessage.embeds[0];
                imageUrl = embed.image?.url || null; // Extract the image URL if available
            }
        } catch (error) {
            console.error(`Failed to fetch original message for event ${event.event_id}:`, error);
        }

        const eventId = Date.now().toString();
        const expirationTimestamp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

        // Create buttons
        const greedButton = new ButtonBuilder()
            .setCustomId(`ngp_greed_${eventId}`)
            .setLabel('Greed')
            .setStyle(ButtonStyle.Danger);

        const passButton = new ButtonBuilder()
            .setCustomId(`ngp_pass_${eventId}`)
            .setLabel('Pass')
            .setStyle(ButtonStyle.Primary);

        const helpButton = new ButtonBuilder()
            .setCustomId('ngp_help')
            .setLabel('Help')
            .setStyle(ButtonStyle.Secondary);

        // Initialize the row
        const row = new ActionRowBuilder();

        // Add the Need button only if the rarity is not "rare"
        if (event.rarity !== 'rare') {
            const needButton = new ButtonBuilder()
                .setCustomId(`ngp_need_${eventId}`)
                .setLabel('Need')
                .setStyle(ButtonStyle.Success);
            row.addComponents(needButton);
        }

        // Add the other buttons
        row.addComponents(greedButton, passButton, helpButton);

        // Embed with item details and expiration time
        const ngpEmbed = new EmbedBuilder()
            .setTitle(`[**${event.item}**]`)
            .setDescription(`**Expires**: <t:${expirationTimestamp}:R> (Ends <t:${expirationTimestamp}:T>)`)
            .setColor('Random');

        if (imageUrl) {
            ngpEmbed.setImage(imageUrl); // Include the image if available
        }

        const roleId = config.roles.openNGP;
        const sentMessage = await channel.send({
            content: `<@&${roleId}> An Open NGP has automatically been created for **${event.item}**!`,
            embeds: [ngpEmbed],
            allowedMentions: { roles: [roleId] },
            components: [row],
        });

        // Emit event with new Open NGP data
        eventEmitter.emit('createNGPEvent', {
            eventId,
            item: event.item,
            participants: [],
            expiresAt: expirationTimestamp,
            is_open_ngp: true,
            messageId: sentMessage.id,
            channelId: sentMessage.channel.id,
        });

        console.log(`Open NGP created for item: ${event.item}`);
    } catch (error) {
        console.error('Failed to create Open NGP:', error);
    }
}


function getAllActiveEvents() {
    const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
    return eventsData.filter(event => event.active);
}

/**
 * @function deleteNGPEvent
 * @description Deletes or deactivates an NGP event by marking it as inactive.
 * @param {object} interaction - The Discord interaction object.
 * @param {object} event - The NGP event object.
 */
async function deleteNGPEvent(interaction, event) {
    if (!event.active) {
        return await interaction.reply({
            content: `Event ${event.event_id} is already inactive.`,
            ephemeral: true,
        });
    }

    event.active = false;
    saveNGPEvents(getCurrentEvents().map(e => e.event_id === event.event_id ? event : e));

    await interaction.reply({
        content: `NGP event ${event.event_id} has been deleted.`,
        ephemeral: true,
    });
}

/**
 * @function addParticipant
 * @description Adds a participant to an NGP event.
 * @param {object} interaction - The Discord interaction object.
 * @param {object} event - The NGP event object.
 * @param {object} participant - The Discord user to add as a participant.
 */
async function addParticipant(interaction, event, participant) {
    const participantId = `<@${participant.id}>`;

    if (event.participants.some(p => p.name === participantId)) {
        return await interaction.reply({
            content: `${participant.username} is already a participant in event ${event.event_id}.`,
            ephemeral: true,
        });
    }

    event.participants.push({ name: participantId, roll_type: null, roll_value: null });
    saveNGPEvents(getCurrentEvents().map(e => e.event_id === event.event_id ? event : e));

    await interaction.reply({
        content: `${participant.username} has been added to event ${event.event_id}.`,
        ephemeral: true,
    });
}

/**
 * @function removeParticipant
 * @description Removes a participant from an NGP event.
 * @param {object} interaction - The Discord interaction object.
 * @param {object} event - The NGP event object.
 * @param {object} participant - The Discord user to remove as a participant.
 */
async function removeParticipant(interaction, event, participant) {
    const participantId = `<@${participant.id}>`;

    const index = event.participants.findIndex(p => p.name === participantId);
    if (index === -1) {
        return await interaction.reply({
            content: `${participant.username} is not a participant in event ${event.event_id}.`,
            ephemeral: true,
        });
    }

    event.participants.splice(index, 1);
    saveNGPEvents(getCurrentEvents().map(e => e.event_id === event.event_id ? event : e));

    await interaction.reply({
        content: `${participant.username} has been removed from event ${event.event_id}.`,
        ephemeral: true,
    });
}

// /**
//  * @function getCurrentEvents
//  * @description Fetches all NGP events from the JSON file.
//  * @returns {Array} - The list of current NGP events.
//  */
// function getCurrentEvents() {
//     return JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8')) || [];
// }


/**
 * @function applyAntiSnipe
 * @description Ensures that if the event's expiry time is below 1 minute, it extends the expiry time to exactly 1 minute.
 * @param {object} event - The event object to check and modify.
 * @returns {boolean} - Returns true if the expiry time was adjusted, false otherwise.
 */
function applyAntiSnipe(event) {
    const currentTime = Math.floor(Date.now() / 1000);
    const timeRemaining = event.expires_at - currentTime;

    if (timeRemaining < 60 && timeRemaining > 0) {
        console.log(`Applying anti-snipe for event ${event.event_id}. Extending expiry to 1 minute.`);
        event.expires_at = currentTime + 60;

        const threadName = `Bid for ${event.item} | id:${event.event_id}`;
        const thread = event.message_channel?.threads?.cache?.find(t => t.name === threadName);

        if (thread) {
            thread.send(
                `⏰ Anti-snipe activated! The bidding deadline has been extended.\n` +
                `⏳ New time remaining: <t:${event.expires_at}:R>`
            );
        }

        return true;
    }

    return false;
}


/**
 * @function checkForAntiSnipe
 * @description Iterates over active events and applies anti-snipe if needed.
 * @returns {void}
 */
function checkForAntiSnipe() {
    const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
    let eventsUpdated = false;

    eventsData.forEach(event => {
        if (event.active && applyAntiSnipe(event)) {
            eventsUpdated = true;
        }
    });

    if (eventsUpdated) {
        saveNGPEvents(eventsData);
        console.log('Anti-snipe adjustments applied.');
    }
}


module.exports = {
    getNGPEventById,
    // saveNGPEvents,
    checkAndDeclareWinner,
    handleNGPExpiration,
    deleteNGPEvent,
    addParticipant,
    removeParticipant,
    getAllActiveEvents,
    applyAntiSnipe,
    checkForAntiSnipe,
};
