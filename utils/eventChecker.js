/**
 * @file eventChecker.js
 * @description Utility to monitor and save the status of scheduled Discord events to a JSON file.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

const { Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to save the JSON data
const eventDataPath = path.join(__dirname, '../data/scheduledEvents.json');

// Map event statuses to human-readable names
const eventStatusMap = {
    1: 'SCHEDULED',
    2: 'ACTIVE',
    3: 'COMPLETED',
    4: 'CANCELED',
};

// Map entity types to human-readable names
const entityTypeMap = {
    1: 'STAGE_INSTANCE',
    2: 'VOICE',
    3: 'EXTERNAL',
};

/**
 * @function saveEventData
 * @description Writes event data to a JSON file.
 * @param {Array} eventData - Array of event objects to save.
 */
function saveEventData(eventData) {
    const sanitizedData = JSON.stringify(eventData, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value // Convert BigInt to string
    , 2);

    fs.writeFileSync(eventDataPath, sanitizedData, 'utf-8');
    console.log(`[EVENT CHECKER] Saved event data to ${eventDataPath}`);
}

/**
 * @function checkScheduledEvents
 * @description Fetches all scheduled events in the first (and only) guild the bot is in and saves to JSON.
 * @param {Client} client - The Discord client object.
 */
async function checkScheduledEvents(client) {
    try {
        // Fetch the first guild the bot is in
        const guild = client.guilds.cache.first();
        if (!guild) {
            console.error('[EVENT CHECKER] Guild not found. Ensure the bot is in a Discord server.');
            return;
        }

        // Fetch scheduled events for the guild
        const events = await guild.scheduledEvents.fetch();

        console.log(`[EVENT CHECKER] Found ${events.size} scheduled event(s) in guild: ${guild.name}`);

        const eventData = [];

        // Process each event
        for (const event of events.values()) {
            const status = eventStatusMap[event.status] || 'Unknown';
            const entityTypeName = entityTypeMap[event.entityType] || 'UNKNOWN';
            const location = event.entityMetadata?.location || 'N/A';

            // Fetch interested users
            const subscribers = await event.fetchSubscribers({ limit: 100 });
            const interestedUsers = subscribers.map(subscriber => `<@${subscriber.user.id}>`);

            // Build the event data object
            const eventObject = {
                id: event.id.toString(),
                guildId: event.guildId.toString(),
                name: event.name,
                description: event.description || 'No description provided.',
                status,
                channelId: event.channelId ? event.channelId.toString() : 'N/A',
                entityType: {
                    name: entityTypeName,
                    value: event.entityType,
                },
                location: event.entityType === 3 ? location : 'N/A',
                privacyLevel: event.privacyLevel,
                creatorId: event.creatorId ? event.creatorId.toString() : 'N/A',
                scheduledStartTimestamp: event.scheduledStartTimestamp || null,
                scheduledEndTimestamp: event.scheduledEndTimestamp || null,
                url: event.url,
                interestedUsers: {
                    count: event.userCount || 0,
                    users: interestedUsers,
                },
            };

            // Push the event object into the array
            eventData.push(eventObject);
        }

        // Save the processed event data to JSON
        saveEventData(eventData);
    } catch (error) {
        console.error('[EVENT CHECKER] Error fetching scheduled events:', error);
    }
}

module.exports = { checkScheduledEvents };
