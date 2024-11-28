/**
 * @file transactionhistory.js
 * @description Displays a user's recent points transactions in the guild.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Paths to JSON data files
const transactionsPath = path.join(__dirname, '../../../data/pointsTransactions.json');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Transaction History

module.exports = {
    // Define slash command data
    data: new SlashCommandBuilder()
        .setName('transactionhistory')
        .setDescription("Displays your recent transactions.")
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription("The number of recent transactions to display (default is 5)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10)),

    /**
     * @function execute
     * @description Executes the transaction history command.
     * @param {object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        // Check if Guild Points system is enabled
        if (!guildPointsSystemEnabled) {
            return await interaction.reply({
                content: 'The Guild Points system is currently disabled.',
                ephemeral: true,
            });
        }

        // Get user ID and limit option from interaction
        const userId = interaction.user.id;
        const limit = interaction.options.getInteger('limit') || 5;

        let transactions;
        try {
            // Load and parse transactions from JSON file
            const data = JSON.parse(fs.readFileSync(transactionsPath, 'utf-8'));
            transactions = data.transactions || [];
        } catch (error) {
            console.error('Error reading transaction history:', error);
            return await interaction.reply({
                content: 'An error occurred while retrieving your transaction history. Please try again later.',
                ephemeral: true,
            });
        }

        // Filter transactions involving the user (as sender or recipient)
        const userTransactions = transactions
            .filter(tx => {
                const fromArray = Array.isArray(tx.from) ? tx.from : [tx.from];
                const toArray = Array.isArray(tx.to) ? tx.to : [tx.to];
                return fromArray.includes(userId) || toArray.includes(userId);
            })
            .slice(-limit); // Get the most recent transactions up to the limit

        // Format transaction history for display
        const transactionDescription = userTransactions.map((tx, index) => {
            const date = new Date(tx.timestamp * 1000).toLocaleString();
            
            const senderList = Array.isArray(tx.from) 
                ? tx.from.map(id => `<@${id}>`).join(', ') 
                : `<@${tx.from}>`;

            const recipientList = Array.isArray(tx.to) 
                ? tx.to.map(id => `<@${id}>`).join(', ') 
                : `<@${tx.to}>`;

            return `**${index + 1}.** ${senderList} ➔ ${recipientList}\n` +
                   `**Amount:** ${tx.amount} per recipient (${tx.totalAmount || tx.amount} total)\n` +
                   `**Reason:** ${tx.reason || 'No reason provided'}\n` +
                   `**Date:** ${date}`;
        }).join('\n\n');

        // Create the transaction history embed
        const historyEmbed = new EmbedBuilder()
            .setColor('Random')
            .setTitle('Transaction History')
            .setDescription(transactionDescription || 'No transaction history available.')
            .setFooter({ text: `Showing up to ${limit} recent transactions` });

        // Reply with the transaction history embed
        await interaction.reply({
            embeds: [historyEmbed],
            ephemeral: true, // Only visible to the user
        });
    },
};
