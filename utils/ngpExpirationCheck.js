/**
 * @file ngpExpirationCheck.js
 * @description Periodic check for expiration of NGP events and polls.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

// Import necessary handlers for expiration checks.
const { handleNGPExpiration } = require('./ngpHelpers');
const { handlePollExpiration } = require('./pollHelpers');
const { checkScheduledEvents } = require('./eventChecker');
const { processToBeScheduled } = require('./eventScheduler');
const { processAnnouncements } = require('./eventAnnounce');

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
            await processToBeScheduled(client);
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
}


/**********************************************************************/
// Module Export

// Export the startExpirationCheck function for use in other modules.
module.exports = {
    startExpirationCheck,
};