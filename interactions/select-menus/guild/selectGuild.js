/**
 * @file selectGuild.js
 * @description Handles the guild selection for new recruits.
 * @author Aardenfell
 * @since 2.0.0
 * @version 2.0.0
 */

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    id: 'select_guild', // This should match the custom ID from the dropdown menu

    /**
     * @function execute
     * @description Executes when a guild is selected from the dropdown menu.
     * @param {import('discord.js').SelectMenuInteraction} interaction - The interaction object representing the select menu action.
     */
    async execute(interaction) {
        const selectedGuild = interaction.values[0]; // The guild selected by the user

        // Create a new modal to collect further recruit information
        const modal = new ModalBuilder()
            .setCustomId(`new_recruit_modal_${selectedGuild}`) // Custom ID includes the selected guild
            .setTitle('New Recruit Information')
            .addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('ingame_name')
                        .setLabel('Enter your in-game name:')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('referrer_name')
                        .setLabel('Who referred you? (Optional, use ign)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                )
            );

        // Show the modal to collect recruit information
        await interaction.showModal(modal);
    }
};
