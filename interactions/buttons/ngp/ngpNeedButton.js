/**
 * @file NGP Need Handler
 * @description Handles the 'Need' interaction for NGP events, ensuring proper validation and roll tracking.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules and Utilities

// Required modules
const fs = require('fs');
const path = require('path');
const { getNGPEventById, checkAndDeclareWinner } = require('../../../utils/ngpHelpers.js');
const { saveNGPEvents } = require('../../../utils/eventUtils');

// Paths to JSON data files
const ngpEventsPath = path.join(__dirname, '../../../data/ngpEvents.json');

// Configuration settings
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const forumValidationEnabled = config.systems.ngpNeedValidationSubsystem || false;

/**********************************************************************/
// Module Export

module.exports = {
    id: 'ngp_need',

    /**
     * @function execute
     * @description Executes the 'Need' interaction, handling all necessary validation and roll logic.
     * @param {object} interaction - The Discord interaction object.
     * @param {object} client - The Discord client object.
     */
    async execute(interaction, client) {
        try {
            // Defer the interaction to prevent timeout
            await interaction.deferReply({ ephemeral: true });

            const [, , eventId] = interaction.customId.split('_');

            // Fetch the event details by eventId
            const event = getNGPEventById(eventId);
            const userId = `<@${interaction.user.id}>`;
            const userIdRaw = interaction.user.id;
            const userNickname = interaction.member ? interaction.member.displayName : interaction.user.username;
            const forumChannelId = config.channels.ngpNeedValidationSubsystemForumID;

            // Check if the event has expired or is no longer active
            if (!event.active) {
                return await interaction.editReply({
                    content: 'This NGP event has already expired and is no longer active.',
                });
            }

            // Ensure that participants array exists
            if (!event.participants) {
                event.participants = [];
            }

            // Variable to store participant
            let participant;

            // Check if it's a private event and the user is not allowed to participate
            if (!event.is_open_ngp) {
                participant = event.participants.find(p => p.name === userId);

                // If the user is not a designated participant in a private event
                if (!participant) {
                    return await interaction.editReply({
                        content: 'You are not a participant in this private NGP event and cannot roll.',
                    });
                }
            } else {
                // For open events, find or add the participant
                participant = event.participants.find(p => p.name === userId);

                // If the participant isn't found, add them dynamically for open events
                if (!participant) {
                    participant = {
                        name: userId,
                        roll_type: null,
                        roll_value: null
                    };
                    event.participants.push(participant);
                }
            }

            // Check if the user has already rolled
            if (participant.roll_value !== null) {
                return await interaction.editReply({
                    content: 'You have already rolled for this NGP event!',
                });
            }

            // Ensure the event is not in bidding mode
            if (event.is_bidding) {
                return await interaction.reply({
                    content: "This event is currently being bid on!",
                    ephemeral: true,
                });
            }

            // Forum Post validation
            if (forumValidationEnabled) {
                const forumChannel = await interaction.client.channels.fetch(forumChannelId);

                // Fetch all threads, including archived ones
                const activeThreads = await forumChannel.threads.fetchActive();
                const archivedThreads = await forumChannel.threads.fetchArchived();

                // Combine active and archived threads
                const allThreads = [
                    ...activeThreads.threads.values(),
                    ...archivedThreads.threads.values(),
                ];

                // Split the user nickname into core parts for matching
                const coreNameParts = userNickname.split(/[^a-zA-Z0-9]+/).filter(Boolean).map(part => part.toLowerCase());

                // Check for any thread title that includes either the user ID or any part of the core name
                const hasMatchingPost = allThreads.some(thread => {
                    const normalizedTitle = thread.name.toLowerCase();

                    // Check if the user ID is in the thread name
                    const idMatch = thread.name.includes(userIdRaw);

                    // Check if any part of the core name parts appears within the thread title
                    const nameMatch = coreNameParts.some(part => normalizedTitle.includes(part));

                    return idMatch || nameMatch;
                });

                if (!hasMatchingPost) {
                    return await interaction.editReply({
                        content: 'You need a valid build post with your Discord ID or in-game name to use the Need button. Make one in <#1301552024818810942>.',
                    });
                }
            }

            // Add the participant's Need roll to the event
            const roll = Math.floor(Math.random() * 100) + 1;
            participant.roll_type = 'Need';
            participant.roll_value = roll;

            // Save the updated event
            const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
            const eventIndex = eventsData.findIndex(e => e.event_id === eventId);
            eventsData[eventIndex] = event;
            saveNGPEvents(eventsData);

            // Send roll result
            await interaction.editReply({
                content: `You rolled a Need roll of ${roll} for **${event.item}**.`,
            });

            // Fetch the original message using the stored messageId
            const messageId = event.message_id;
            const threadName = `Rolls for ${event.item} | id:${eventId}`;

            try {
                const message = await interaction.channel.messages.fetch(messageId);
                let thread = interaction.channel.threads.cache.find(t => t.name === threadName);

                // Create a thread if it doesn't exist
                if (!thread) {
                    thread = await message.startThread({
                        name: threadName,
                        autoArchiveDuration: 60,
                        reason: `Thread for NGP event ${eventId}`
                    });

                    // Remove participants other than bot from the thread
                    const botId = interaction.client.user.id; // Get the bot ID
                    await thread.members.fetch(); // Fetch current members in the thread
                    const participants = event.participants.map(p => p.name.replace(/[<@>]/g, '')); // Clean participant IDs

                    for (const member of thread.members.cache.values()) {
                        if (participants.includes(member.id) && member.id !== botId) {
                            await thread.members.remove(member.id); // Remove non-bot participants
                        }
                    }
                }

                await thread.send({
                    content: `${userId} has rolled.`,
                    allowedMentions: {
                        parse: [],
                    }
                });

                // Check and declare the winner after all rolls are completed
                await checkAndDeclareWinner(eventId, interaction, client);

            } catch (error) {
                console.error('Error fetching the message or creating thread:', error);
                await interaction.followUp({
                    content: 'Failed to create a thread on the original message. Please try again.',
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.error('Error executing NGP button:', error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({
                    content: 'An error occurred while processing your request. Please try again later.',
                });
            } else {
                await interaction.reply({
                    content: 'An error occurred while processing your request. Please try again later.',
                    ephemeral: true,
                });
            }
        }
    },
};
