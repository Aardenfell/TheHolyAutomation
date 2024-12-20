/**
 * @file auxiliaryRemoveAutocomplete.js
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
const auxiliaryRolesPath = path.join(__dirname, '../../../data/auxiliaryRoles.json');

/**********************************************************************/
// Module Export - Autocomplete Handler

module.exports = {
    name: 'auxiliaryremove', // Matches commands requiring this autocomplete

    /**
     * @function execute
     * @description Executes autocomplete for the auxiliary role commands.
     * @param {import('discord.js').AutocompleteInteraction} interaction - The autocomplete interaction object.
     */
    async execute(interaction) {
        const focusedValue = interaction.options.getFocused();
        const optionName = interaction.options.getFocused(true).name;

        console.log(`[ AUTOCOMPLETE ] Autocomplete triggered for ${optionName} with input: "${focusedValue}".`);

        // Load roles from auxiliaryRoles.json
        let auxiliaryRoles = [];
        try {
            auxiliaryRoles = JSON.parse(fs.readFileSync(auxiliaryRolesPath, 'utf-8'));
            console.log(`[ AUTOCOMPLETE ] Loaded ${auxiliaryRoles.length} auxiliary roles from JSON.`);
        } catch (error) {
            console.error('[ AUTOCOMPLETE ] Error reading auxiliaryRoles.json:', error);
            return interaction.respond([]); // Return empty if file read fails
        }

        /**********************************************************************/
        // Handle Suggestions Based on Option Name

        if (optionName === 'role') {
            const guild = interaction.guild;
            if (!guild) {
                console.error('[ AUTOCOMPLETE ] Guild not available.');
                return interaction.respond([]);
            }

            let guildRoles;
            try {
                guildRoles = await guild.roles.fetch();
                console.log(`[ AUTOCOMPLETE ] Fetched ${guildRoles.size} roles from guild.`);
            } catch (fetchError) {
                console.error('[ AUTOCOMPLETE ] Error fetching guild roles:', fetchError);
                return interaction.respond([]);
            }

            const filteredRoles = auxiliaryRoles
                .filter(role =>
                    guildRoles.has(role.roleId) && // Ensure the role exists in the guild
                    guildRoles.get(role.roleId).name.toLowerCase().includes(focusedValue.toLowerCase())
                )
                .map(role => ({
                    name: `${guildRoles.get(role.roleId).name} (${role.salaryType})`,
                    value: role.roleId,
                }));

            if (filteredRoles.length === 0) {
                console.warn('[ AUTOCOMPLETE ] No roles matched the input.');
            } else {
                console.log(`[ AUTOCOMPLETE ] Returning ${filteredRoles.length} filtered roles.`);
            }

            return interaction.respond(filteredRoles.slice(0, 25));
        }

        console.log('[ AUTOCOMPLETE ] No valid option name matched.');
        // Default empty response
        return interaction.respond([]);
    },
};
