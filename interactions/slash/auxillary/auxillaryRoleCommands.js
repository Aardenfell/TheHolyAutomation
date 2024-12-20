/**
 * @file auxiliaryRoleCommands.js
 * @description Manages auxiliary role salary configuration through slash commands, allowing addition, removal, and updates to auxiliary roles and their rates.
 * @author Aardenfell
 * @since 2.7.0
 * @version 2.7.0
 */

/**********************************************************************/
// Required Modules and Utilities

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadAuxiliaryRoles } = require('../../../utils/salaryDistributor');

// Paths to JSON data files
const auxiliaryRolesPath = path.join(__dirname, '../data/auxiliaryRoles.json');

/**********************************************************************/
// Helper Functions

/**
 * @function saveAuxiliaryRoles
 * @description Saves the auxiliary roles data to the JSON file.
 * @param {Array} data - The auxiliary roles data to save.
 */
function saveAuxiliaryRoles(data) {
    fs.writeFileSync(auxiliaryRolesPath, JSON.stringify(data, null, 2));
}

/**********************************************************************/
// Module Export: Slash Commands

module.exports = {
    data: [
        new SlashCommandBuilder()
            .setName('auxiliaryadd')
            .setDescription('Add a new role to the auxiliary roles list with a specific rate.')
            .addRoleOption(option =>
                option.setName('role')
                    .setDescription('The role to add.')
                    .setRequired(true))
            .addStringOption(option =>
                option.setName('rate')
                    .setDescription('The salary rate for the role (High, Medium, Low).')
                    .setRequired(true)
                    .setAutocomplete(true)), // Use autocomplete for salary rates
        new SlashCommandBuilder()
            .setName('auxiliaryremove')
            .setDescription('Remove a role from the auxiliary roles list.')
            .addStringOption(option =>
                option.setName('role')
                    .setDescription('The role to remove.')
                    .setRequired(true)
                    .setAutocomplete(true)), // Use autocomplete for roles
        new SlashCommandBuilder()
            .setName('auxiliaryrate')
            .setDescription('Edit the salary rate for an existing auxiliary role.')
            .addStringOption(option =>
                option.setName('role')
                    .setDescription('The role to edit.')
                    .setRequired(true)
                    .setAutocomplete(true)) // Use autocomplete for roles
            .addStringOption(option =>
                option.setName('rate')
                    .setDescription('The new salary rate (High, Medium, Low).')
                    .setRequired(true)
                    .setAutocomplete(true)), // Use autocomplete for salary rates
        new SlashCommandBuilder()
            .setName('auxiliarylist')
            .setDescription('List all roles and their associated rates.'),
    ],

    /**********************************************************************/
    // Command Execution

    /**
     * @function execute
     * @description Handles the execution of the slash commands.
     * @param {Object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const command = interaction.commandName;
        const auxiliaryRoles = loadAuxiliaryRoles();

        if (command === 'auxiliaryadd') {
            const role = interaction.options.getRole('role');
            const rate = interaction.options.getString('rate');

            if (!['High', 'Medium', 'Low'].includes(rate)) {
                return interaction.reply({
                    content: 'Invalid rate. Please specify High, Medium, or Low.',
                    ephemeral: true,
                });
            }

            if (auxiliaryRoles.some(r => r.roleId === role.id)) {
                return interaction.reply({
                    content: 'This role is already in the auxiliary roles list.',
                    ephemeral: true,
                });
            }

            auxiliaryRoles.push({ roleId: role.id, salaryType: rate });
            saveAuxiliaryRoles(auxiliaryRoles);

            console.log(`[ AUXILIARY_ADD ] Added role ${role.id} with rate ${rate}.`);
            return interaction.reply({
                content: `Added role **${role.name}** with a salary rate of **${rate}**.`,
                ephemeral: true,
            });
        }

        if (command === 'auxiliaryremove') {
            const role = interaction.options.getRole('role');

            const index = auxiliaryRoles.findIndex(r => r.roleId === role.id);
            if (index === -1) {
                return interaction.reply({
                    content: 'This role is not in the auxiliary roles list.',
                    ephemeral: true,
                });
            }

            auxiliaryRoles.splice(index, 1);
            saveAuxiliaryRoles(auxiliaryRoles);

            console.log(`[ AUXILIARY_REMOVE ] Removed role ${role.id} from the list.`);
            return interaction.reply({
                content: `Removed role **${role.name}** from the auxiliary roles list.`,
                ephemeral: true,
            });
        }

        if (command === 'auxiliaryrate') {
            const role = interaction.options.getRole('role');
            const rate = interaction.options.getString('rate');

            if (!['High', 'Medium', 'Low'].includes(rate)) {
                return interaction.reply({
                    content: 'Invalid rate. Please specify High, Medium, or Low.',
                    ephemeral: true,
                });
            }

            const roleData = auxiliaryRoles.find(r => r.roleId === role.id);
            if (!roleData) {
                return interaction.reply({
                    content: 'This role is not in the auxiliary roles list.',
                    ephemeral: true,
                });
            }

            roleData.salaryType = rate;
            saveAuxiliaryRoles(auxiliaryRoles);

            console.log(`[ AUXILIARY_RATE ] Updated rate for role ${role.id} to ${rate}.`);
            return interaction.reply({
                content: `Updated salary rate for role **${role.name}** to **${rate}**.`,
                ephemeral: true,
            });
        }

        if (command === 'auxiliarylist') {
            if (auxiliaryRoles.length === 0) {
                console.log(`[ AUXILIARY_LIST ] No roles found.`);
                return interaction.reply({
                    content: 'No auxiliary roles have been configured.',
                    ephemeral: true,
                });
            }

            const roleList = auxiliaryRoles
                .map(role => `• <@&${role.roleId}>: ${role.salaryType}`)
                .join('\n');

            console.log(`[ AUXILIARY_LIST ] Listed ${auxiliaryRoles.length} roles.`);
            return interaction.reply({
                content: `**Auxiliary Roles List:**\n${roleList}`,
                ephemeral: true,
            });
        }
    },
};
