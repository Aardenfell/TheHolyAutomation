/**
 * @file Open NGP Autocomplete Handler
 * @description Handles autocomplete for the openngp command, suggesting available items.
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
// Module Exports - Open NGP Autocomplete Command

module.exports = {
    name: 'openngp', // This should match the command name

    /**
     * @function execute
     * @description Executes autocomplete for the openngp command.
     * @param {import('discord.js').AutocompleteInteraction} interaction - The autocomplete interaction object from Discord.
     */
    async execute(interaction) {
        const focusedValue = interaction.options.getFocused();
        const choices = itemsData.map(item => item.name);

        // Filter choices based on user input
        const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));

        // Respond with a maximum of 25 suggestions
        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice, value: choice }))
        );
    },
};