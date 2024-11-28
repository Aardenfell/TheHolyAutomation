/**
 * @file guildAccessButtons.js
 * @description Handles guild access interactions, such as new recruit, visitor, or envoy access.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load Configuration File
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));

/**********************************************************************/
// Module Exports - Guild Access Command Execution

module.exports = {
    id: 'guild_access', // Ensure this matches the id used in client.buttonCommands.get()

    /**
     * @function execute
     * @description Execute function to handle guild access interactions.
     * @param {object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const customId = interaction.customId;

        /**********************************************************************/
        // Handle New Recruit Access

        if (customId === 'new_recruit') {
            const modal = new ModalBuilder()
                .setCustomId('new_recruit_modal')
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
            await interaction.showModal(modal);

        /**********************************************************************/
        // Handle Visitor Access

        } else if (customId === 'visitor_access') {
            const restrictorRole = interaction.guild.roles.cache.get(config.roles.restrictor);
            const envoyRole = interaction.guild.roles.cache.get(config.roles.envoy);
            const initiateRole = interaction.guild.roles.cache.get(config.roles.initiate);
            const visitorRole = interaction.guild.roles.cache.get(config.roles.visitor);
            const visitorChannel = interaction.guild.channels.cache.get(config.channels.visitorWelcome);

            const member = interaction.member;

            // Update roles
            if (restrictorRole) await member.roles.remove(restrictorRole);
            if (visitorRole) await member.roles.add(visitorRole);
            if (envoyRole) await member.roles.remove(envoyRole);
            if (initiateRole) await member.roles.remove(initiateRole);

            // Reset the nickname to the user's default username
            try {
                await member.setNickname(null); // Clears the nickname, reverting to default username
                console.log(`Nickname cleared for ${member.user.tag}`);
            } catch (error) {
                console.error('Error clearing nickname:', error);
                return await interaction.reply({
                    content: 'Visitor role assigned, but I could not clear your nickname. Please contact an admin.',
                    ephemeral: true,
                });
            }

            // Update the user's nickname to include "Visitor"
            const suffix = ' | Visitor';
            let currentNickname = member.user.username;

            // Ensure the final nickname is 32 characters or fewer
            if (currentNickname.length + suffix.length > 32) {
                const maxNameLength = 32 - suffix.length; // Maximum allowable characters for the base name
                currentNickname = currentNickname.slice(0, maxNameLength).trim(); // Truncate and trim extra whitespace
            }

            const newNickname = `${currentNickname}${suffix}`;
            try {
                await member.setNickname(newNickname);
            } catch (error) {
                console.error('Error setting nickname:', error);
                return await interaction.reply({
                    content: 'Visitor role assigned, but I could not change your nickname. Please contact an admin.',
                    ephemeral: true,
                });
            }

            // Send a welcome message to the visitor channel
            if (visitorChannel) {
                await visitorChannel.send(
                    `👀 **${member.user}** is looking around. Welcome!`
                );
            }

            await interaction.reply({ content: 'You now have Visitor access!', ephemeral: true });

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
    },
};
