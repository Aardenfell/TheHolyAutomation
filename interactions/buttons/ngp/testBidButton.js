/**
 * @file Bidding Interaction Handler
 * @description Handles the bidding initiation process for an NGP event interaction.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');
const { getUserBalance } = require('../../../utils/pointsHelper');

// Paths to JSON data files
const ngpEventsPath = path.join(__dirname, '../../../data/ngpEvents.json');
const winnersPath = path.join(__dirname, '../../../data/winners.json');

/**********************************************************************/
// Helper Functions - Last and Next Reset Timestamps

/**
 * @function getLastResetTimestamp
 * @description Get the timestamp for the last reset day (Thursday at midnight).
 * @returns {number} Timestamp for the last reset day.
 */
function getLastResetTimestamp() {
    const now = new Date();
    const resetDay = 4; // Thursday (0 = Sunday, 4 = Thursday)
    const resetHour = 0; // Midnight
    const resetMinute = 0;

    const daysSinceReset = (now.getDay() - resetDay + 7) % 7 || 7;
    const resetDate = new Date(now);
    resetDate.setDate(now.getDate() - daysSinceReset);
    resetDate.setHours(resetHour, resetMinute, 0, 0);

    return resetDate.getTime();
}

/**
 * @function getNextResetTimestamp
 * @description Get the timestamp for the next reset day (upcoming Thursday at midnight).
 * @returns {number} Timestamp for the next reset day.
 */
function getNextResetTimestamp() {
    const now = new Date();
    const resetDay = 4; // Thursday (0 = Sunday, 4 = Thursday)
    const resetHour = 0; // Midnight
    const resetMinute = 0;

    const daysUntilReset = (resetDay - now.getDay() + 7) % 7 || 7;
    const resetDate = new Date(now);
    resetDate.setDate(now.getDate() + daysUntilReset);
    resetDate.setHours(resetHour, resetMinute, 0, 0);

    return resetDate.getTime();
}

/**********************************************************************/
// Module Exports - Bidding Command Execution

module.exports = {
    id: 'test_bid',

    /**
     * @function execute
     * @description Execute function to handle the bidding interaction.
     * @param {object} interaction - The interaction object from Discord.
     * @param {object} client - The Discord client instance.
     */
    async execute(interaction, client) {
        const [, , eventId] = interaction.customId.split('_');
        const userId = interaction.user.id;
        const userName = interaction.user.tag;

        /**********************************************************************/
        // Load Winners Data to Check Eligibility

        let winnersData = [];
        if (fs.existsSync(winnersPath)) {
            winnersData = JSON.parse(fs.readFileSync(winnersPath, 'utf-8'));
        }

        // Check if the user has won after the last reset day
        const lastResetTimestamp = getLastResetTimestamp();
        const nextResetTimestamp = getNextResetTimestamp();
        const winner = winnersData.find(w => w.discord_id === userId);

        if (winner && winner.last_won >= lastResetTimestamp) {
            return await interaction.reply({
                content: `You cannot bid on this item as you have already won since the last reset day (last reset: <t:${Math.floor(lastResetTimestamp / 1000)}:R>, next reset: <t:${Math.floor(nextResetTimestamp / 1000)}:R>).`,
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Load NGP Event Data and Validate Event

        const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
        const eventIndex = eventsData.findIndex(event => event.event_id === eventId);

        if (eventIndex === -1) {
            return await interaction.reply({
                content: 'This NGP event could not be found.',
                ephemeral: true,
            });
        }

        const event = eventsData[eventIndex];

        // Check if the event is active
        if (!event.active) {
            return await interaction.reply({
                content: 'This NGP event has already expired and is no longer active.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Validate User Participation and Bidding Eligibility

        const participant = event.participants.find(p => p.name === `<@${userId}>`);
        if (!participant) {
            return await interaction.reply({
                content: 'You are not a participant in this event and cannot start the bidding process.',
                ephemeral: true,
            });
        }

        // Check if the bidding process has already started
        if (event.is_bidding) {
            return await interaction.reply({
                content: 'This event is already in a bidding process!',
                ephemeral: true,
            });
        }

        // Ensure the user has enough points to start the bid
        const userBalance = getUserBalance(userId);
        if (userBalance < 1) {
            return await interaction.reply({
                content: `You need at least 1 point to start the bidding process. Your current balance is **${userBalance}** points.`,
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Start Bidding Process

        // Mark the event as being in a bidding state
        event.is_bidding = true;

        // Set the initial bid for the user (1 point)
        event.highest_bid = {
            user_id: userId,
            amount: 1,
        };

        // Update the participant's data
        participant.roll_type = 'Bid';
        participant.roll_value = 1;
        participant.bid_amount = 1;

        // Save the updated event data to the JSON file
        eventsData[eventIndex] = event;
        fs.writeFileSync(ngpEventsPath, JSON.stringify(eventsData, null, 2));

        /**********************************************************************/
        // Create Bidding Thread and Notify Participants

        const messageId = event.message_id;
        const threadName = `Bid for ${event.item} | id:${eventId}`;
        let thread;

        try {
            const message = await interaction.channel.messages.fetch(messageId);

            // Check if a thread for this event already exists
            thread = message.hasThread
                ? message.thread
                : await message.startThread({
                    name: threadName,
                    autoArchiveDuration: 60,
                    reason: `Bidding thread for NGP event ${eventId}`,
                });

            // Notify the thread about the bidding start
            const participantMentions = event.participants.map(p => p.name).join(', ');
            await thread.send({
                content: `${participantMentions}
                <@${userId}> has started a bidding war for **${event.item}** with an initial bid of **1 point**! Use this thread to place your bids or click PASS.`,
                allowedMentions: {
                    users: event.participants.map(p => p.name.replace(/[<@>]/g, '')), // Extract user IDs from mentions
                },
            });

            // Inform the user about the successful bidding process start
            await interaction.reply({
                content: `You have successfully started a bidding war for **${event.item}** with an initial bid of 1 point.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error fetching the message or creating thread:', error);

            // If thread creation fails, revert the bidding state
            event.is_bidding = false;
            delete event.highest_bid;
            fs.writeFileSync(ngpEventsPath, JSON.stringify(eventsData, null, 2));

            await interaction.reply({
                content: 'Failed to create or use the bidding thread. Please try again.',
                ephemeral: true,
            });
        }
    },
};
