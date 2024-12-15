/**
 * @file eventChecker.js
 * @description Utility to monitor and log the status of scheduled Discord events.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

const { Collection } = require('discord.js');

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
 * @function checkScheduledEvents
 * @description Fetches and logs all scheduled events in the first (and only) guild the bot is in.
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

        events.forEach(event => {
            const status = eventStatusMap[event.status] || 'Unknown';
            const description = event.description || 'No description provided.';
            
            // Get entity type name and value
            const entityTypeValue = event.entityType;
            const entityTypeName = entityTypeMap[entityTypeValue] || 'UNKNOWN';

            // Extract entity metadata for EXTERNAL events
            let location = 'N/A';
            if (entityTypeValue === 3 && event.entityMetadata?.location) {
                location = event.entityMetadata.location;
            }

            // Get start and end times
            const startTime = event.scheduledStartAt
                ? event.scheduledStartAt.toLocaleString()
                : 'Not specified';
            const endTime = event.scheduledEndAt
                ? event.scheduledEndAt.toLocaleString()
                : 'Not specified';

            console.log(`\nEvent Name: ${event.name}`);
            console.log(`Status: ${status}`);
            console.log(`Start Time: ${startTime}`);
            console.log(`End Time: ${endTime}`);
            console.log(`Entity Type: ${entityTypeName} (Value: ${entityTypeValue})`);
            console.log(`Description: ${description}`);
            if (entityTypeValue === 3) {
                console.log(`Location: ${location}`);
            }
            console.log(`Interested Users: ${event.userCount || 'Not available'}`);
        });
    } catch (error) {
        console.error('[EVENT CHECKER] Error fetching scheduled events:', error);
    }
}

module.exports = { checkScheduledEvents };
