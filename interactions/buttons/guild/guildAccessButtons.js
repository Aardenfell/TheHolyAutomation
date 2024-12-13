/**
 * @file guildAccessButtons.js
 * @description Handles guild access interactions, such as new recruit, visitor, or envoy access.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.5.0
 */

/**********************************************************************/
// Required Modules

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load Configuration File
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));

/**********************************************************************/
// Module Exports - Guild Access Command Execution

module.exports = {
    id: 'guild_access',

    /**
     * @function execute
     * @description Execute function to handle guild access interactions.
     * @param {object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const customId = interaction.customId;

        try {
            /**********************************************************************/
            // Handle New Recruit Access

            if (customId === 'new_recruit') {
                // Defer the interaction reply
                await interaction.deferReply({ ephemeral: true });

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_guild')
                    .setPlaceholder('Select the guild you are joining')
                    .addOptions(
                        Object.entries(config.guilds).map(([key, guild]) => ({
                            label: guild.name,
                            value: key,
                        }))
                    );

                await interaction.editReply({
                    content: 'Please select the guild you are joining:',
                    components: [new ActionRowBuilder().addComponents(selectMenu)],
                });

                /**********************************************************************/
                // Handle Visitor Access
            } else if (customId === 'visitor_access') {
                // Defer the interaction reply
                await interaction.deferReply({ ephemeral: true });

                const restrictorRole = interaction.guild.roles.cache.get(config.roles.restrictor);
                const visitorRole = interaction.guild.roles.cache.get(config.roles.visitor);
                const visitorChannel = interaction.guild.channels.cache.get(config.channels.visitorWelcome);
                const member = interaction.member;

                // Update roles
                if (restrictorRole) await member.roles.remove(restrictorRole);
                if (visitorRole) await member.roles.add(visitorRole);

                // Update nickname
                const suffix = ' | Visitor';
                const baseName = member.user.username.length + suffix.length > 32
                    ? member.user.username.slice(0, 32 - suffix.length).trim()
                    : member.user.username;

                const newNickname = `${baseName}${suffix}`;
                try {
                    await member.setNickname(newNickname);
                } catch (error) {
                    console.error('Error setting nickname:', error);
                    return await interaction.editReply({
                        content: 'Visitor role assigned, but I could not change your nickname. Please contact an admin.',
                    });
                }

                // Send a welcome message
                if (visitorChannel) {
                    await visitorChannel.send(`👀 **${member.user}** is looking around. Welcome!`);
                }

                await interaction.editReply({
                    content: 'You now have Visitor access!',
                });

                /**********************************************************************/
                // Handle Envoy Access
            } else if (customId === 'envoy_access') {
                const modal = new ModalBuilder()
                    .setCustomId('envoy_modal')
                    .setTitle('Envoy Information')
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
                                .setCustomId('guild_name')
                                .setLabel('Enter your guild name:')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
            }
        } catch (error) {
            console.error('Error handling guild access button:', error);
            if (!interaction.replied) {
                await interaction.editReply({
                    content: 'Something went wrong while processing your request. Please try again later.',
                });
            }
        }
    },
};
