/**
 * @file mint.js
 * @description Command to mint points from the reserve account to multiple recipients.
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

// Load configuration and check if Guild Points System is enabled
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Minting Points

module.exports = {
    // Slash command data
    data: new SlashCommandBuilder()
        .setName('mint')
        .setDescription('Mint points from the reserve to one or more users.')
        .addStringOption(option =>
            option.setName('recipients')
                .setDescription('Space-separated list of user mentions or IDs to mint points to.')
                .setRequired(true)
        )
        .addNumberOption(option =>
            option.setName('amount')
                .setDescription('The amount of points to mint per user.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('The reason for minting points.')
                .setRequired(false)
        ),

    /**
     * @function execute
     * @description Execute the mint command to distribute points to recipients.
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

        /**********************************************************************/
        // Retrieve Command Options

        const recipientsRaw = interaction.options.getString('recipients');
        const amountPerUser = interaction.options.getNumber('amount');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Process the recipients into an array of user IDs
        const recipients = recipientsRaw.split(/\s+/) // Split the input by whitespace to get individual mentions or IDs
            .map(r => r.replace(/[<@!>]/g, '').trim()) // Remove any mention formatting characters and trim whitespace
            .filter(Boolean); // Filter out any empty values that may have resulted from incorrect input

        // Ensure the mint amount is positive
        if (amountPerUser <= 0) {
            return await interaction.reply({
                content: 'Please enter an amount greater than zero.',
                ephemeral: true,
            });
        }

        // Check if any valid recipients are provided
        if (recipients.length === 0) {
            return await interaction.reply({
                content: 'No valid recipients provided. Please check your input.',
                ephemeral: true,
            });
        }

        // Calculate the total amount of points to be minted
        const totalAmount = amountPerUser * recipients.length;

        /**********************************************************************/
        // Mint Points to Recipients

        try {
            // Get the reserve balance to ensure there are enough points available
            const reserveBalance = await getUserBalance(client_id);

            // Check if the reserve has enough points to complete the mint operation
            if (reserveBalance < totalAmount) {
                return await interaction.reply({
                    content: `The reserve does not have enough points to complete this mint. Available: ${reserveBalance}, Required: ${totalAmount}.`,
                    ephemeral: true,
                });
            }

            // Deduct points from the reserve account
            await updateUserBalance(client_id, -totalAmount);

            // Loop through each recipient and add points to their balance
            for (const recipientId of recipients) {
                await updateUserBalance(recipientId, amountPerUser);
            }

            // Log the mint transaction for record-keeping
            await logTransaction(interaction.client, {
                senderId: client_id, // Sender is the bot's reserve account
                recipientId: recipients, // List of recipient user IDs
                amountPerRecipient: amountPerUser, // Amount given to each recipient
                totalAmount, // Total amount of points distributed
                reason, // Reason for minting the points
                timestamp: Math.floor(Date.now() / 1000), // Current timestamp in seconds
                type: 'mint', // Type of transaction
            });

            /**********************************************************************/
            // Reply with Mint Confirmation

            // Create the embed to display the mint details
            const mintEmbed = new EmbedBuilder()
                .setColor('Random') // Set a random color for the embed
                .setTitle('Points Mint Successful') // Title of the embed message
                .setDescription(`Successfully minted **${amountPerUser}** points to each participant.`) // Description of the mint operation
                .addFields(
                    { name: 'Total Points Minted', value: `${totalAmount}` }, // Total points minted
                    { name: 'Recipients', value: recipients.map(id => `<@${id}>`).join(', ') }, // List recipients as mentions
                    { name: 'Reason', value: reason } // Reason for the mint
                );

            // Reply to the user with the mint confirmation as an ephemeral message
            await interaction.reply({
                embeds: [mintEmbed], // Embed containing mint details
                ephemeral: true, // Make the message only visible to the user who ran the command
            });
        } catch (error) {
            // Handle any errors that occur during the mint process
            console.error('Error processing the mint:', error); // Log the error for debugging purposes
            return await interaction.reply({
                content: 'An error occurred while processing the mint. Please try again later.',
                ephemeral: true, // Make the error message only visible to the user
            });
        }
    },
};
