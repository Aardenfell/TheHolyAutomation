/**
 * @file ngpPassButton.js
 * @description Handles the NGP pass interaction for events, allowing participants to pass on rolling for an item.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.6.2
 */

/**********************************************************************/
// Required Modules and Utilities

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
        const userId = `<@${interaction.user.id}>`;

        /**********************************************************************/
        // Fetch Event Details

        const event = getNGPEventById(eventId);

        if (!event) {
            console.error(`[ ERROR ] Event with ID ${eventId} not found.`);
            return await interaction.reply({
                content: 'This NGP event no longer exists or has been removed.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Event Validation and Participant Check

        if (!event.active) {
            return await interaction.reply({
                content: 'This NGP event has already expired and is no longer active.',
                ephemeral: true,
            });
        }

        if (!event.participants) event.participants = [];

        let participant;

        // Check for private event participation
        if (!event.is_open_ngp) {
            participant = event.participants.find(p => p.name === userId);
            if (!participant) {
                return await interaction.reply({
                    content: 'You are not a participant in this private NGP event and cannot roll.',
                    ephemeral: true,
                });
            }
        } else {
            participant = event.participants.find(p => p.name === userId);

            if (!participant) {
                participant = { name: userId, roll_type: null, roll_value: null };
                event.participants.push(participant);
            }
        }

        /**********************************************************************/
        // Prevent Duplicate Rolls

        if (participant.roll_value !== null) {
            return await interaction.reply({
                content: 'You have already rolled for this NGP event!',
                ephemeral: true,
            });
        }

        participant.roll_type = 'Pass';
        participant.roll_value = 'Pass';

        /**********************************************************************/
        // Save Updated Event Data

        const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
        const eventIndex = eventsData.findIndex(e => e.event_id === eventId);
        eventsData[eventIndex] = event;
        saveNGPEvents(eventsData);

        console.log(`[ NGP_PASS ] User ${interaction.user.id} passed on event ID ${eventId}.`);

        await interaction.reply({
            content: `You have chosen to pass on **${event.item}**`,
            ephemeral: true,
        });

        /**********************************************************************/
        // Thread Handling

        const messageId = event.message_id;
        let thread;

        try {
            const message = await interaction.channel.messages.fetch(messageId);

            // Fetch or create thread
            thread = message.hasThread ? await message.thread.fetch() : null;

            if (!thread) {
                try {
                    thread = await message.startThread({
                        name: `Rolls for ${event.item} | id:${eventId}`,
                        autoArchiveDuration: 60,
                        reason: `Thread for NGP event ${eventId}`,
                    });
                    console.log(`[ THREAD ] Created thread for event ID ${eventId}.`);
                } catch (threadError) {
                    if (threadError.code === 160004) {
                        console.warn(`[ WARN ] Thread already exists for event ID ${eventId}.`);
                        thread = message.thread || await message.fetchThread();
                    } else {
                        throw threadError;
                    }
                }
            }

            // Notify the thread about the pass
            await thread.send({
                content: `${userId} has rolled.`,
                allowedMentions: { parse: [] },
            });

            // Remove user from the thread if bidding is active
            if (event.is_bidding) {
                try {
                    await thread.members.remove(interaction.user.id);
                    console.log(`[ BIDDING ] Removed user ${interaction.user.id} from thread due to active bidding.`);
                } catch (err) {
                    console.error(`[ ERROR ] Failed to remove user ${interaction.user.id} from thread:`, err);
                }
            }

            // Check and declare the winner after all participants have acted
            await checkAndDeclareWinner(eventId, interaction, client);
        } catch (error) {
            console.error(`[ ERROR ] Failed to handle thread for event ID ${eventId}:`, error);
            return await interaction.followUp({
                content: 'Failed to create or update the thread. Please try again.',
                ephemeral: true,
            });
        }
    },
};
