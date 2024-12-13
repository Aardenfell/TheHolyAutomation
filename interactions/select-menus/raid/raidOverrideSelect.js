/**
 * @file raidOverrideSelect.js
 * @description Handles override select menu logic for assigning bosses to raid runs in Discord raid events.
 * @author Aardenfell
 * @since 2.3.0
 * @version 2.5.0
 */

/**********************************************************************/
// Required Modules and Utilities

const { EmbedBuilder } = require('discord.js');
const { buildOverrideEmbed } = require('../../buttons/raid/pollInteractionButtons.js');
const pollHelpers = require('../../../utils/pollHelpers.js');
const path = require('path');
const fs = require('fs');

// Path to raid sign-ups data
const signUpDataPath = path.join(__dirname, '../../../data/raidSignUps.json');

/**********************************************************************/
// Helper Functions

/**
 * @function loadSignUpData
 * @description Loads raid sign-up data from the JSON file.
 * @returns {Array} The sign-up data array.
 */
const loadSignUpData = () => {
    try {
        return JSON.parse(fs.readFileSync(signUpDataPath, 'utf8')) || [];
    } catch (error) {
        console.error('Failed to load sign-up data:', error);
        return [];
    }
};

/**
 * @function saveSignUpData
 * @description Saves raid sign-up data to the JSON file.
 * @param {Array} data - The data to save.
 */
const saveSignUpData = (data) => {
    try {
        fs.writeFileSync(signUpDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save sign-up data:', error);
    }
};

/**********************************************************************/
// Interaction Handler

module.exports = {
    id: /^override_select_/, // Match all interactions starting with "override_select_"

    /**
     * @function execute
     * @description Handles the override select menu logic for assigning bosses to raid runs.
     * @param {import('discord.js').SelectMenuInteraction} interaction - The interaction object.
     */
    async execute(interaction) {
        console.log('Executing override select menu handler.');
        console.log('Interaction customId:', interaction.customId);

        // Parse interaction details
        const [prefix, selectType, raidDay, runIndex, messageId] = interaction.customId.split('_');

        // Load relevant data
        const signUpData = loadSignUpData();
        const dayData = signUpData.find(data => data.messageId === messageId);

        if (!dayData) {
            console.error('Day data not found for messageId:', messageId);
            return interaction.reply({
                content: 'Unable to find data for this raid day.',
                ephemeral: true,
            });
        }

        const poll = pollHelpers.loadPollData().find(p => p.pollId === dayData.pollId);

        if (!poll) {
            console.error('Poll data not found.');
            return interaction.reply({
                content: 'Unable to find poll data for this raid.',
                ephemeral: true,
            });
        }

        const selectedBoss = interaction.values[0];
        const runs = poll.dayRaidCounts?.[raidDay] || 1;

        console.log('Selected boss:', selectedBoss);
        console.log('Raid day:', raidDay);
        console.log('Run index:', runIndex);

        const index = parseInt(runIndex, 10);
        if (isNaN(index) || index < 0 || index >= runs) {
            console.error('Invalid run index:', runIndex);
            return interaction.reply({
                content: 'Invalid run selection. Please contact an admin.',
                ephemeral: true,
            });
        }

        // Ensure dayData.selectedBosses is initialized
        if (!Array.isArray(dayData.selectedBosses)) {
            dayData.selectedBosses = Array(runs).fill('matchmake');
        }

        // Update the selected boss for the specific run
        dayData.selectedBosses[index] = selectedBoss;

        // Save the updated data
        saveSignUpData(signUpData);

        // Generate display data
        const votedBosses = poll.bosses
            .filter(boss => boss.voters.length > 0)
            .map(boss => `**${boss.name}** - Voters: ${boss.voters.map(voter => `<@${voter}>`).join(', ')}`)
            .join('\n') || 'No votes yet.';

        const signedInUsers = dayData.signedIn
            .map(userId => `<@${userId}>`)
            .join(', ') || 'No users signed in yet.';

        // Create an enhanced embed summarizing the overrides and additional data
        const overrideEmbed = new EmbedBuilder()
            .setTitle(`⚙️ Override Settings | ${raidDay}`)
            .setDescription(
                `Use the menus below to override the bosses for this raid day or select "Matchmake" for automated matchmaking.\n\n` +
                `**Override Selections:**\n` +
                dayData.selectedBosses
                    .map((boss, idx) => `Run ${idx + 1}: **${boss === 'matchmake' ? 'Matchmake' : boss}**`)
                    .join('\n') +
                `\n\n**Voted Bosses:**\n${votedBosses}\n\n` +
                `**Currently Signed In:**\n${signedInUsers}`
            )
            .setColor('Yellow');

        // Update the interaction message
        await interaction.update({
            content: "",
            embeds: [buildOverrideEmbed(raidDay, poll, dayData)],
            components: interaction.message.components, // Retain original components
        });

        console.log('Override selections updated successfully.');
    },
};
