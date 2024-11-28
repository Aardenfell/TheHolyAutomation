/**
 * @file eventUtils.js
 * @description Utility functions for managing NGP events, including saving and retrieving events data.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');

// Path to the JSON data file for NGP events
const ngpEventsPath = path.join(__dirname, '../data/ngpEvents.json');

/**********************************************************************/
// Event Utility Functions

/**
 * @function saveNGPEvents
 * @description Save the updated NGP events back to the JSON file.
 * @param {Array} eventsData - The updated NGP events data.
 */
function saveNGPEvents(eventsData) {
    fs.writeFileSync(ngpEventsPath, JSON.stringify(eventsData, null, 2));
}

/**
 * @function getCurrentEvents
 * @description Fetches all NGP events from the JSON file.
 * @returns {Array} The list of current NGP events.
 */
function getCurrentEvents() {
    const eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8')) || [];
    return eventsData;
}

/**********************************************************************/
// Module Exports

module.exports = { saveNGPEvents, getCurrentEvents };
