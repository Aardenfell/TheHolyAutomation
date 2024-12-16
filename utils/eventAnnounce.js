/**
 * @file eventAnnounce.js
 * @description Background process to announce scheduled events 5 minutes before their start time.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

const fs = require('fs');
const path = require('path');

// Path to the scheduled events JSON file
const scheduledEventsPath = path.join(__dirname, '../data/scheduledEvents.json');

/**
 * @function loadScheduledEvents
 * @description Loads the `scheduledEvents.json` file and parses its contents.
 * @returns {Array} Parsed event data from the JSON file.
 */
function loadScheduledEvents() {
    if (!fs.existsSync(scheduledEventsPath)) return [];
    return JSON.parse(fs.readFileSync(scheduledEventsPath, 'utf-8'));
}

/**
 * @function processAnnouncements
 * @description Processes and announces events 5 minutes before their start time.
 * @param {object} client - The Discord client object.
 */
async function processAnnouncements(client) {
    try {
        const events = loadScheduledEvents();
        const now = Date.now();

        for (const event of events) {
            const timeUntilStart = event.scheduledStartTimestamp - now;

            // Check if the event is scheduled to start in 5 minutes
            if (timeUntilStart > 0 && timeUntilStart <= 5 * 60 * 1000) {
                const guild = client.guilds.cache.get(event.guildId);
                if (!guild) {
                    console.error(`[EVENT ANNOUNCE] Guild not found for event "${event.name}".`);
                    continue;
                }

                const channelId = "1293412297968193616";
                const announcementChannel = channelId
                    ? guild.channels.cache.get(channelId)
                    : guild.systemChannel;

                if (!announcementChannel || !announcementChannel.isTextBased()) {
                    console.error(`[EVENT ANNOUNCE] Announcement channel not found or invalid for event "${event.name}".`);
                    continue;
                }

                // Extract roles to ping from the description
                const rolePings = event.description.match(/<@&\d+>/g) || [];
                const pingMessage = rolePings.length > 0 ? rolePings.join(' ') : '';

                // Send the announcement message
                const messageContent = `${pingMessage ? `${pingMessage}\n` : ''}The event "${event.name}" is starting soon!\n${event.url}`;
                await announcementChannel.send(messageContent);

                console.log(`[EVENT ANNOUNCE] Announced event "${event.name}" in channel "${announcementChannel.name}".`);
            }
        }
    } catch (error) {
        console.error('[EVENT ANNOUNCE] Error processing event announcements:', error);
    }
}

module.exports = { processAnnouncements };
