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

/**********************************************************************/
// Expiration Check Function

/**
 * @function startExpirationCheck
 * @description Start a periodic expiration check for NGP events and polls.
 * @param {object} client - The Discord client object.
 * @param {number} [intervalMs=1000] - The interval in milliseconds for checking expiration (default is 1 second).
 */
function startExpirationCheck(client, intervalMs = 1000) {
    setInterval(async () => {
        const currentTime = Math.floor(Date.now() / 1000); // Current time in Unix seconds

        // Debugging: Log the current time of expiration checks if needed.
        // console.log(`Checking for expired events and polls at: ${new Date().toLocaleString()}`);
        // console.log(`Unix time: ${currentTime}`);

        // Run the expiration handler for NGP events.
        await handleNGPExpiration(client, currentTime);

        // Run the expiration handler for polls.
        await handlePollExpiration(client, currentTime);
    }, intervalMs);
}

/**********************************************************************/
// Module Export

// Export the startExpirationCheck function for use in other modules.
module.exports = {
    startExpirationCheck,
};