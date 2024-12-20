/**
 * @file ngpExpirationCheck.js
 * @description Periodic check for expiration of NGP events and polls.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));

// Import necessary handlers for expiration checks.
const { handleNGPExpiration } = require('./ngpHelpers');
const { handlePollExpiration } = require('./pollHelpers');
const { checkScheduledEvents } = require('./eventChecker');
const { processToBeScheduled } = require('./eventScheduler');
const { processAnnouncements, cleanupAnnouncements } = require('./eventAnnounce');
const { distributeSalaries } = require('./salaryDistributor');

/**********************************************************************/
// Helper Functions

/**
 * @function scheduleNextThursday
 * @description Schedules the salary distribution for the next Thursday at midnight.
 * @returns {number} Delay in milliseconds until the next Thursday.
 */
function scheduleNextThursday() {
    const now = new Date();
    const nextThursday = new Date(now);

    // Calculate the next Thursday (4 = Thursday)
    nextThursday.setDate(now.getDate() + ((4 - now.getDay() + 7) % 7));
    nextThursday.setHours(0, 0, 0, 0); // Set time to midnight

    return nextThursday.getTime() - now.getTime();
}

/**********************************************************************/
// Expiration Check Function

/**
 * @function startExpirationCheck
 * @description Start periodic checks for expiration of NGP events, polls, and custom scheduled events.
 * @param {object} client - The Discord client object.
 * @param {number} [intervalMs=1000] - The interval in milliseconds for general expiration checks (default is 1 second).
 * @param {number} [scheduledEventIntervalMs=5000] - The interval in milliseconds for custom scheduled events (default is 5 seconds).
 * @param {number} [cacheUpdateIntervalMs=60000] - The interval in milliseconds for scheduled events cache update (default is 1 minute).
 */
function startExpirationCheck(client, intervalMs = 1000, scheduledEventIntervalMs = 5000, cacheUpdateIntervalMs = 60000) {
    let isProcessingScheduledEvents = false; // Flag to prevent overlapping checks for processToBeScheduled

    // Interval for NGP and poll expiration checks (every second)
    setInterval(async () => {
        const currentTime = Math.floor(Date.now() / 1000); // Current time in Unix seconds

        // Run the expiration handler for NGP events.
        await handleNGPExpiration(client, currentTime);

        // Run the expiration handler for polls.
        await handlePollExpiration(client, currentTime);

        // Run the announcment handler for scheduled events.
        await processAnnouncements(client);

        await cleanupAnnouncements();
    }, intervalMs);

    // Interval for custom scheduled events processing (every 5 seconds by default)
    setInterval(async () => {
        if (isProcessingScheduledEvents) {
            console.log('[SCHEDULER] Skipping execution to avoid overlap.');
            return;
        }

        isProcessingScheduledEvents = true;

        try {
            // Call processToBeScheduled
            await processToBeScheduled(client, config);
        } catch (error) {
            console.error('[SCHEDULER] Error during scheduled events processing:', error);
        } finally {
            isProcessingScheduledEvents = false;
        }
    }, scheduledEventIntervalMs);

    // Interval for updating the scheduled events cache (every minute)
    setInterval(async () => {
        try {
            await checkScheduledEvents(client);
        } catch (error) {
            console.error('[EVENT CHECKER] Error during scheduled events cache update:', error);
        }
    }, cacheUpdateIntervalMs);

    // Schedule salary distribution
    const delay = scheduleNextThursday();
    setTimeout(() => {
        distributeSalaries(client); // Distribute salaries
        setInterval(() => distributeSalaries(client), 7 * 24 * 60 * 60 * 1000); // Weekly interval
    }, delay);
}


/**********************************************************************/
// Module Export

// Export the startExpirationCheck function for use in other modules.
module.exports = {
    startExpirationCheck,
};