/**
 * @file ngpExpirationCheck.js
 * @description Periodic check for expiration of NGP events and polls, including salary distribution scheduling.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.7.0
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
    const dayDifference = (4 - now.getDay() + 7) % 7 || 7; // Ensure it calculates 7 days if today is Thursday
    nextThursday.setDate(now.getDate() + dayDifference);
    nextThursday.setHours(0, 0, 0, 0); // Set time to midnight

    const delay = nextThursday.getTime() - now.getTime();

    if (delay <= 0) {
        console.warn(`[ SALARY SCHEDULER ] Calculated a non-positive delay (${delay}). Adjusting for next week.`);
        return 7 * 24 * 60 * 60 * 1000; // Default to 7 days in milliseconds
    }

    console.log(`[ SALARY SCHEDULER ] Next salary distribution scheduled in ${Math.round(delay / 1000 / 60)} minutes.`);
    return delay;
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

        // Run the announcement handler for scheduled events.
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
    console.log(`[ SALARY SCHEDULER ] Waiting ${Math.round(delay / 1000 / 60)} minutes for the first salary distribution.`);

    setTimeout(async () => {
        console.log('[ SALARY SCHEDULER ] Executing salary distribution...');
        try {
            await distributeSalaries(client); // Distribute salaries
            console.log('[ SALARY SCHEDULER ] Salary distribution complete.');
        } catch (error) {
            console.error('[ SALARY SCHEDULER ] Error during salary distribution:', error);
        }

        // Schedule the next distribution every 7 days
        setInterval(async () => {
            console.log('[ SALARY SCHEDULER ] Executing weekly salary distribution...');
            try {
                await distributeSalaries(client);
                console.log('[ SALARY SCHEDULER ] Weekly salary distribution complete.');
            } catch (error) {
                console.error('[ SALARY SCHEDULER ] Error during weekly salary distribution:', error);
            }
        }, 7 * 24 * 60 * 60 * 1000); // Weekly interval
    }, delay);
}

/**********************************************************************/
// Module Export

module.exports = {
    startExpirationCheck,
};
