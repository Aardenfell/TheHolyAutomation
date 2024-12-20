/**
 * @file auxiliaryRate.js
 * @description Updates the salary rate for an existing auxiliary role in the list.
 * @autor Aardenfell
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
        .setName('auxiliaryrate')
        .setDescription('Edit the salary rate for an existing auxiliary role.')
        .addStringOption(option =>
            option
                .setName('role')
                .setDescription('The role to edit.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option
                .setName('rate')
                .setDescription('The new salary rate (High, Medium, Low).')
                .setRequired(true)
                .addChoices(
                    { name: 'Low', value: 'Low' },
                    { name: 'Medium', value: 'Medium' },
                    { name: 'High', value: 'High' }
                )),

    /**
     * @function execute
     * @description Handles the command to update the salary rate for an auxiliary role.
     * @param {Object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const role = interaction.options.getString('role');
        const rate = interaction.options.getString('rate');
        const auxiliaryRoles = loadAuxiliaryRoles();

        console.log(`[ AUXILIARY_RATE ] Command executed by user ${interaction.user.id} to update role ${role} to rate ${rate}.`);

        /**********************************************************************/
        // Validate Rate

        if (!['High', 'Medium', 'Low'].includes(rate)) {
            console.warn(`[ AUXILIARY_RATE ] Invalid rate provided: ${rate}`);
            return interaction.reply({
                content: 'Invalid rate. Please specify High, Medium, or Low.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Check for Existing Role

        const roleData = auxiliaryRoles.find(r => r.roleId === role);
        if (!roleData) {
            console.warn(`[ AUXILIARY_RATE ] Role ${role} not found in the auxiliary roles list.`);
            return interaction.reply({
                content: 'This role is not in the auxiliary roles list.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Update Rate and Save Changes

        roleData.salaryType = rate;
        saveAuxiliaryRoles(auxiliaryRoles);

        console.log(`[ AUXILIARY_RATE ] Updated rate for role ${role} to ${rate}.`);
        return interaction.reply({
            content: `Updated salary rate for role <@&${role}> to **${rate}**.`,
            ephemeral: true,
        });
    },
};
