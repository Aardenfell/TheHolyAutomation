/**
 * @file auxiliaryRemove.js
 * @description Removes a role from the auxiliary roles list for salary distribution management.
 * @author Aardenfell
 * @since 2.7.0
 * @version 2.7.0
 */

/**********************************************************************/
// Required Modules and Utilities

const { SlashCommandBuilder } = require('discord.js');
const { loadAuxiliaryRoles } = require('../../../utils/salaryDistributor');
const fs = require('fs');
const path = require('path');

// Path to auxiliary roles JSON
const auxiliaryRolesPath = path.join(__dirname, '../../../data/auxiliaryRoles.json');

/**********************************************************************/
// Helper Functions

/**
 * @function saveAuxiliaryRoles
 * @description Saves the updated auxiliary roles list to a JSON file.
 * @param {Array} data - The updated auxiliary roles list.
 */
function saveAuxiliaryRoles(data) {
    fs.writeFileSync(auxiliaryRolesPath, JSON.stringify(data, null, 2));
    console.log(`[ AUXILIARY_ROLES ] Successfully saved updated roles to ${auxiliaryRolesPath}.`);
}

/**********************************************************************/
// Module Export: Slash Command Handler

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auxiliaryremove')
        .setDescription('Remove a role from the auxiliary roles list.')
        .addStringOption(option =>
            option
                .setName('role')
                .setDescription('The role to remove.')
                .setRequired(true)
                .setAutocomplete(true)),

    /**
     * @function execute
     * @description Handles the command to remove a role from the auxiliary roles list.
     * @param {Object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const role = interaction.options.getString('role');
        const auxiliaryRoles = loadAuxiliaryRoles();

        console.log(`[ AUXILIARY_REMOVE ] Command executed by user ${interaction.user.id} for role ${role}.`);

        /**********************************************************************/
        // Validate Role Existence

        const index = auxiliaryRoles.findIndex(r => r.roleId === role);
        if (index === -1) {
            console.warn(`[ AUXILIARY_REMOVE ] Role ${role} not found in the auxiliary roles list.`);
            return interaction.reply({
                content: 'This role is not in the auxiliary roles list.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Remove Role and Save Changes

        auxiliaryRoles.splice(index, 1);
        saveAuxiliaryRoles(auxiliaryRoles);

        console.log(`[ AUXILIARY_REMOVE ] Removed role ${role} from the auxiliary roles list.`);
        return interaction.reply({
            content: `Removed role <@&${role}> from the auxiliary roles list.`,
            ephemeral: true,
        });
    },
};
