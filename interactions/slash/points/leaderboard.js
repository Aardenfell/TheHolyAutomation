/**
 * @file leaderboard.js
 * @description Shows a leaderboard of the top 10 users by points.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**********************************************************************/
// Paths to Data Files

const balancesPath = path.join(__dirname, '../../../data/pointsBalances.json');

// Load configuration settings
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Leaderboard

module.exports = {
    // Define slash command details
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Displays a leaderboard of users with the highest points balance.'),

    /**
     * @async
     * @function execute
     * @description Executes the leaderboard command to show top 10 users by points.
     * @param {object} interaction - The interaction object representing the command.
     */
    async execute(interaction) {
        /**********************************************************************/
        // Check System Status

        // Check if Guild Points system is enabled
        if (!guildPointsSystemEnabled) {
            return await interaction.reply({
                content: 'The Guild Points system is currently disabled.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Load User Balances

        // Declare a variable to hold user balances
        let userBalances;
        try {
            // Load and parse user balances from JSON file
            const data = JSON.parse(fs.readFileSync(balancesPath, 'utf-8'));
            userBalances = data.users;
        } catch (error) {
            // Handle file read or parsing errors
            console.error('Error reading user balances:', error);
            return await interaction.reply({
                content: 'An error occurred while retrieving the leaderboard. Please try again later.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Generate Leaderboard Data

        // Convert user balances to an array, sort by balance in descending order, and get the top 10 users
        const sortedBalances = Object.entries(userBalances)
            .map(([userId, { balance }]) => ({ userId, balance }))
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 10);

        // Format leaderboard entries for display
        const leaderboardDescription = sortedBalances.map((entry, index) =>
            `**${index + 1}.** <@${entry.userId}> - **${entry.balance}** points`
        ).join('\n');

        /**********************************************************************/
        // Create and Send Leaderboard Embed

        // Create an embed to display the leaderboard
        const leaderboardEmbed = new EmbedBuilder()
            .setColor('Random')
            .setTitle('Top 10 Points Leaderboard')
            .setDescription(leaderboardDescription || 'No data available.');

        // Reply with the leaderboard embed
        await interaction.reply({
            embeds: [leaderboardEmbed],
            ephemeral: false, // Visible to everyone in the channel
        });
    },
};
