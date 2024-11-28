/**
 * @file ngp_pass_interaction.js
 * @description Handles the NGP pass interaction for events, allowing participants to pass on rolling for an item.
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

/**********************************************************************/
// Module Export: ngp_pass Interaction Handler

module.exports = {
    id: 'ngp_pass',

    /**
     * @description Execute function to handle the interaction for passing on an NGP event.
     * @param {Object} interaction - The interaction object from Discord.
     * @param {Object} client - The Discord client instance.
     */
    async execute(interaction, client) {
        const [, , eventId] = interaction.customId.split('_');

        // Fetch the event details by eventId
        const event = getNGPEventById(eventId);
        const userId = `<@${interaction.user.id}>`;

        /**********************************************************************/
        // Event Expiry and Participant Check

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

        let participant;

        // Check if it's a private event and the user is not allowed to participate
        if (!event.is_open_ngp) {
            participant = event.participants.find(p => p.name === userId);

            if (!participant) {
                return await interaction.reply({
                    content: 'You are not a participant in this private NGP event and cannot roll.',
                    ephemeral: true,
                });
            }
        } else {
            // For open events, find or add the participant
            participant = event.participants.find(p => p.name === userId);

            if (!participant) {
                participant = {
                    name: userId,
                    roll_type: null,
                    roll_value: null
                };
                event.participants.push(participant);
            }
        }

        /**********************************************************************/
        // Check if User Has Already Rolled

        if (participant.roll_value !== null) {
            return await interaction.reply({
                content: 'You have already rolled for this NGP event!',
                ephemeral: true,
            });
        }

        // Mark the participant as having passed
        participant.roll_type = 'Pass';
        participant.roll_value = 'Pass';

        /**********************************************************************/
        // Save Updated Event Data

        const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
        const eventIndex = eventsData.findIndex(e => e.event_id === eventId);
        eventsData[eventIndex] = event;
        saveNGPEvents(eventsData);

        // Send an ephemeral message to the user in the main channel
        await interaction.reply({
            content: `You have chosen to pass on **${event.item}**`,
            ephemeral: true
        });

        /**********************************************************************/
        // Handle Event Message Thread

        const messageId = event.message_id;
        let thread;

        try {
            const message = await interaction.channel.messages.fetch(messageId);

            // Safely fetch the thread or handle the error if it's already created
            thread = message.hasThread ? await message.thread.fetch() : null;

            if (!thread) {
                try {
                    thread = await message.startThread({
                        name: `Rolls for ${event.item} | id:${eventId}`,
                        autoArchiveDuration: 60,
                        reason: `Thread for NGP event ${eventId}`,
                    });

                    // Remove participants other than bot from the thread
                    const botId = interaction.client.user.id;
                    await thread.members.fetch();
                    const participants = event.participants.map(p => p.name.replace(/[<@>]/g, ''));

                    for (const member of thread.members.cache.values()) {
                        if (participants.includes(member.id) && member.id !== botId) {
                            await thread.members.remove(member.id);
                        }
                    }
                } catch (threadError) {
                    if (threadError.code === 160004) {
                        console.warn('Thread already exists for this message.');
                        thread = message.thread || await message.fetchThread();
                    } else {
                        throw threadError;
                    }
                }
            }

            // Notify in the thread that the user has passed
            if (thread) {
                await thread.send({
                    content: `${userId} has rolled.`,
                    allowedMentions: { parse: [] },
                });

                // Remove the user from the thread if bidding is active
                if (event.is_bidding) {
                    try {
                        await thread.members.remove(interaction.user.id);
                        console.log(`Removed user ${interaction.user.id} from thread due to active bidding.`);
                    } catch (err) {
                        console.error(`Failed to remove user ${interaction.user.id} from thread:`, err);
                    }
                }
            }

            // Check and declare the winner after all participants have acted
            await checkAndDeclareWinner(eventId, interaction, client);

        } catch (error) {
            console.error('Error fetching the message or creating thread:', error);
            return await interaction.followUp({
                content: 'Failed to create or update the thread. Please try again.',
                ephemeral: true,
            });
        }
    },
};
