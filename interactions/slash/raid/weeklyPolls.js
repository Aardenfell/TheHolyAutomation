/**
 * @file weeklyPolls.js
 * @description This command allows users to start a poll to select bosses for the weekly raid. Users can provide various options such as poll duration, debug mode, and override raid days and counts.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { SlashCommandBuilder } = require('discord.js');
const pollHelpers = require('../../../utils/pollHelpers.js');
const fs = require('fs');
const path = require('path');

// Load configuration and boss data
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const bossRaidSystemEnabled = config.systems.bossRaidSystem || false;
const bossesPath = path.join(__dirname, '../../../data/bosses.json');

/**********************************************************************/
// Module Exports - Slash Command for Weekly Boss Poll

module.exports = {
    // Define slash command details and options
    data: new SlashCommandBuilder()
        .setName('weeklybosspoll')
        .setDescription('Starts a poll to select bosses for the weekly raid.')
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Poll duration in hours (default 12)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('debug')
                .setDescription('Run in debug mode (shorter duration, fewer bosses)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('days')
                .setDescription('Override raid days (comma-separated, e.g., "Friday,Saturday,Sunday")')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('counts')
                .setDescription('Override raid counts for days (comma-separated, e.g., "2,3,1")')
                .setRequired(false)
        ),

    /**
     * @async
     * @function execute
     * @description Executes the weekly boss poll command.
     * @param {CommandInteraction} interaction The interaction object for the command.
     */
    async execute(interaction) {
        /**********************************************************************/
        // Check if Boss Raid system is enabled

        if (!bossRaidSystemEnabled) {
            return await interaction.reply({
                content: 'The Boss Raid system is currently disabled.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Extract and Validate Options from Interaction

        const debugMode = interaction.options.getBoolean('debug') || false;
        const duration = debugMode ? 0.02 : (interaction.options.getInteger('duration') || 12); // Default 12 hours
        const overrideDays = interaction.options.getString('days')?.split(',').map(day => day.trim());
        const overrideCounts = interaction.options.getString('counts')?.split(',').map(count => parseInt(count.trim(), 10));

        // Validate override inputs
        if (overrideCounts && overrideDays && overrideDays.length !== overrideCounts.length) {
            return interaction.reply({
                content: 'The number of override days and counts must match!',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Load Bosses Data from JSON File

        const bossesData = JSON.parse(fs.readFileSync(bossesPath, 'utf8'));
        const bosses = debugMode ? bossesData.slice(0, 5) : bossesData;

        /**********************************************************************/
        // Start the Poll

        // Send an initial acknowledgment to the user
        await interaction.reply({
            content: 'Starting the poll... please wait!',
            ephemeral: true,
        });

        // Use pollHelpers utility to create and manage the poll
        pollHelpers.startPoll(interaction.client, {
            bosses,
            duration,
            channelId: interaction.channel.id,
            debug: debugMode,
            overrideDays,
            overrideCounts,
        });
    },
};
