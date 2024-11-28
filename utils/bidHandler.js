/**
 * @file Bid Handler
 * @description Handles messages in bidding threads and processes valid bids for NGP events.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0 
 */

/**********************************************************************/
// Required Modules and Utilities

// Required modules
const fs = require('fs');
const path = require('path');
const { getUserBalance } = require('./pointsHelper');
const { getNGPEventById, applyAntiSnipe } = require('./ngpHelpers');
const { saveNGPEvents } = require('./eventUtils');

// Paths to JSON data files
const ngpEventsPath = path.join(__dirname, '../data/ngpEvents.json');
const winnersPath = path.join(__dirname, '../data/winners.json');

/**********************************************************************/
// Helper Functions

/**
 * @function getLastResetTimestamp
 * @description Returns the timestamp of the last reset day (previous Thursday at midnight).
 * @returns {number} Timestamp of the last reset day.
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
 * @description Returns the timestamp of the next reset day (upcoming Thursday at midnight).
 * @returns {number} Timestamp of the next reset day.
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
// Bid Handling Function

/**
 * @function handleBidMessage
 * @description Handles messages sent in the bidding thread, treating numeric values as bids.
 * @param {object} message - The Discord message object.
 * @param {object} client - The Discord client object.
 */
async function handleBidMessage(message, client) {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Check if the message is coming from a thread
    if (!message.channel.isThread()) return;

    const bidAmount = parseInt(message.content.trim(), 10);
    if (isNaN(bidAmount) || bidAmount <= 0) return; // Ignore non-positive numbers

    const userId = message.author.id;

    // Get the NGP event by thread ID
    const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
    const eventId = message.channel.name.split('| id:')[1]?.trim();
    const event = getNGPEventById(eventId);

    if (!event || !event.is_bidding) {
        console.log('No event found in bidding mode for this thread.');
        return;
    }
    if (!event.active) {
        return await message.reply({
            content: 'Bids are no longer being accepted.',
            ephemeral: true,
        });
    }

    // Load winners data
    let winnersData = [];
    if (fs.existsSync(winnersPath)) {
        winnersData = JSON.parse(fs.readFileSync(winnersPath, 'utf-8'));
    }

    // Check if the user has won after the last reset day
    const lastResetTimestamp = getLastResetTimestamp();
    const nextResetTimestamp = getNextResetTimestamp();
    const winner = winnersData.find(w => w.discord_id === userId);

    if (winner && winner.last_won >= lastResetTimestamp) {
        return await message.reply({
            content: `You cannot bid on this item as you have already won since the last reset day (last reset: <t:${Math.floor(lastResetTimestamp / 1000)}:R>, next reset: <t:${Math.floor(nextResetTimestamp / 1000)}:R>).`,
            ephemeral: true,
        });
    }

    // Apply anti-snipe logic before processing the bid
    if (applyAntiSnipe(event)) {
        console.log(`Anti-snipe applied for event ${event.event_id}.`);
        saveNGPEvents(JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8')));
    }

    try {
        // Fetch the original message to verify we are in the correct thread
        const channel = await client.channels.fetch(event.channel_id);
        const originalMessage = await channel.messages.fetch(event.message_id);
        const thread = originalMessage.channel.threads.cache.get(message.channel.id);

        if (!thread || thread.id !== message.channel.id) {
            console.log('Thread does not match the bidding thread for the event.');
            return;
        }

        // Get the user's balance to ensure they have enough points to bid
        const userBalance = getUserBalance(userId);
        if (userBalance < bidAmount) {
            return message.reply({
                content: `You do not have enough points to place this bid of **${bidAmount}** points. Your current balance is **${userBalance}** points.`,
                ephemeral: true,
            });
        }

        // Ensure bids are tracked specifically per event
        if (!event.highest_bid || bidAmount > event.highest_bid.amount) {
            // Update the highest bid and bidder for this event
            event.highest_bid = {
                user_id: userId,
                amount: bidAmount,
            };

            // Update the participant's bid amount for this specific event
            let participant = event.participants.find(p => p.name === `<@${userId}>`);
            if (!participant) {
                return message.reply({
                    content: `You are not a part of this event!`,
                    ephemeral: true,
                });
            } else {
                participant.bid_amount = bidAmount;
            }

            // Save the updated events data to the JSON
            const eventIndex = eventsData.findIndex(e => e.event_id === eventId);
            if (eventIndex !== -1) {
                eventsData[eventIndex] = event;
                saveNGPEvents(eventsData);
            }

            // Notify the thread about the new highest bid
            await message.channel.send(
                `**<@${message.author.id}>** has placed the highest bid of **${bidAmount}** points!
` +
                `⏳ Auction expires: <t:${event.expires_at}:R>`
            );
        } else {
            // Inform the user that their bid was not high enough
            await message.reply({
                content: `Your bid of **${bidAmount}** points was not high enough. The current highest bid is **${event.highest_bid.amount}** points.
` +
                         `⏳ Auction expires: <t:${event.expires_at}:R>`,
                ephemeral: true,
            });
        }
    } catch (error) {
        console.error('Error fetching the original message or handling the bid:', error);
    }
}

/**********************************************************************/
// Module Export
module.exports = { handleBidMessage };
