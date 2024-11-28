/**
 * @file guildUtils.js
 * @description Handles loading and saving of guild-specific data to/from a JSON file.
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

// Import required modules
const fs = require('fs');
const path = require('path');

/**********************************************************************/
// Paths to JSON Data Files

// Define the path to the guild data JSON file
const guildDataPath = path.join(__dirname, '../data/guildData.json');

/**********************************************************************/
// Function to Load Guild Data from JSON File

/**
 * @function loadGuildData
 * @description Loads guild data from the JSON file.
 * @returns {object} The parsed guild data.
 */
function loadGuildData() {
    try {
        return JSON.parse(fs.readFileSync(guildDataPath, 'utf8'));
    } catch (error) {
        console.error('Error loading guild data:', error);
        return {}; // Return an empty object if the file doesn't exist or is invalid
    }
}

/**********************************************************************/
// Function to Save Guild Data to JSON File

/**
 * @function saveGuildData
 * @description Saves guild data to the JSON file.
 * @param {object} data - The guild data to be saved.
 */
function saveGuildData(data) {
    try {
        fs.writeFileSync(guildDataPath, JSON.stringify(data, null, 2));
        console.log('Guild data successfully saved.');
    } catch (error) {
        console.error('Error saving guild data:', error);
    }
}

/**********************************************************************/
// Module Exports

// Export the Guild Data Management Functions
module.exports = { loadGuildData, saveGuildData };
