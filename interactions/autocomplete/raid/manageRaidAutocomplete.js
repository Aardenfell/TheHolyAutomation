/**
 * @file manageRaidAutocomplete.js
 * @description Handles the autocomplete interaction for the "manageraid" command to assist users with selecting raids dynamically.
 * @author Aardenfell
 * @since 2.2.0
 * @version 2.2.0
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');

// Path to JSON data file
const raidSignUpsPath = path.join(__dirname, '../../../data/raidSignUps.json');

/**********************************************************************/
// Module Exports - Autocomplete Command Execution

module.exports = {
    name: 'manageraid', // This should match the command name

    /**
     * @function execute
     * @description Executes autocomplete for the "manageraid" command.
     * @param {import('discord.js').AutocompleteInteraction} interaction The autocomplete interaction.
     */
    async execute(interaction) {
        const focusedValue = interaction.options.getFocused();

        /**********************************************************************/
        // Dynamically Load Raid Sign-Up Data

        let raidSignUps = [];
        try {
            raidSignUps = JSON.parse(fs.readFileSync(raidSignUpsPath, 'utf-8'));
        } catch (error) {
            console.error('Error reading raidSignUps.json:', error);
        }

        /**********************************************************************/
        // Filter Raid Choices

        const filteredRaids = raidSignUps
            .filter(raid =>
                !raid.closed && // Only include open raids
                `${(raid.selectedBosses || ['Pending Selection']).join(', ')} | ${raid.day} | ID: ${raid.messageId}`
                    .toLowerCase()
                    .includes(focusedValue.toLowerCase())
            )
            .map(raid => ({
                name: `${(raid.selectedBosses || ['Pending Selection']).join(', ')} | ${raid.day} | ID: ${raid.messageId}`, // Display format: Boss(es) | Day | ID
                value: raid.messageId // Use messageId as the value
            }));

        /**********************************************************************/
        // Respond with Autocomplete Choices

        await interaction.respond(filteredRaids.slice(0, 25)); // Limit to the first 25 matches
    },
};
