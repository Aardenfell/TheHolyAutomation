/**
 * @file eventAnnounce.js
 * @description Background process to announce scheduled events 5 minutes before their start time.
 * @author Aardenfell
 * @since 2.7.0
 * @version 2.7.0
 */

const fs = require('fs');
const path = require('path');

// Paths to the JSON files
const scheduledEventsPath = path.join(__dirname, '../data/scheduledEvents.json');
const announcedEventsPath = path.join(__dirname, '../data/announcedEvents.json');

// Load JSON file helper
function loadJson(filePath) {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// Save JSON file helper
function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Load announced events
function loadAnnouncedEvents() {
    return loadJson(announcedEventsPath);
}

// Save announced events
function saveAnnouncedEvents(data) {
    saveJson(announcedEventsPath, data);
}

/**
 * @function processAnnouncements
 * @description Processes and announces events 5 minutes before their start time.
 * @param {object} client - The Discord client object.
 */
async function processAnnouncements(client) {
    const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));

    try {
        const events = loadJson(scheduledEventsPath);
        const announcedEvents = loadAnnouncedEvents();
        const now = Date.now();

        for (const event of events) {
            const timeUntilStart = event.scheduledStartTimestamp - now;

            // Skip if already announced
            if (announcedEvents.some((e) => e.id === event.id && e.announced)) continue;

            // Check if the event is scheduled to start in 5 minutes
            if (timeUntilStart > 0 && timeUntilStart <= 5 * 60 * 1000) {
                const guild = client.guilds.cache.get(event.guildId);
                if (!guild) {
                    console.error(`[EVENT ANNOUNCE] Guild not found for event "${event.name}".`);
                    continue;
                }

                // Fetch the announcement thread using config
                const threadId = config.channels.eventAnnounce; // Config field for thread ID
                const thread = guild.channels.cache.get(threadId);

                if (!thread || !thread.isTextBased()) {
                    console.error(`[EVENT ANNOUNCE] Announcement thread not found or invalid for event "${event.name}".`);
                    continue;
                }

                // Extract roles to ping from the description
                const rolePings = event.description.match(/<@&\d+>/g) || [];
                const pingMessage = rolePings.length > 0 ? rolePings.join(' ') : '';

                // Send the announcement message
                const messageContent = `${pingMessage ? `${pingMessage}\n` : ''}The event "[${event.name}](${event.url})" is starting soon!`;
                await thread.send(messageContent);

                console.log(`[EVENT ANNOUNCE] Announced event "${event.name}" in thread "${thread.name}".`);

                // Mark the event as announced
                announcedEvents.push({ id: event.id, announced: true });
            }
        }

        // Save updated announced events
        saveAnnouncedEvents(announcedEvents);
    } catch (error) {
        console.error('[EVENT ANNOUNCE] Error processing event announcements:', error);
    }
}

/**
 * @function cleanupAnnouncements
 * @description Removes entries from `announcedEvents.json` that are no longer in `scheduledEvents.json`.
 */
function cleanupAnnouncements() {
    const events = loadJson(scheduledEventsPath);
    const announcedEvents = loadAnnouncedEvents();

    const validIds = new Set(events.map((event) => event.id));
    const cleanedAnnouncements = announcedEvents.filter((e) => validIds.has(e.id));

    if (cleanedAnnouncements.length !== announcedEvents.length) {
        console.log('[EVENT ANNOUNCE] Cleanup performed on announced events.');
        saveAnnouncedEvents(cleanedAnnouncements);
    }
}

module.exports = { processAnnouncements, cleanupAnnouncements };
