/**
 * @file auxiliaryAdd.js
 * @description Adds a role to the auxiliary roles list with a specific rate for salary distribution management.
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
const auxiliaryRolesPath = path.join(__dirname, '../data/auxiliaryRoles.json');

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
        .setName('auxiliaryadd')
        .setDescription('Add a new role to the auxiliary roles list with a specific rate.')
        .addRoleOption(option =>
            option
                .setName('role')
                .setDescription('The role to add.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('rate')
                .setDescription('The salary rate for the role (High, Medium, Low).')
                .setRequired(true)
                .setAutocomplete(true)),

    /**
     * @function execute
     * @description Handles the command to add a role to the auxiliary roles list.
     * @param {Object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const role = interaction.options.getRole('role');
        const rate = interaction.options.getString('rate');
        const auxiliaryRoles = loadAuxiliaryRoles();

        console.log(`[ AUXILIARY_ADD ] Command executed by user ${interaction.user.id} to add role ${role.id} with rate ${rate}.`);

        /**********************************************************************/
        // Validate Rate

        if (!['High', 'Medium', 'Low'].includes(rate)) {
            console.warn(`[ AUXILIARY_ADD ] Invalid rate provided: ${rate}`);
            return interaction.reply({
                content: 'Invalid rate. Please specify High, Medium, or Low.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Check for Duplicate Role

        if (auxiliaryRoles.some(r => r.roleId === role.id)) {
            console.warn(`[ AUXILIARY_ADD ] Role ${role.id} is already in the auxiliary roles list.`);
            return interaction.reply({
                content: 'This role is already in the auxiliary roles list.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Add Role and Save Changes

        auxiliaryRoles.push({ roleId: role.id, salaryType: rate });
        saveAuxiliaryRoles(auxiliaryRoles);

        console.log(`[ AUXILIARY_ADD ] Added role ${role.id} (${role.name}) with rate ${rate}.`);
        return interaction.reply({
            content: `Added role **${role.name}** with a salary rate of **${rate}**.`,
            ephemeral: true,
        });
    },
};
