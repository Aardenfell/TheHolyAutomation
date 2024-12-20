/**
 * @file eventScheduler.js
 * @description Background process to manage custom frequency events from `tobescheduled.json`.
 * @author Aardenfell
 * @since 2.7.0
 * @version 2.7.0
 */

const fs = require('fs');
const path = require('path');
const { checkScheduledEvents } = require('./eventChecker');

// Path to the toBeScheduled and scheduledEvents JSON files
const toBeScheduledPath = path.join(__dirname, '../data/tobescheduled.json');
const scheduledEventsPath = path.join(__dirname, '../data/scheduledEvents.json');

/**
 * @function loadJson
 * @description Generic function to load a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @returns {Array|Object} Parsed JSON data or empty array/object if file doesn't exist.
 */
function loadJson(filePath) {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * @function saveJson
 * @description Generic function to save data to a JSON file.
 * @param {string} filePath - Path to the JSON file.
 * @param {Array|Object} data - Data to save.
 */
function saveJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * @function calculateNextTime
 * @description Calculates the next scheduled time based on the frequency.
 * @param {Date} current - The current scheduled time.
 * @param {string} frequency - The frequency of the event (e.g., `daily`, `weekly`).
 * @returns {Date} The next scheduled time.
 */
function calculateNextTime(current, frequency) {
    const nextTime = new Date(current);
    if (frequency === 'daily') {
        nextTime.setHours(nextTime.getHours() + 24);
    } else if (frequency === 'weekly') {
        nextTime.setDate(nextTime.getDate() + 7);
    }
    return nextTime;
}

/**
 * @function initializeScheduledEvents
 * @description Ensures the scheduled events cache is up-to-date when the bot starts.
 * @param {object} client - The Discord client object.
 */
async function initializeScheduledEvents(client) {
    console.log('[SCHEDULER] Initializing scheduled events cache...');
    await checkScheduledEvents(client); // Updates `scheduledEvents.json`
    console.log('[SCHEDULER] Scheduled events cache updated.');
}

/**
 * @function saveRescheduledEvent
 * @description Saves rescheduled event data in the same format as `eventChecker.js`.
 * @param {object} event - The event data to save.
 */
function saveRescheduledEvent(event) {
    const scheduledEvents = loadJson(scheduledEventsPath);

    const eventObject = {
        id: event.id || Date.now().toString(), // Fallback ID
        guildId: event.guildId || 'Unknown',
        name: event.name,
        description: event.description || 'No description provided.',
        status: 'SCHEDULED',
        channelId: event.channelId || 'N/A',
        entityType: {
            name: event.location === 'N/A' ? 'VOICE' : 'EXTERNAL',
            value: event.location === 'N/A' ? 2 : 3,
        },
        location: event.location,
        privacyLevel: 2,
        scheduledStartTimestamp: event.scheduledTime,
        scheduledEndTimestamp: event.scheduledEndTime,
    };

    // Update or add the rescheduled event
    const existingIndex = scheduledEvents.findIndex(
        (e) => e.name === event.name && e.scheduledStartTimestamp === eventObject.scheduledStartTimestamp
    );

    if (existingIndex !== -1) {
        scheduledEvents[existingIndex] = eventObject;
    } else {
        scheduledEvents.push(eventObject);
    }

    saveJson(scheduledEventsPath, scheduledEvents);
}

/**
 * @function processToBeScheduled
 * @description Background process to check and schedule events.
 * @param {object} client - The Discord client object.
 */
async function processToBeScheduled(client) {
    try {
        const toBeScheduled = loadJson(toBeScheduledPath);
        const scheduledEvents = loadJson(scheduledEventsPath); // Use local cache
        const now = new Date();
        const updatedToBeScheduled = [];

        for (const event of toBeScheduled) {
            const scheduledTime = new Date(event.scheduledTime);
            const durationMs = event.duration * 60 * 1000; // Convert minutes to milliseconds
            const eventEndTime = new Date(scheduledTime.getTime() + durationMs);

            // Skip if event has already been rescheduled to the next occurrence
            const nextScheduledTime = calculateNextTime(scheduledTime, event.frequency);
            const isNextScheduled = scheduledEvents.some(
                (scheduledEvent) =>
                    scheduledEvent.name === event.name &&
                    new Date(scheduledEvent.scheduledStartTimestamp).getTime() === nextScheduledTime.getTime()
            );

            if (now > eventEndTime && !isNextScheduled) {
                console.log(`[SCHEDULER] Rescheduling event: ${event.name}`);

                // Calculate the new scheduled time
                const newScheduledTime = calculateNextTime(scheduledTime, event.frequency);
                const newScheduledEndTime = new Date(
                    newScheduledTime.getTime() + event.duration * 60 * 1000
                );

                const guild = client.guilds.cache.first();
                if (guild) {
                    await guild.scheduledEvents.create({
                        name: event.name,
                        scheduledStartTime: newScheduledTime,
                        scheduledEndTime: newScheduledEndTime,
                        privacyLevel: 2, // Guild-only
                        entityType: event.location === 'N/A' ? 2 : 3, // Voice or External
                        entityMetadata: event.location === 'N/A' ? undefined : { location: event.location },
                        description: event.description,
                    });

                    console.log(
                        `[SCHEDULER] Scheduled event "${event.name}" for ${newScheduledTime.toLocaleString()} with end time ${newScheduledEndTime.toLocaleString()}..`
                    );

                    // Add the rescheduled event to the scheduled events cache
                    saveRescheduledEvent({
                        id: event.id,
                        name: event.name,
                        description: event.description,
                        scheduledStartTimestamp: newScheduledTime.toISOString(),
                        scheduledEndTimestamp: newScheduledEndTime.toISOString(),
                        duration: event.duration,
                        frequency: event.frequency,
                        location: event.location,
                        createdBy: event.createdBy,
                    });
                }

                // Update the event's scheduled time in `toBeScheduled`
                event.scheduledTime = newScheduledTime.toISOString();
            } 
            // else {
            //     console.log(
            //         `[SCHEDULER] Event "${event.name}" is already scheduled for ${nextScheduledTime.toLocaleString()}. Skipping.`
            //     );
            // }

            updatedToBeScheduled.push(event);
        }

        // Save updated events back to the `toBeScheduled.json`
        saveJson(toBeScheduledPath, updatedToBeScheduled);
    } catch (error) {
        console.error('[SCHEDULER] Error processing to-be-scheduled events:', error);
    }
}


module.exports = { processToBeScheduled, initializeScheduledEvents };

