/**
 * @file NGP Greed Handler
 * @description Handles the "Greed" interaction for NGP events, allowing participants to roll greed on items.
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

// Path to JSON data files
const ngpEventsPath = path.join(__dirname, '../../../data/ngpEvents.json');

/**********************************************************************/
// Module Export

module.exports = {
    id: 'ngp_greed',

    /**
     * @function execute
     * @description Executes the greed roll interaction for the NGP event.
     * @param {object} interaction - The Discord interaction object.
     * @param {object} client - The Discord client object.
     */
    async execute(interaction, client) {
        const [, , eventId] = interaction.customId.split('_');

        // Fetch the event details by eventId
        const event = getNGPEventById(eventId);
        const userId = `<@${interaction.user.id}>`;

        // Check if the event has expired or is no longer active
        if (!event.active) {
            return await interaction.reply({
                content: 'This NGP event has already expired and is no longer active.',
                ephemeral: true,
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
                return await interaction.reply({
                    content: 'You are not a participant in this private NGP event and cannot roll.',
                    ephemeral: true,
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
            return await interaction.reply({
                content: 'You have already rolled for this NGP event!',
                ephemeral: true,
            });
        }

        // Check if the event is currently in bidding mode
        if (event.is_bidding === true) {
            return await interaction.reply({
                content: 'This event is currently being bid on!',
                ephemeral: true,
            });
        }

        // Add the participant's Greed roll to the event
        const roll = Math.floor(Math.random() * 100) + 1;
        participant.roll_type = 'Greed';
        participant.roll_value = roll;

        // Save the updated event
        const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
        const eventIndex = eventsData.findIndex(e => e.event_id === eventId);
        eventsData[eventIndex] = event;
        saveNGPEvents(eventsData);

        // Send an ephemeral message to the user in the main channel with their roll
        await interaction.reply({
            content: `You rolled a Greed roll of ${roll} for **${event.item}**.`,
            ephemeral: true
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

                console.log(`Thread created: ${threadName}`);

                // Remove participants other than bot from the thread
                const botId = interaction.client.user.id; // Get the bot ID
                await thread.members.fetch(); // Fetch current members in the thread
                const participants = event.participants.map(p => p.name.replace(/[<@>]/g, '')); // Clean participant IDs

                for (const member of thread.members.cache.values()) {
                    if (participants.includes(member.id) && member.id !== botId) {
                        await thread.members.remove(member.id); // Remove non-bot participants
                    }
                }
            } else {
                console.log(`Thread "${threadName}" already exists. Skipping creation and participant removal.`);
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
            return await interaction.followUp({
                content: 'Failed to create a thread on the original message. Please try again.',
                ephemeral: true,
            });
        }
    },
};
