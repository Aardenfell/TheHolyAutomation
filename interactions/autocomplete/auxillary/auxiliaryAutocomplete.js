/**
 * @file auxiliaryAutocomplete.js
 * @description Handles autocomplete for auxiliary role commands, providing suggestions for existing roles and salary rates.
 * @author Aardenfell
 * @since 2.7.0
 * @version 2.7.0
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');

// Path to auxiliaryRoles.json
const auxiliaryRolesPath = path.join(__dirname, '../data/auxiliaryRoles.json');

/**********************************************************************/
// Module Export - Autocomplete Handler

module.exports = {
    name: 'auxiliary', // Matches commands starting with "auxiliary"

    /**
     * @function execute
     * @description Executes autocomplete for the auxiliary role commands.
     * @param {import('discord.js').AutocompleteInteraction} interaction - The autocomplete interaction object.
     */
    async execute(interaction) {
        const focusedValue = interaction.options.getFocused();
        const optionName = interaction.options.getFocused(true).name;

        // Load roles from auxiliaryRoles.json
        let auxiliaryRoles = [];
        try {
            auxiliaryRoles = JSON.parse(fs.readFileSync(auxiliaryRolesPath, 'utf-8'));
        } catch (error) {
            console.error('[ AUTOCOMPLETE ] Error reading auxiliaryRoles.json:', error);
        }

        /**********************************************************************/
        // Handle Suggestions Based on Option Name

        if (optionName === 'role') {
            // Suggest roles based on existing auxiliary roles
            const filteredRoles = auxiliaryRoles
                .filter(role =>
                    role.roleId.toLowerCase().includes(focusedValue.toLowerCase())
                )
                .map(role => ({
                    name: `<@&${role.roleId}> (${role.salaryType})`,
                    value: role.roleId,
                }));

            return await interaction.respond(filteredRoles.slice(0, 25));
        }

        // if (optionName === 'rate') {
        //     // Suggest valid salary rates
        //     const rates = ['High', 'Medium', 'Low'];
        //     const filteredRates = rates
        //         .filter(rate => rate.toLowerCase().startsWith(focusedValue.toLowerCase()))
        //         .map(rate => ({ name: rate, value: rate }));

        //     return await interaction.respond(filteredRates);
        // }

        // Default empty response
        await interaction.respond([]);
    },
};
