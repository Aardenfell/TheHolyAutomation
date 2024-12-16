/**
 * @file eventScheduler.js
 * @description Background process to manage custom frequency events from `tobescheduled.json`.
 * @author Aardenfell
 * @since inDev
 * @version inDev
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

        for (const event of toBeScheduled) {
            const scheduledTime = new Date(event.scheduledTime);
            const durationMs = event.duration * 60 * 1000; // Convert minutes to milliseconds
            const eventEndTime = new Date(scheduledTime.getTime() + durationMs);

            // If the current time has passed the event's end time, reschedule it
            if (now > eventEndTime) {
                console.log(`[SCHEDULER] Rescheduling event: ${event.name}`);

                // Calculate the new scheduled time
                const newScheduledTime = calculateNextTime(scheduledTime, event.frequency);

                // Check if the event is already scheduled for the new time
                const isAlreadyScheduled = scheduledEvents.some(
                    (scheduledEvent) =>
                        scheduledEvent.name === event.name &&
                        new Date(scheduledEvent.scheduledStartTimestamp).getTime() === newScheduledTime.getTime()
                );

                if (!isAlreadyScheduled) {
                    const guild = client.guilds.cache.first();
                    if (guild) {
                        const scheduledEndTime = new Date(
                            newScheduledTime.getTime() + event.duration * 60 * 1000
                        );

                        await guild.scheduledEvents.create({
                            name: event.name,
                            scheduledStartTime: newScheduledTime,
                            scheduledEndTime,
                            privacyLevel: 2, // Guild-only
                            entityType: event.location === 'N/A' ? 2 : 3, // Voice or External
                            entityMetadata: event.location === 'N/A' ? undefined : { location: event.location },
                            description: event.description,
                        });

                        console.log(
                            `[SCHEDULER] Scheduled event "${event.name}" for ${newScheduledTime.toLocaleString()} with end time ${scheduledEndTime.toLocaleString()}..`
                        );

                        // Save the rescheduled event to the `scheduledEvents.json`
                        saveRescheduledEvent({
                            ...event,
                            scheduledTime: newScheduledTime.toISOString(),
                            scheduledEndTime: scheduledEndTime.toISOString(),
                        });
                    }

                    // Update the event's scheduled time in `tobescheduled.json`
                    event.scheduledTime = newScheduledTime.toISOString();
                } else {
                    console.log(`[SCHEDULER] Event "${event.name}" is already scheduled for ${newScheduledTime.toLocaleString()}. Skipping.`);
                }
            }
        }

        // Save updated events back to the JSON file
        saveJson(toBeScheduledPath, toBeScheduled);
    } catch (error) {
        console.error('[SCHEDULER] Error processing to-be-scheduled events:', error);
    }
}

module.exports = { processToBeScheduled, initializeScheduledEvents };

