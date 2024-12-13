/**
 * @file kills.js
 * @description Slash command for awarding kill rewards based on contribution brackets and optional class modifiers.
 * @author Aardenfell
 * @since 2.6.0
 * @version 2.6.0
 */

/**********************************************************************/
// Required Modules

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { client_id } = require('../../../config.json');
const { updateUserBalance, getUserBalance, logTransaction } = require('../../../utils/pointsHelper');
const fs = require('fs');
const path = require('path');

// Load configuration and check if Guild Points System is enabled
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Awarding Kill Rewards

module.exports = {
    // Define Slash command metadata
    data: new SlashCommandBuilder()
        .setName('kills')
        .setDescription('Award kill rewards based on contribution brackets.')
        .addStringOption(option =>
            option
                .setName('bracket')
                .setDescription('The kill bracket (e.g., 10, 20, 30).')
                .setRequired(true)
                .addChoices(
                    { name: '10', value: '10' },
                    { name: '20', value: '20' },
                    { name: '30', value: '30' },
                    { name: '40', value: '40' },
                    { name: '50', value: '50' },
                    { name: '60', value: '60' },
                    { name: '70', value: '70' },
                    { name: '80', value: '80' },
                    { name: '90', value: '90' },
                    { name: '100+', value: '100+' }
                )
        )
        .addStringOption(option =>
            option
                .setName('participants')
                .setDescription('Space-separated list of user mentions or IDs.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('class')
                .setDescription('Class modifier for kill rewards (Tank or Healer).')
                .addChoices(
                    { name: 'Tank', value: 'tank' },
                    { name: 'Healer', value: 'healer' }
                )
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the kill rewards.')
                .setRequired(false)
        ),

    // Execute command logic
    async execute(interaction) {
        // Check if Guild Points system is enabled
        if (!guildPointsSystemEnabled) {
            return await interaction.reply({
                content: 'The Guild Points system is currently disabled.',
                ephemeral: true,
            });
        }

        // Retrieve command options
        const bracket = interaction.options.getString('bracket');
        const reason = interaction.options.getString('reason') || `Rewards for kill contributions in bracket ${bracket}`;
        const participantsRaw = interaction.options.getString('participants');
        const classModifier = interaction.options.getString('class');
        const participants = participantsRaw.split(/\s+/).map(p => p.trim()).filter(Boolean);

        // Define base points multiplier
        const baseMultiplier = parseInt(bracket, 10) || 100;
        const classMultipliers = {
            tank: 0.2,
            healer: 0.3,
            default: 0.1,
        };

        // Determine multiplier based on class
        const multiplier = classMultipliers[classModifier] || classMultipliers.default;

        // Calculate points per user
        const pointsPerUser = baseMultiplier * multiplier;

        // Validate participants
        if (participants.length === 0) {
            return await interaction.reply({
                content: 'No participants provided.',
                ephemeral: true,
            });
        }

        try {
            // Calculate total points required
            const totalPoints = pointsPerUser * participants.length;
            const reserveBalance = await getUserBalance(client_id);

            // Check if reserve has enough points
            if (reserveBalance < totalPoints) {
                return await interaction.reply({
                    content: `The reserve does not have enough points to complete this transaction. Available: ${reserveBalance}, Required: ${totalPoints}.`,
                    ephemeral: true,
                });
            }

            // Deduct points from the reserve
            await updateUserBalance(client_id, -totalPoints);

            // Distribute points to participants
            for (const participant of participants) {
                const userId = participant.replace(/[<@!>]/g, '');
                await updateUserBalance(userId, pointsPerUser);
            }

            // Log the transaction
            await logTransaction(interaction.client, {
                senderId: client_id,
                recipientId: participants.map(p => p.replace(/[<@!>]/g, '')),
                amountPerRecipient: pointsPerUser,
                totalAmount: totalPoints,
                reason,
                timestamp: Math.floor(Date.now() / 1000),
                type: 'kill_reward',
            });

            // Create and send a summary embed
            const embed = new EmbedBuilder()
                .setColor('Random')
                .setTitle('Kill Rewards')
                .setDescription(
                    `Successfully awarded **${pointsPerUser.toFixed(1)} points** to each participant.\n` +
                    `**Total Points Distributed**: ${totalPoints.toFixed(1)}\n` +
                    `**Reason**: ${reason}`
                )
                .addFields(
                    { name: 'Participants', value: participants.map(p => `<@${p.replace(/[<@!>]/g, '')}>`).join(', ') },
                    { name: 'Bracket', value: `${bracket}`, inline: true },
                    { name: 'Class Modifier', value: `${classModifier || 'Default'}`, inline: true }
                );

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error) {
            // Handle errors
            console.error('Error processing kill rewards:', error);
            await interaction.reply({
                content: 'An error occurred while processing the rewards. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
