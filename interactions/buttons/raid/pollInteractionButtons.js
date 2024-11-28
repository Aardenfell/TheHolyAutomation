/**
 * @file pollInteractionHandler.js
 * @description Handles button interactions for raid day sign-up, sign-in, and administrative actions like lock/unlock and close.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const pollHelpers = require('../../../utils/pollHelpers.js');

// Load configuration from config.json
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));

// Paths to data files
const signUpDataPath = path.join(__dirname, '../../../data/raidSignUps.json');

// Role and Channel IDs from configuration
const ALLOWED_ROLE_ID = config.roles.raidStaff;
const SUPPORT_THREAD_ID = config.channels.raidSupportThread;

/**********************************************************************/
// Helper Functions - Load and Save Data

/**
 * @function loadSignUpData
 * @description Load sign-up data from the JSON file.
 * @returns {Array} Array of sign-up data objects.
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
 * @description Save sign-up data to the JSON file.
 * @param {Array} data - The sign-up data to save.
 */
const saveSignUpData = (data) => {
    try {
        fs.writeFileSync(signUpDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Failed to save sign-up data:', error);
    }
};

/**********************************************************************/
// Helper Function - Thread Management

/**
 * @function getOrCreateThread
 * @description Fetch an existing thread or create a new one.
 * @param {object} interaction - The interaction object from Discord.
 * @param {string} threadName - The name of the thread.
 * @returns {Promise<object|null>} The thread object or null if creation failed.
 */
const getOrCreateThread = async (interaction, threadName) => {
    try {
        const message = await interaction.channel.messages.fetch(interaction.message.id);
        let thread = message.thread || interaction.channel.threads.cache.find(t => t.name === threadName);
        if (!thread) {
            thread = await message.startThread({
                name: threadName,
                autoArchiveDuration: 1440, // 24 hours
                reason: `Thread created for raid day actions.`,
            });
        }
        return thread;
    } catch (error) {
        console.error('Error fetching or creating thread:', error);
        return null;
    }
};

/**********************************************************************/
// Helper Function - Send Error Replies

/**
 * @function sendErrorReply
 * @description Send an error reply to the interaction.
 * @param {object} interaction - The interaction object from Discord.
 * @param {string} message - The error message to send.
 */
const sendErrorReply = async (interaction, message) => {
    await interaction.reply({
        content: `❌ ${message} Please reach out in ${SUPPORT_THREAD_ID}.`,
        ephemeral: true,
    });
};

/**********************************************************************/
// Module Exports - Poll Interaction Execution

module.exports = {
    id: 'raid_day',

    /**
     * @function execute
     * @description Handles interactions for sign-ups, check-ins, and other raid day actions.
     * @param {import('discord.js').ButtonInteraction} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const [action, raidDay] = interaction.customId.split('_'); // E.g., "signUp_Friday"
        const userId = interaction.user.id;

        // Load sign-up data
        const signUpData = loadSignUpData();
        const dayData = signUpData.find(data => data.messageId === interaction.message.id);

        if (!dayData) {
            return sendErrorReply(interaction, 'No data found for this raid day.');
        }

        const bossName = dayData.selectedBosses?.join(', ') || 'Pending Selection';
        const threadName = `Raid Sign-Up for ${raidDay} | id:${dayData.messageId}`;

        switch (action) {
            case 'signUp':
                if (dayData.locked) {
                    return sendErrorReply(interaction, `Sign-ups for **${bossName} | ${raidDay}** are locked.`);
                }
                if (dayData.closed) {
                    return sendErrorReply(interaction, `The **${bossName} | ${raidDay}** raid is closed.`);
                }

                await interaction.deferReply({ ephemeral: true });

                if (!dayData.signUps.includes(userId)) {
                    dayData.signUps.push(userId);
                    saveSignUpData(signUpData);

                    const thread = await getOrCreateThread(interaction, threadName);
                    if (thread) {
                        await thread.send({
                            content: `<@${userId}> has signed up for **${bossName} | ${raidDay}**.`,
                        });
                    }

                    await interaction.editReply({ content: `✅ You have signed up for **${raidDay} | ${bossName}**!` });
                } else {
                    await interaction.editReply({ content: `⚠ You are already signed up for **${raidDay} | ${bossName}**.` });
                }
                break;

            case 'signIn':
                if (dayData.locked) return sendErrorReply(interaction, `Sign-ins for **${bossName} | ${raidDay}** are locked.`);
                if (dayData.closed) return sendErrorReply(interaction, `The **${bossName} | ${raidDay}** raid is closed.`);

                const modal = new ModalBuilder()
                    .setTitle(`Sign-In for ${raidDay}`)
                    .setCustomId(`signIn_${raidDay}`)
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('password')
                                .setLabel('Enter sign-in password')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(true)
                        )
                    );

                await interaction.showModal(modal);
                break;

            case 'lock':
                if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
                    return sendErrorReply(interaction, 'You do not have permission to lock/unlock raids.');
                }

                const poll = pollHelpers.loadPollData().find(p => p.pollId === dayData.pollId);
                if (!poll) return sendErrorReply(interaction, 'Poll data not found for this raid.');

                const runs = poll.dayRaidCounts?.[raidDay] || 1;
                const selectedBosses = [];

                for (let i = 0; i < runs; i++) {
                    try {
                        const selectedBoss = pollHelpers.matchmakeBoss(poll, dayData);
                        selectedBosses.push(selectedBoss);
                    } catch (error) {
                        console.error('Error in matchmaking:', error);
                        return sendErrorReply(interaction, 'No eligible bosses found based on attendance.');
                    }
                }

                dayData.locked = true;
                dayData.selectedBosses = selectedBosses;
                saveSignUpData(signUpData);

                const lockEmbed = new EmbedBuilder()
                    .setTitle(`🔒 Locked Raid | Bosses: ${selectedBosses.join(', ')}`)
                    .setDescription(
                        `**Raid Day:** ${raidDay}\n` +
                        `**Number of Runs:** ${runs}\n` +
                        `**Selected Bosses:** ${selectedBosses.join(', ')}\n` +
                        `**Sign-Up Status:** Locked`
                    )
                    .setColor('Red');

                await interaction.message.edit({ embeds: [lockEmbed] });

                const lockThread = await getOrCreateThread(interaction, threadName);
                if (lockThread) {
                    await lockThread.send({
                        content: `@everyone The raid has been locked! The selected bosses are **${selectedBosses.join(', ')}**.`,
                        allowedMentions: { parse: ['everyone'] },
                    });
                }

                await interaction.reply({ content: `✅ Raid locked with bosses: **${selectedBosses.join(', ')}**.`, ephemeral: true });
                break;

            case 'close':
                if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
                    return sendErrorReply(interaction, 'You do not have permission to close raids.');
                }

                dayData.closed = true;
                saveSignUpData(signUpData);

                const closeEmbed = new EmbedBuilder()
                    .setTitle(`Raid Closed | ${raidDay}`)
                    .setDescription(
                        `**Raid Day:** ${raidDay}\n` +
                        `**Bosses:** ${bossName}\n` +
                        `Sign-ups are now closed.`
                    )
                    .setColor('DarkRed');

                await interaction.message.edit({ embeds: [closeEmbed] });

                const closeThread = await getOrCreateThread(interaction, threadName);
                if (closeThread) {
                    await closeThread.send({
                        content: `@everyone The raid has been closed.`,
                        allowedMentions: { parse: ['everyone'] },
                    });
                }

                await interaction.reply({ content: `✅ Raid closed for **${raidDay} | ${bossName}**.`, ephemeral: true });
                break;

            default:
                await sendErrorReply(interaction, 'Unknown action.');
        }
    },
};
