/**
 * @file Private NGP Autocomplete Handler
 * @description Handles the autocomplete functionality for the privatengp command, providing matching item suggestions.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');

// Load items from items.json
const itemsPath = path.join(__dirname, '../../../data/items.json');
let itemsData = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));

/**********************************************************************/
// Module Exports - Autocomplete Command Execution

module.exports = {
    name: 'privatengp', // This should match the command name

    /**
     * @function execute
     * @description Executes autocomplete for the privatengp command.
     * @param {import('discord.js').AutocompleteInteraction} interaction - The autocomplete interaction from Discord.
     */
    async execute(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = itemsData.map(item => item.name);

        // Filter choices based on the user's input
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));

        // Respond with up to 25 matching items
        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
        );
    },
};
