/**
 * @file Raid NGP Autocomplete Handler
 * @description Handles the autocomplete interaction for the "raidngp" command to assist users with selecting items or raids dynamically.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');

// Paths to JSON data files
const itemsPath = path.join(__dirname, '../../../data/items.json');
const raidSignUpsPath = path.join(__dirname, '../../../data/raidSignUps.json');

/**********************************************************************/
// Module Exports - Autocomplete Command Execution

module.exports = {
    name: 'raidngp', // This should match the command name

    /**
     * @function execute
     * @description Executes autocomplete for the "raidngp" command.
     * @param {import('discord.js').AutocompleteInteraction} interaction The autocomplete interaction.
     */
    async execute(interaction) {
        const focusedValue = interaction.options.getFocused();
        const focusedOption = interaction.options.getFocused(true); // Gets the focused option as an object

        /**********************************************************************/
        // Dynamically Load Raid Sign-Up Data

        let raidSignUps = [];
        try {
            raidSignUps = JSON.parse(fs.readFileSync(raidSignUpsPath, 'utf-8'));
        } catch (error) {
            console.error('Error reading raidSignUps.json:', error);
        }

        /**********************************************************************/
        // Autocomplete Handling - Items or Raids

        if (focusedOption.name === 'item') {
            /**********************************************************************/
            // Autocomplete for Items

            let itemsData = [];
            try {
                itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
            } catch (error) {
                console.error('Error reading items.json:', error);
            }

            // Filter item choices based on user input
            const choices = itemsData.map(item => item.name);
            const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));

            await interaction.respond(
                filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
            );
        } else if (focusedOption.name === 'raid') {
            /**********************************************************************/
            // Autocomplete for Raids

            const filteredRaids = raidSignUps
                .filter(raid =>
                    !raid.closed &&
                    `${(raid.selectedBosses || ['Pending Selection']).join(', ')} | ${raid.day} | ID: ${raid.messageId}`
                        .toLowerCase()
                        .includes(focusedValue.toLowerCase())
                )
                .map(raid => ({
                    name: `${(raid.selectedBosses || ['Pending Selection']).join(', ')} | ${raid.day} | ID: ${raid.messageId}`, // Display as "Boss(es) | Day | ID"
                    value: raid.messageId // Return the messageId for further use
                }));

            await interaction.respond(filteredRaids.slice(0, 25));
        }
    },
};
