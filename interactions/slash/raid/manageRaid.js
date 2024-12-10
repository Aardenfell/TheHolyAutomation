/**
 * @file manageRaid.js
 * @description Utility command to manage raid events, such as viewing details, adding/removing participants, or managing open raids.
 * @author Aardenfell
 * @version 2.2.0
 * @since 2.2.0
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Paths to data files
const raidSignUpsPath = path.join(__dirname, '../../../data/raidSignUps.json');
const pollDataPath = path.join(__dirname, '../../../data/weeklyPolls.json');

// Helper functions to load and save data
const loadJsonData = (filePath) => {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8')) || [];
    } catch (error) {
        console.error(`Failed to load data from ${filePath}:`, error);
        return [];
    }
};

const saveJsonData = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(`Failed to save data to ${filePath}:`, error);
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manageraid')
        .setDescription('Utility command to manage raids (view, add/remove signed-in users).')
        .addStringOption(option =>
            option.setName('raid_id')
                .setDescription('ID of the raid to manage or view. Use "all" to view all open raids.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform (add, remove, view).')
                .setRequired(true)
                .addChoices(
                    { name: 'View', value: 'view' },
                    { name: 'Add User', value: 'add' },
                    { name: 'Remove User', value: 'remove' }
                )
        )
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add or remove (required for add/remove actions).')
                .setRequired(false)
        ),

    async execute(interaction) {
        const raidId = interaction.options.getString('raid_id');
        const action = interaction.options.getString('action');
        const user = interaction.options.getUser('user');

        // Load data
        const raidData = loadJsonData(raidSignUpsPath);
        const pollData = loadJsonData(pollDataPath);

        if (action === 'view') {
            if (raidId === 'all') {
                // Display all open raids
                const openRaids = raidData.filter(raid => !raid.closed);
                if (openRaids.length === 0) {
                    return interaction.reply({ content: 'No open raids found.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setTitle('Open Raids')
                    .setDescription(
                        openRaids.map(raid =>
                            `**Day:** ${raid.day}\n` +
                            `**Message ID:** ${raid.messageId}\n` +
                            `**Poll ID:** ${raid.pollId}\n` +
                            `**Signed In Users:** ${raid.signedIn.length}\n` +
                            `**Locked:** ${raid.locked ? 'Yes' : 'No'}\n`
                        ).join('\n\n')
                    )
                    .setColor('Blue');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                // View a specific raid's details
                const raid = raidData.find(r => r.messageId === raidId);
                if (!raid) {
                    return interaction.reply({ content: `Raid with ID ${raidId} not found.`, ephemeral: true });
                }

                const poll = pollData.find(p => p.pollId === raid.pollId);

                const embed = new EmbedBuilder()
                    .setTitle(`Raid Details: ${raid.day}`)
                    .addFields(
                        { name: 'Message ID', value: raid.messageId, inline: true },
                        { name: 'Poll ID', value: raid.pollId, inline: true },
                        { name: 'Message Link', value: `<#${raid.messageId}>` || 'N/A', inline: true },
                        { name: 'Password', value: raid.password, inline: true },
                        { name: 'Locked', value: raid.locked ? 'Yes' : 'No', inline: true },
                        { name: 'Closed', value: raid.closed ? 'Yes' : 'No', inline: true },
                        { name: 'Signed In Users', value: raid.signedIn.map(u => `<@${u}>`).join(', ') || 'None' }
                    )
                    .setDescription(
                        poll
                            ? `**Poll Data:**\n` +
                              poll.bosses.map(boss =>
                                  `**${boss.name}** - Votes: ${boss.votes}, Voters: ${boss.voters.map(u => `<@${u}>`).join(', ') || 'None'}`
                              ).join('\n')
                            : 'No poll data available.'
                    )
                    .setColor('Random');
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }

        // Find the specified raid for add/remove actions
        const raid = raidData.find(r => r.messageId === raidId);
        if (!raid) {
            return interaction.reply({ content: `Raid with ID ${raidId} not found.`, ephemeral: true });
        }

        if (action === 'add') {
            if (!user) {
                return interaction.reply({ content: 'Please specify a user to add.', ephemeral: true });
            }
            if (raid.signedIn.includes(user.id)) {
                return interaction.reply({ content: `<@${user.id}> is already signed in for this raid.`, ephemeral: true });
            }

            raid.signedIn.push(user.id);
            saveJsonData(raidSignUpsPath, raidData);

            return interaction.reply({
                content: `<@${user.id}> has been added to the signed-in users for this raid.`,
                ephemeral: true,
            });
        }

        if (action === 'remove') {
            if (!user) {
                return interaction.reply({ content: 'Please specify a user to remove.', ephemeral: true });
            }
            if (!raid.signedIn.includes(user.id)) {
                return interaction.reply({ content: `<@${user.id}> is not signed in for this raid.`, ephemeral: true });
            }

            raid.signedIn = raid.signedIn.filter(u => u !== user.id);
            saveJsonData(raidSignUpsPath, raidData);

            return interaction.reply({
                content: `<@${user.id}> has been removed from the signed-in users for this raid.`,
                ephemeral: true,
            });
        }
    },
};
