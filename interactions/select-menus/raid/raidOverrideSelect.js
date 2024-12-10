/**
 * @file raidOverrideSelect.js
 * @description Handles the logic for the override select menu for raid polls.
 * @author Aardenfell
 * @since 2.2.0
 * @version 2.2.0
 */

const { EmbedBuilder } = require('discord.js');
const pollHelpers = require('../../../utils/pollHelpers.js');
const config = require('../../../config.json');
const path = require('path');
const fs = require('fs');

// Path to raid sign-ups data
const signUpDataPath = path.join(__dirname, '../../../data/raidSignUps.json');

// Helper functions to load and save data
const loadSignUpData = () => {
    try {
        return JSON.parse(fs.readFileSync(signUpDataPath, 'utf8')) || [];
    } catch (error) {
        console.error('Failed to load sign-up data:', error);
        return [];
    }
};

const saveSignUpData = (data) => {
    try {
        fs.writeFileSync(signUpDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save sign-up data:', error);
    }
};

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

        const [prefix, selectType, raidDayOrRun] = interaction.customId.split('_');
        let raidDay, runIndex;

        if (prefix === 'override' && selectType === 'select') {
            raidDay = raidDayOrRun;
            runIndex = interaction.customId.split('_').pop(); // Get the last part as runIndex
        } else {
            raidDay = selectType;
            runIndex = raidDayOrRun;
        }

        const messageId = interaction.message.reference?.messageId || interaction.message.id;

        // Load data
        const signUpData = loadSignUpData();
        const dayData = signUpData.find(data => data.messageId === messageId);
        const poll = dayData ? pollHelpers.loadPollData().find(p => p.pollId === dayData.pollId) : null;

        if (!dayData || !poll) {
            console.error('Day data or poll not found.', { dayData, poll });
            return interaction.reply({
                content: 'Unable to find data for this raid day or poll.',
                ephemeral: true,
            });
        }

        const selectedBoss = interaction.values[0];
        const runs = poll.dayRaidCounts?.[raidDay] || 1;

        console.log('Selected boss:', selectedBoss);
        console.log('Raid day:', raidDay);
        console.log('Run index:', runIndex);

        // Ensure dayData.selectedBosses is initialized correctly
        if (!Array.isArray(dayData.selectedBosses)) {
            dayData.selectedBosses = Array(runs).fill('matchmake');
        }

        const index = parseInt(runIndex, 10); // Ensure index is an integer
        if (isNaN(index) || index < 0 || index >= runs) {
            console.error('Invalid run index:', runIndex);
            return interaction.reply({
                content: 'Invalid run selection. Please contact an admin.',
                ephemeral: true,
            });
        }

        // Update the selected boss for the specific run
        dayData.selectedBosses[index] = selectedBoss;

        // Save the updated data
        saveSignUpData(signUpData);

        // Fetch voted bosses with voters
        const votedBosses = poll.bosses
            .filter(boss => boss.voters.length > 0)
            .map(boss => `**${boss.name}** - Voters: ${boss.voters.map(voter => `<@${voter}>`).join(', ')}`)
            .join('\n') || 'No votes yet.';

        // Fetch signed-in users
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

        // Update the message with the enhanced embed
        await interaction.update({
            content: "",
            embeds: [overrideEmbed],
            components: interaction.message.components, // Retain the original components
        });

        console.log('Override selections updated successfully.');
    },
};
