/**
 * @file pollInteractionHandler.js
 * @description Handles button interactions for raid day sign-up, sign-in, and administrative actions like lock/unlock and close.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.2.0
 */

/**********************************************************************/
// Required Modules

const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
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

        const poll = pollHelpers.loadPollData().find(p => p.pollId === dayData.pollId);

        if (!poll) {
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
                    if (!interaction.member.roles.cache.has(ALLOWED_ROLE_ID)) {
                        return sendErrorReply(interaction, 'You do not have permission to override raid runs.');
                    }
                
                    // Prepare select menus for overrides
                    const runs = poll.dayRaidCounts?.[raidDay] || 1;
                
                    // Filter out invalid bosses and map to menu options
                    const bosses = poll.bosses.filter(boss => boss.name && boss.name.trim() !== '');
                    const menuOptions = bosses.map(boss => ({ label: boss.name, value: boss.name }))
                        .concat([{ label: 'Matchmake', value: 'matchmake' }]);
                
                    // Ensure menu options are valid
                    if (menuOptions.length === 0) {
                        return sendErrorReply(interaction, 'No valid bosses available for override.');
                    }
                
                    const actionRows = Array.from({ length: runs }, (_, index) =>
                        new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId(`override_select_${raidDay}_${index}`)
                                .setPlaceholder(`Select boss for Run ${index + 1}`)
                                .addOptions(menuOptions) // Add validated options
                        )
                    );
                
                    // Build the embed with the bosses voted for and currently signed-in users
                    const votedBosses = poll.bosses
                        .filter(boss => boss.voters.length > 0)
                        .map(boss => `**${boss.name}** - Voters: ${boss.voters.map(voter => `<@${voter}>`).join(', ')}`)
                        .join('\n') || 'No votes yet.';
                
                    const signedInUsers = dayData.signedIn
                        .map(userId => `<@${userId}>`)
                        .join(', ') || 'No users signed in yet.';
                
                    const overrideEmbed = new EmbedBuilder()
                        .setTitle(`⚙️ Override Settings | ${raidDay}`)
                        .setDescription(
                            `Use the menus below to override the bosses for this raid day or select "Matchmake" for automated matchmaking.\n\n` +
                            `**Voted Bosses:**\n${votedBosses}\n\n` +
                            `**Currently Signed In:**\n${signedInUsers}`
                        )
                        .setColor('Yellow');
                
                    await interaction.reply({
                        content: "",
                        embeds: [overrideEmbed],
                        components: actionRows,
                        ephemeral: true,
                    });
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
