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
// Helper Functions 

/**
 * @function getMultiplierByRole
 * @description Determines the multiplier for a user based on their weapon roles.
 * @param {GuildMember} member - The Discord guild member object.
 * @returns {number} The multiplier for the user's role: 0.1 (default), 0.2 (Tank), or 0.3 (Healer).
 */
function getMultiplierByRole(member) {
    // Role criteria for tanks and healers
    const tankCriteria = /Sword & Shield/; // Matches "Sword & Shield/Wep2" or "Wep1/Sword & Shield/"
    const healerCriteria = /Longbow\/Wand & Tome/; // Matches "Longbow/Wand & Tome"

    // Iterate through the member's roles
    for (const role of member.roles.cache.values()) {
        const roleName = role.name;

        // Check for Tank criteria
        if (tankCriteria.test(roleName)) {
            return 0.2;
        }

        // Check for Healer criteria
        if (healerCriteria.test(roleName)) {
            return 0.3;
        }
    }

    // Default multiplier
    return 0.1;
}


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
        const participants = participantsRaw.split(/\s+/).map(p => p.trim()).filter(Boolean);
    
        // Define base points for the bracket
        const basePoints = parseInt(bracket, 10) || 100;
    
        // Validate participants
        if (participants.length === 0) {
            return await interaction.reply({
                content: 'No participants provided.',
                ephemeral: true,
            });
        }
        
        const MAX_POINTS = 10;

        try {
            const guild = interaction.guild;
            const participantDetails = [];
    
            // Determine points per user based on their roles
            for (const participant of participants) {
                const userId = participant.replace(/[<@!>]/g, '');
                const member = await guild.members.fetch(userId);
                const multiplier = getMultiplierByRole(member); // Dynamically fetch the multiplier based on roles
                let points = basePoints * multiplier;

                if (points > MAX_POINTS) {
                    points = MAX_POINTS;
                }
    
                participantDetails.push({ userId, points });
            }
    
            // Calculate total points required
            const totalPoints = participantDetails.reduce((sum, detail) => sum + detail.points, 0);
            const reserveBalance = await getUserBalance(client_id);
    
            // Check if reserve has enough points
            if (reserveBalance < totalPoints) {
                return await interaction.reply({
                    content: `The reserve does not have enough points to complete this transaction. Available: ${reserveBalance}, Required: ${totalPoints.toFixed(1)}.`,
                    ephemeral: true,
                });
            }
    
            // Deduct points from the reserve
            await updateUserBalance(client_id, -totalPoints);
    
            // Distribute points to participants
            for (const { userId, points } of participantDetails) {
                await updateUserBalance(userId, points);
            }
    
            // Log the transaction
            await logTransaction(interaction.client, {
                senderId: client_id,
                recipientId: participantDetails.map(detail => detail.userId),
                amountPerRecipient: participantDetails.map(detail => detail.points),
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
                    `Successfully distributed kill rewards.\n\n` +
                    `**Total Points Distributed**: ${totalPoints.toFixed(1)}\n` +
                    `**Reason**: ${reason}`
                )
                .addFields(
                    { name: 'Participants', value: participantDetails.map(detail => `<@${detail.userId}>: ${detail.points.toFixed(1)} points`).join('\n') },
                    { name: 'Bracket', value: `${bracket}`, inline: true }
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
    }
}