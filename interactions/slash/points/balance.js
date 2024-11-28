/**
 * @file balance.js
 * @description This command allows users to check their current point balance using the guild points system.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getUserBalance } = require('../../../utils/pointsHelper');
const fs = require('fs');
const path = require('path');

/**********************************************************************/
// Load Configuration Settings

// Load configuration settings from config file
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));

// Check if Guild Points System is enabled
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Checking Balance

module.exports = {
    // Slash command metadata
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current balance of points.'),

    /**
     * @async
     * @function execute
     * @description Executes the balance command to show the user's current point balance.
     * @param {import('discord.js').CommandInteraction} interaction - The interaction object representing the slash command.
     */
    async execute(interaction) {
        /**********************************************************************/
        // Verify if the Guild Points System is Active

        if (!guildPointsSystemEnabled) {
            return await interaction.reply({
                content: 'The Guild Points system is currently disabled.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Retrieve User Balance

        // Extract user ID from the interaction
        const userId = interaction.user.id;

        // Retrieve user's balance from the database
        let balance;
        try {
            balance = await getUserBalance(userId);
        } catch (error) {
            console.error('Error retrieving user balance:', error);
            return await interaction.reply({
                content: 'An error occurred while retrieving your balance. Please try again later.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Reply with User Balance Embed

        // Create an embed message to display the user's balance
        const balanceEmbed = new EmbedBuilder()
            .setColor('Random')
            .setTitle('Your Current Balance')
            .setDescription(`You currently have **${balance}** points.`);

        // Reply to the interaction with the user's balance (ephemeral)
        await interaction.reply({
            embeds: [balanceEmbed],
            ephemeral: true,
        });
    },
};
