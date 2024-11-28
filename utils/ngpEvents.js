/**
 * @file ngpEvents.js
 * @description Handles the creation and storage of NGP events in a JSON file.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

// Import necessary modules
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const eventEmitter = new EventEmitter();

// Define path to the NGP events JSON data file
const ngpEventsPath = path.join(__dirname, '../data/ngpEvents.json');

/**********************************************************************/
// Event handler for creating NGP events

/**
 * @event createNGPEvent
 * @description Creates a new NGP event and saves it to ngpEvents.json.
 * @param {Object} data - Data required for creating the NGP event.
 * @param {string} data.eventId - Unique identifier for the event.
 * @param {string} data.item - Item associated with the event.
 * @param {string} data.rarity - Rarity of the item.
 * @param {Array} data.participants - Participants of the event.
 * @param {number} data.expiresAt - Expiration timestamp for the event.
 * @param {boolean} data.is_open_ngp - Flag indicating if the event is open NGP.
 * @param {string} [data.messageId] - ID of the associated message.
 * @param {string} [data.channelId] - ID of the channel where the event is posted.
 * @param {boolean} data.debug - Debug mode flag.
 * @param {boolean} [data.isGuildRaid=false] - Flag indicating if the event is part of a guild raid.
 */
eventEmitter.on('createNGPEvent', (data) => {
    const { eventId, item, rarity, participants, expiresAt, is_open_ngp, messageId, channelId, debug, isGuildRaid = false } = data;

    // Check if the file exists and contains valid JSON
    let eventsData = [];
    if (fs.existsSync(ngpEventsPath)) {
        try {
            const fileData = fs.readFileSync(ngpEventsPath, 'utf-8');
            eventsData = JSON.parse(fileData) || [];
        } catch (error) {
            console.error('Error parsing ngpEvents.json:', error);
            eventsData = [];
        }
    }

    if (!Array.isArray(eventsData)) {
        eventsData = [];
    }

    // Add new event to the array
    eventsData.push({
        event_id: eventId,
        item: item,
        rarity: rarity,
        participants: participants,  // Already formatted in privatengp.js
        created_at: Math.floor(Date.now() / 1000),
        expires_at: expiresAt,
        winner: null,
        active: true,
        is_open_ngp: !!is_open_ngp,
        message_id: messageId || null,
        channel_id: channelId || null, // Store the channel ID
        is_bidding: false,
        highest_bid: null,
        debug: !!debug,
        isGuildRaid: isGuildRaid,
    });

    // Save updated events back to the JSON file
    try {
        fs.writeFileSync(ngpEventsPath, JSON.stringify(eventsData, null, 2));
        console.log('NGP event created and saved to JSON:', eventsData[eventsData.length - 1]);
    } catch (error) {
        console.error('Error saving ngpEvents.json:', error);
    }
});

/**********************************************************************/
// Export event emitter for external usage
module.exports = eventEmitter;