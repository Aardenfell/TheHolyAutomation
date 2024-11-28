/**
 * @file participation.js
 * @description Slash command for awarding participation rewards to multiple users.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
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

// Predefined participation types and their associated points
const participationTypes = {
    worldBoss: 1,
    archBoss: 5,
    boonRiftAttack: 8,
    boonRiftDefense: 10,
};

/**********************************************************************/
// Module Exports - Slash Command for Awarding Participation Rewards

module.exports = {
    // Define Slash command metadata
    data: new SlashCommandBuilder()
        .setName('participation')
        .setDescription('Award participation rewards to multiple users.')
        .addStringOption(option =>
            option
                .setName('type')
                .setDescription('The type of participation')
                .setRequired(true)
                .addChoices(
                    { name: 'World Boss', value: 'worldBoss' },
                    { name: 'Arch Boss', value: 'archBoss' },
                    { name: 'Boon/Rift Attack', value: 'boonRiftAttack' },
                    { name: 'Boon/Rift Defense', value: 'boonRiftDefense' }
                )
        )
        .addStringOption(option =>
            option.setName('participants')
                .setDescription('Space-separated list of user mentions or IDs.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for the participation rewards.')
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
        const participationType = interaction.options.getString('type');
        const reason = interaction.options.getString('reason') || `Rewards for participation in ${participationType}`;
        const participantsRaw = interaction.options.getString('participants');
        const participants = participantsRaw.split(/\s+/).map(p => p.trim()).filter(Boolean); // Split participants by whitespace, trim, and filter out empty values

        // Get points per user based on participation type
        const pointsPerUser = participationTypes[participationType];

        // Validate participation type
        if (!pointsPerUser) {
            return await interaction.reply({
                content: `Invalid participation type provided.`,
                ephemeral: true,
            });
        }

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
            const reserveBalance = await getUserBalance(client_id); // Get the current balance of the reserve (bot account)

            // Check if reserve has enough points
            if (reserveBalance < totalPoints) {
                return await interaction.reply({
                    content: `The reserve does not have enough points to complete this transaction. Available: ${reserveBalance}, Required: ${totalPoints}.`,
                    ephemeral: true,
                });
            }

            // Deduct points from the reserve
            await updateUserBalance(client_id, -totalPoints); // Update the reserve balance by deducting the total points

            // Distribute points to participants
            for (const participant of participants) {
                const userId = participant.replace(/[<@!>]/g, ''); // Extract user ID from mention or raw ID
                await updateUserBalance(userId, pointsPerUser); // Update each user's balance by adding the points per user
            }

            // Log the transaction
            await logTransaction(interaction.client, {
                senderId: client_id, // Sender is the bot's reserve
                recipientId: participants.map(p => p.replace(/[<@!>]/g, '')), // Extract user IDs from mentions
                amountPerRecipient: pointsPerUser, // Points given to each recipient
                totalAmount: totalPoints, // Total points distributed
                reason, // Reason for the reward
                timestamp: Math.floor(Date.now() / 1000), // Current timestamp in seconds
                type: 'participation_reward', // Type of transaction
            });

            // Create and send a summary embed
            const embed = new EmbedBuilder()
                .setColor('Random') // Set a random color for the embed
                .setTitle('Participation Rewards') // Title of the embed
                .setDescription(
                    `Successfully awarded **${pointsPerUser} points** to each participant.\n` +
                    `**Total Points Distributed**: ${totalPoints}\n` +
                    `**Reason**: ${reason}` // Summary of the points awarded and reason
                )
                .addFields(
                    { name: 'Participants', value: participants.map(p => `<@${p.replace(/[<@!>]/g, '')}>`).join(', ') } // List of participants
                );

            await interaction.reply({ embeds: [embed], ephemeral: true }); // Send the embed as a reply to the interaction
        } catch (error) {
            // Handle errors
            console.error('Error processing participation rewards:', error); // Log the error for debugging purposes
            await interaction.reply({
                content: 'An error occurred while processing the rewards. Please try again later.',
                ephemeral: true,
            }); // Inform the user about the error
        }
    },
};
