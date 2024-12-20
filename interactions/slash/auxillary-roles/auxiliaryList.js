/**
 * @file auxiliaryList.js
 * @description Lists all roles and their associated rates in the auxiliary roles list.
 * @author Aardenfell
 * @since 2.7.0
 * @version 2.7.0
 */

/**********************************************************************/
// Required Modules and Utilities

const { SlashCommandBuilder } = require('discord.js');
const { loadAuxiliaryRoles } = require('../../../utils/salaryDistributor');

/**********************************************************************/
// Module Export: Slash Command Handler

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auxiliarylist')
        .setDescription('List all roles and their associated rates.'),

    /**
     * @function execute
     * @description Handles the command to list all roles and their associated salary rates.
     * @param {Object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const auxiliaryRoles = loadAuxiliaryRoles();

        console.log(`[ AUXILIARY_LIST ] Command executed by user ${interaction.user.id}.`);

        /**********************************************************************/
        // Check for Empty Role List

        if (auxiliaryRoles.length === 0) {
            console.warn(`[ AUXILIARY_LIST ] No auxiliary roles found.`);
            return interaction.reply({
                content: 'No auxiliary roles have been configured.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Generate and Send Role List

        const roleList = auxiliaryRoles
            .map(role => `• <@&${role.roleId}>: ${role.salaryType}`)
            .join('\n');

        console.log(`[ AUXILIARY_LIST ] Listed ${auxiliaryRoles.length} roles.`);
        return interaction.reply({
            content: `**Auxiliary Roles List:**\n${roleList}`,
            ephemeral: true,
        });
    },
};
