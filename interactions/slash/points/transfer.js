/**
 * @file transfer.js
 * @description Handles the /transfer slash command for transferring points to one or more users.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { getUserBalance, updateUserBalance, logTransaction } = require('../../../utils/pointsHelper');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Transfering Points

module.exports = {
    // Slash command data definition
    data: new SlashCommandBuilder()
        .setName('transfer')
        .setDescription('Transfer points to one or more users.')
        .addStringOption(option =>
            option.setName('recipients')
                .setDescription('Space-separated list of user mentions or IDs to transfer points to.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount of points to transfer to each recipient.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason you are sending points.')
                .setRequired(false)
        ),

    /**
     * @function execute
     * @description Execute the transfer command.
     * @param {import('discord.js').CommandInteraction} interaction - The interaction object.
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

        const senderId = interaction.user.id;
        const recipientsRaw = interaction.options.getString('recipients');
        const amount = interaction.options.getNumber('amount');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Process the recipients input into an array of user IDs
        const recipientIds = recipientsRaw.split(/\s+/).map(r => r.replace(/[<@!>]/g, '')).filter(Boolean);

        // Prevent users from sending points to themselves
        if (recipientIds.includes(senderId)) {
            return await interaction.reply({
                content: 'You cannot transfer points to yourself.',
                ephemeral: true,
            });
        }

        // Ensure the transfer amount is positive
        if (amount <= 0) {
            return await interaction.reply({
                content: 'Please enter an amount greater than zero.',
                ephemeral: true,
            });
        }

        // Ensure there are valid recipients
        if (recipientIds.length === 0) {
            return await interaction.reply({
                content: 'No valid recipients provided.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Process Transfer

        try {
            const totalAmount = amount * recipientIds.length;
            const senderBalance = await getUserBalance(senderId);

            // Check if the sender has enough points
            if (senderBalance < totalAmount) {
                return await interaction.reply({
                    content: `You do not have enough points to complete this transfer. Available: ${senderBalance}, Required: ${totalAmount}.`,
                    ephemeral: true,
                });
            }

            // Deduct points from the sender
            await updateUserBalance(senderId, -totalAmount);

            // Add points to each recipient
            for (const recipientId of recipientIds) {
                await updateUserBalance(recipientId, amount);
            }

            // Log the transaction as a single entry
            await logTransaction(interaction.client, {
                senderId,
                recipientId: recipientIds, // Pass multiple recipients
                amountPerRecipient: amount,
                totalAmount,
                reason,
                timestamp: Math.floor(Date.now() / 1000),
                type: 'transfer',
            });

            /**********************************************************************/
            // Create Transfer Embed and Reply

            const transferEmbed = new EmbedBuilder()
                .setColor('Random')
                .setTitle('Points Transfer Successful')
                .setDescription(
                    `You have successfully transferred **${amount} points** to each recipient.\n` +
                    `**Total Points Transferred**: ${totalAmount}`
                )
                .addFields(
                    { name: 'Recipients', value: recipientIds.map(id => `<@${id}>`).join(', ') },
                    { name: 'Reason', value: reason }
                );

            // Reply to the user with the transfer confirmation as an ephemeral message
            await interaction.reply({
                embeds: [transferEmbed],
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error processing the transfer:', error);
            return await interaction.reply({
                content: 'An error occurred while processing the transfer. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
