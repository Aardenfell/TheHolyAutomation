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

/**********************************************************************/
// Expiration Check Function

/**
 * @function startExpirationCheck
 * @description Start a periodic expiration check for NGP events and polls.
 * @param {object} client - The Discord client object.
 * @param {number} [intervalMs=1000] - The interval in milliseconds for checking expiration (default is 1 second).
 */
function startExpirationCheck(client, intervalMs = 1000, scheduledEventIntervalMs = 60000) {
    // Interval for NGP and poll expiration checks (every second)
    setInterval(async () => {
        const currentTime = Math.floor(Date.now() / 1000); // Current time in Unix seconds

        // Run the expiration handler for NGP events.
        await handleNGPExpiration(client, currentTime);

        // Run the expiration handler for polls.
        await handlePollExpiration(client, currentTime);

        await processToBeScheduled(client);
    }, intervalMs);

    // Interval for scheduled events check (every minute)
    setInterval(async () => {
        await checkScheduledEvents(client);
    }, scheduledEventIntervalMs);
}


/**********************************************************************/
// Module Export

// Export the startExpirationCheck function for use in other modules.
module.exports = {
    startExpirationCheck,
};