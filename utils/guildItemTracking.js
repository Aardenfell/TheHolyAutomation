/**
 * @file guildItemTracking.js
 * @description Tracks items obtained by guild members through Need or Bid rolls.
 * @author Aardenfell
 * @since 2.3.0
 * @version 2.3.0
 */

const { loadGuildData, saveGuildData } = require('./guildUtils');
const fs = require('fs');
const path = require('path');

// Load guild configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));

/**
 * @function trackItemForGuildMember
 * @description Updates the guild data to record an item obtained by a guild member.
 * @param {string} userId - Discord ID of the user who won the item.
 * @param {string} itemName - The name of the item won.
 * @param {string} method - The method by which the item was obtained (e.g., "Need" or "Bid").
 */
function trackItemForGuildMember(userId, itemName, method) {
    const guildData = loadGuildData();

    // Ensure user entry exists
    if (!guildData[userId]) {
        console.error(`User with ID ${userId} not found in guild data.`);
        return;
    }

    // Initialize the obtainedItems array if not present
    if (!Array.isArray(guildData[userId].obtainedItems)) {
        guildData[userId].obtainedItems = [];
    }

    // Record the obtained item
    guildData[userId].obtainedItems.push({
        itemName,
        method,
        timestamp: new Date().toISOString(),
    });

    // Save updated guild data
    saveGuildData(guildData);
    console.log(`Item "${itemName}" (${method}) recorded for user ${userId}.`);
}

module.exports = {
    trackItemForGuildMember,
};
