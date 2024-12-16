/**
 * @file eventScheduler.js
 * @description Background process to manage custom frequency events from `tobescheduled.json`.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

const fs = require('fs');
const path = require('path');

// Path to the toBeScheduled JSON file
const toBeScheduledPath = path.join(__dirname, '../data/tobescheduled.json');

/**
 * @function loadToBeScheduled
 * @description Loads the `tobescheduled.json` file and parses its contents.
 * @returns {Array} Parsed event data from the JSON file.
 */
function loadToBeScheduled() {
    if (!fs.existsSync(toBeScheduledPath)) return [];
    return JSON.parse(fs.readFileSync(toBeScheduledPath, 'utf-8'));
}

/**
 * @function saveToBeScheduled
 * @description Saves updated events to the `tobescheduled.json` file.
 * @param {Array} events - The updated array of events to save.
 */
function saveToBeScheduled(events) {
    fs.writeFileSync(toBeScheduledPath, JSON.stringify(events, null, 2), 'utf-8');
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
 * @function processToBeScheduled
 * @description Background process to check and schedule events.
 * @param {object} client - The Discord client object.
 */
async function processToBeScheduled(client) {
    try {
        const events = loadToBeScheduled();
        const updatedEvents = [];
        const now = new Date();

        for (const event of events) {
            const scheduledTime = new Date(event.scheduledTime);
            const durationMs = event.duration * 60 * 1000; // Convert minutes to milliseconds
            const eventEndTime = new Date(scheduledTime.getTime() + durationMs);

            // If the current time has passed the event's end time, reschedule it
            if (now > eventEndTime) {
                console.log(`[SCHEDULER] Rescheduling event: ${event.name}`);

                // Calculate the new scheduled time
                const newScheduledTime = calculateNextTime(scheduledTime, event.frequency);

                // Ensure the event isn't already scheduled for the new time
                const isAlreadyScheduled = updatedEvents.some(
                    (e) =>
                        e.name === event.name &&
                        new Date(e.scheduledTime).getTime() === newScheduledTime.getTime()
                );

                if (!isAlreadyScheduled) {
                    // Schedule the event via Discord API
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
                    }

                    // Update the event's scheduled time
                    event.scheduledTime = newScheduledTime.toISOString();
                }
            }

            // Add the event (updated or not) to the list
            updatedEvents.push(event);
        }

        // Save updated events back to the JSON file
        saveToBeScheduled(updatedEvents);
    } catch (error) {
        console.error('[SCHEDULER] Error processing to-be-scheduled events:', error);
    }
}

module.exports = { processToBeScheduled };


module.exports = { processToBeScheduled };
