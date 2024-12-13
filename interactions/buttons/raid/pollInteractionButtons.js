/**
 * @file pollInteractionButtons.js
 * @description Handles button interactions for raid day sign-up, sign-in, and administrative actions like lock/unlock and close.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.5.0
 */

/**********************************************************************/
// Required Modules

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
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

function buildPageComponents(page, raidDay, poll, runs, runsPerPage, totalPages, messageId) {
    const start = page * runsPerPage;
    const end = Math.min(start + runsPerPage, runs);

    console.log(`[DEBUG] Building components for Page: ${page}, Start: ${start}, End: ${end}`);

    const selectMenus = Array.from({ length: end - start }, (_, index) =>
        new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`override_select_${raidDay}_${start + index}_${messageId}`) // Include messageId
                .setPlaceholder(`Select boss for Run ${start + index + 1}`)
                .addOptions(
                    poll.bosses
                        .filter(boss => boss.name && boss.name.trim() !== '')
                        .map(boss => ({ label: boss.name, value: boss.name }))
                        .concat([{ label: 'Matchmake', value: 'matchmake' }])
                )
        )
    );

    /// Add navigation buttons
    if (totalPages > 1) {
        const navigationButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`override_previous_${raidDay}_${page}_${messageId}`) // Include messageId
                .setLabel('Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === 0),
            new ButtonBuilder()
                .setCustomId(`override_next_${raidDay}_${page}_${messageId}`) // Include messageId
                .setLabel('Next')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(page === totalPages - 1)
        );
        selectMenus.push(navigationButtons);
    }

    console.log(`[DEBUG] Built Components for Page: ${page}`);
    return selectMenus;
}

function buildOverrideEmbed(raidDay, poll, dayData) {
    const votedBosses = poll.bosses
        .filter(boss => boss.voters.length > 0)
        .map(boss => `**${boss.name}** - Voters: ${boss.voters.map(voter => `<@${voter}>`).join(', ')}`)
        .join('\n') || 'No votes yet.';

    const signedInUsers = dayData.signedIn
        .map(userId => `<@${userId}>`)
        .join(', ') || 'No users signed in yet.';

        return new EmbedBuilder()
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
}

/**********************************************************************/
// Module Exports - Poll Interaction Execution

module.exports = {
    
    buildOverrideEmbed,
    
    id: 'raid_day',

    /**
     * @function execute
     * @description Handles interactions for sign-ups, check-ins, and other raid day actions.
     * @param {import('discord.js').ButtonInteraction} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const userId = interaction.user.id;
        const customId = interaction.customId;
        console.log(`[DEBUG] Parsed action from customId: ${customId}`);

        // Extract action and raidDay from customId
        let [action, raidDay] = customId.split('_');

        // Extract messageId if included in the customId
        let messageId;
        const customIdMatch = customId.match(/override_(next|previous|select)_(.+)_(\d+)_(.+)/);
        if (customIdMatch) {
            action = `override_${customIdMatch[1]}`; // e.g., "override_next" or "override_previous"
            raidDay = customIdMatch[2]; // e.g., "Wednesday"
            messageId = customIdMatch[4]; // Extracted messageId
        }

        // Load sign-up data
        const signUpData = loadSignUpData();

        // Use extracted messageId if available; otherwise, default to interaction.message.id
        const effectiveMessageId = messageId || interaction.message.id;
        const dayData = signUpData.find(data => data.messageId === effectiveMessageId);

        if (!dayData) {
            console.error(`[DEBUG] No dayData found for MessageID: ${effectiveMessageId}`);
            return sendErrorReply(interaction, 'No data found for this raid day.');
        }

        // Load poll data associated with this raid
        const poll = pollHelpers.loadPollData().find(p => p.pollId === dayData.pollId);
        if (!poll) {
            console.error(`[DEBUG] No poll found for PollID: ${dayData.pollId}`);
            return sendErrorReply(interaction, 'No poll data found for this raid day.');
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

                if (dayData.locked) {
                    // Unlock the raid
                    dayData.locked = false;
                    saveSignUpData(signUpData);

                    const unlockEmbed = new EmbedBuilder()
                        .setTitle(`🔓 Raid Unlocked | ${raidDay}`)
                        .setDescription(
                            `**Raid Day:** ${raidDay}\n` +
                            `**Number of Runs:** ${poll.dayRaidCounts?.[raidDay] || 1}\n` +
                            `**Selected Bosses:** ${dayData.selectedBosses?.join(', ') || 'None'}\n` +
                            `**Sign-Up Status:** Unlocked`
                        )
                        .setColor('Green');

                    await interaction.message.edit({ embeds: [unlockEmbed] });

                    const unlockThread = await getOrCreateThread(interaction, threadName);
                    if (unlockThread) {
                        await unlockThread.send({
                            content: `Sign-ups for **${raidDay}** have been unlocked. Tardy members may now sign in.`,
                        });
                    }

                    await interaction.reply({ content: `✅ Raid unlocked for **${raidDay}**.`, ephemeral: true });
                } else {
                    // Lock the raid and process matchmaking if needed
                    const runs = poll.dayRaidCounts?.[raidDay] || 1;

                    // Ensure selectedBosses array exists and is properly initialized
                    if (!Array.isArray(dayData.selectedBosses)) {
                        dayData.selectedBosses = Array(runs).fill('matchmake');
                    }

                    try {
                        dayData.selectedBosses = dayData.selectedBosses.map((boss, index) => {
                            if (boss === 'matchmake') {
                                // Only perform matchmaking for "matchmake" entries
                                return pollHelpers.matchmakeBoss(poll, dayData);
                            }
                            return boss; // Keep already assigned bosses as is
                        });
                    } catch (error) {
                        console.error('Error in matchmaking:', error);
                        return sendErrorReply(interaction, 'Failed to matchmake bosses. Please try again or contact an admin.');
                    }

                    dayData.locked = true;
                    saveSignUpData(signUpData);

                    const lockEmbed = new EmbedBuilder()
                        .setTitle(`🔒 Raid Locked | Bosses: ${dayData.selectedBosses.join(', ')}`)
                        .setDescription(
                            `**Raid Day:** ${raidDay}\n` +
                            `**Number of Runs:** ${runs}\n` +
                            `**Selected Bosses:** ${dayData.selectedBosses.join(', ')}\n` +
                            `**Sign-In Status:** Locked`
                        )
                        .setColor('Red');

                    await interaction.message.edit({ embeds: [lockEmbed] });

                    const lockThread = await getOrCreateThread(interaction, threadName);
                    if (lockThread) {
                        await lockThread.send({
                            content: `@everyone The raid has been locked! The selected bosses are **${dayData.selectedBosses.join(', ')}**.`,
                            allowedMentions: { parse: ['everyone'] },
                        });
                    }

                    await interaction.reply({ content: `✅ Raid locked with bosses: **${dayData.selectedBosses.join(', ')}**.`, ephemeral: true });
                }
                break;


            case 'override':
                console.log(`[DEBUG] Received override action: ${action}`);
                // Existing override logic for initial page
                const runs = dayData.selectedBosses.length;
                const runsPerPage = 4;
                const totalPages = Math.ceil(runs / runsPerPage);

                const pageComponents = buildPageComponents(
                    0,
                    raidDay,
                    poll,
                    runs,
                    runsPerPage,
                    totalPages,
                    dayData.messageId
                );

                console.log(`[DEBUG] Opening initial Override Page 0 for Raid Day: ${raidDay}`);
                return interaction.reply({
                    embeds: [buildOverrideEmbed(raidDay, poll, dayData)],
                    components: pageComponents,
                    ephemeral: true,
                });

            case 'override_next':
            case 'override_previous':
                console.log(`[DEBUG] Received pagination action: ${action}`);
                const match = customId.match(/override_(next|previous)_(.+)_(\d+)_(.+)/);
                if (!match) {
                    console.error(`[DEBUG] Failed to parse customId: ${customId}`);
                    return sendErrorReply(interaction, 'Invalid action format.');
                }

                const direction = match[1]; // "next" or "previous"
                const currentRaidDay = match[2]; // e.g., "Wednesday"
                let currentPage = parseInt(match[3], 10); // Current page number
                const currentMessageId = match[4]; // Extracted messageId

                console.log(`[DEBUG] Parsed pagination action: Direction=${direction}, RaidDay=${currentRaidDay}, Page=${currentPage}, MessageID=${currentMessageId}`);

                // Increment or decrement page
                currentPage += direction === 'next' ? 1 : -1;

                // Validate dayData existence
                const dayDataForPagination = signUpData.find(data => data.messageId === currentMessageId);
                if (!dayDataForPagination) {
                    console.error(`[DEBUG] No dayData found for MessageID: ${currentMessageId}`);
                    return sendErrorReply(interaction, 'No data found for this raid day.');
                }

                // Validate poll existence
                const pollForPagination = pollHelpers.loadPollData().find(p => p.pollId === dayDataForPagination.pollId);
                if (!pollForPagination) {
                    console.error(`[DEBUG] No poll found for PollID: ${dayDataForPagination.pollId}`);
                    return sendErrorReply(interaction, 'No poll data found for this raid day.');
                }

                // Page navigation logic
                const runsForPagination = dayDataForPagination.selectedBosses.length;
                const runsPerPageForPagination = 4;
                const totalPagesForPagination = Math.ceil(runsForPagination / runsPerPageForPagination);

                if (currentPage < 0 || currentPage >= totalPagesForPagination) {
                    console.error(`[DEBUG] Invalid page navigation. CurrentPage=${currentPage}, TotalPages=${totalPagesForPagination}`);
                    return sendErrorReply(interaction, 'Invalid page navigation.');
                }

                // Build components for the current page
                const componentsForPagination = buildPageComponents(
                    currentPage,
                    currentRaidDay,
                    pollForPagination,
                    runsForPagination,
                    runsPerPageForPagination,
                    totalPagesForPagination,
                    currentMessageId
                );

                console.log(`[DEBUG] Navigating to Page: ${currentPage} of ${totalPagesForPagination}`);
                return interaction.update({
                    embeds: [buildOverrideEmbed(currentRaidDay, pollForPagination, dayDataForPagination)],
                    components: componentsForPagination,
                });


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
                        `Sign-ins are now closed.`
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
