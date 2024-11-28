/**
 * @file closepoll.js
 * @description Handles the /closepoll command, which allows users to manually close an active poll.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { SlashCommandBuilder } = require('discord.js');
const pollHelpers = require('../../../utils/pollHelpers');
const fs = require('fs');
const path = require('path');

// Load configuration data
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const bossRaidSystemEnabled = config.systems.bossRaidSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Closing Polls

module.exports = {
    data: new SlashCommandBuilder()
        .setName('closepoll')
        .setDescription('Manually close an active poll.')
        .addStringOption(option =>
            option
                .setName('poll_id')
                .setDescription('The ID of the poll to close.')
                .setRequired(true)
        ),
    
    /**
     * @function execute
     * @description Execute function to handle the closing of a poll.
     * @param {object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        // Check if Boss Raid system is enabled
        if (!bossRaidSystemEnabled) {
            return await interaction.reply({
                content: 'The Boss Raid system is currently disabled.',
                ephemeral: true,
            });
        }
        
        // Retrieve poll ID from command options
        const pollId = interaction.options.getString('poll_id');
        const client = interaction.client;

        /**********************************************************************/
        // Load Poll Data and Validate Poll

        // Load poll data from storage
        const polls = pollHelpers.loadPollData();
        const pollIndex = polls.findIndex(p => p.pollId === pollId);

        // Check if the poll exists and is active
        if (pollIndex === -1 || !polls[pollIndex].active) {
            return interaction.reply({
                content: `Poll with ID **${pollId}** is either not active or does not exist.`,
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Close the Poll and Save Updates

        try {
            const poll = polls[pollIndex];

            // End the poll using helper function
            await pollHelpers.endPoll(client, poll.pollId, poll.channelId, poll.debug);

            // Mark the poll as inactive and save the updated data
            polls[pollIndex] = { ...poll, active: false };
            pollHelpers.savePollData(polls);

            // Confirm the poll has been closed
            await interaction.reply({
                content: `Poll **${pollId}** has been successfully closed.`,
                ephemeral: true,
            });
        } catch (error) {
            // Log the error and inform the user
            console.error(`Error closing poll ${pollId}:`, error);
            await interaction.reply({
                content: `An error occurred while closing the poll. Please try again later.`,
                ephemeral: true,
            });
        }
    },
};
