/**
 * @file burn.js
 * @description Command to burn points from specified users and optionally add them back to the reserve.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { client_id } = require('../../../config.json');
const { updateUserBalance, getUserBalance, logTransaction } = require('../../../utils/pointsHelper');
const fs = require('fs');
const path = require('path');

// Load configuration file and check if Guild Points System is enabled
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Burning Points

module.exports = {
    // Define command data using SlashCommandBuilder
    data: new SlashCommandBuilder()
        .setName('burn')
        .setDescription('Burn points from one or more users or add them back to the reserve.')
        .addStringOption(option =>
            option.setName('users')
                .setDescription('Space-separated list of user mentions or IDs to burn points from.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount of points to burn from each user.')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('return_to_reserve')
                .setDescription('Whether to return the points to the reserve.')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for burning points.')
                .setRequired(false)
        ),

    /**
     * @function execute
     * @description Executes the burn command, deducting points from users and optionally returning them to the reserve.
     * @param {import('discord.js').CommandInteraction} interaction - The interaction object representing the command.
     */
    async execute(interaction) {
        // Check if Guild Points system is enabled
        if (!guildPointsSystemEnabled) {
            return await interaction.reply({
                content: 'The Guild Points system is currently disabled.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Extract Options from Interaction

        const usersRaw = interaction.options.getString('users');
        const amount = interaction.options.getNumber('amount');
        const returnToReserve = interaction.options.getBoolean('return_to_reserve') ?? true;
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Parse user mentions or IDs into an array of user IDs
        const userIds = usersRaw.split(/\s+/).map(u => u.replace(/[<@!>]/g, '')).filter(Boolean);

        if (userIds.length === 0) {
            return await interaction.reply({
                content: 'No valid users provided.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Process Burn Command for Each User

        try {
            const totalAmount = amount * userIds.length;

            // Validate user balances and update for each user
            for (const userId of userIds) {
                const userBalance = await getUserBalance(userId);

                if (userBalance < amount) {
                    return await interaction.reply({
                        content: `<@${userId}> does not have enough points to complete the burn.`,
                        ephemeral: true,
                    });
                }

                // Deduct points from the user
                await updateUserBalance(userId, -amount);
            }

            /**********************************************************************/
            // Return Points to Reserve if Specified

            if (returnToReserve) {
                await updateUserBalance(client_id, totalAmount);
            }

            /**********************************************************************/
            // Log the Transaction

            await logTransaction(interaction.client, {
                senderId: userIds, // Multiple senders
                recipientId: returnToReserve ? client_id : 'burn',
                amountPerRecipient: amount,
                totalAmount,
                reason,
                timestamp: Math.floor(Date.now() / 1000),
                type: 'burn',
            });

            /**********************************************************************/
            // Create Embed Response for Burn Details

            const burnEmbed = new EmbedBuilder()
                .setColor('Random')
                .setTitle('Points Burn Successful')
                .setDescription(
                    `Successfully burned **${amount} points** from each user.\n` +
                    `**Total Points Burned**: ${totalAmount}`
                )
                .addFields(
                    { name: 'Users', value: userIds.map(id => `<@${id}>`).join(', ') },
                    { name: 'Reason', value: reason },
                    { name: 'Returned to Reserve', value: returnToReserve ? 'Yes' : 'No' }
                );

            // Send the embed response
            await interaction.reply({
                embeds: [burnEmbed],
                ephemeral: true,
            });
        } catch (error) {
            /**********************************************************************/
            // Handle Errors During Execution

            console.error('Error processing the burn:', error);
            await interaction.reply({
                content: 'An error occurred while processing the burn. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
