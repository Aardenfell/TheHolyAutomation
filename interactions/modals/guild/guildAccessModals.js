/**
 * @file guildAccessModals
 * @description Handles interaction events for the new recruit and envoy modals, updating roles, nicknames, and sending welcome messages.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

const { saveGuildData, loadGuildData } = require('../../../utils/guildUtils.js');
const { initializeUserBalance, updateUserBalance, logTransaction } = require('../../../utils/pointsHelper.js');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

module.exports = {
    /**
     * @function handle
     * @description Handles the interaction for new recruit and envoy modals.
     * @param {Object} interaction - The interaction object representing a user's action.
     */
    async handle(interaction) {
        const customId = interaction.customId;
        const member = interaction.member;
        const guildData = loadGuildData();

        // Fetching channels from the guild
        const visitorChannel = interaction.guild.channels.cache.get(config.channels.visitorWeclome);
        const recruitChannel = interaction.guild.channels.cache.get(config.channels.recruitWelcome);
        const envoyChannel = interaction.guild.channels.cache.get(config.channels.envoyWelcome);



        const guildKeyMatch = customId.match(/^new_recruit_modal_(.+)$/);
        if (guildKeyMatch) {
            const selectedGuild = guildKeyMatch[1];

            // Handle new recruit modal
            const ingameName = interaction.fields.getTextInputValue('ingame_name');
            const referrerNamesRaw = interaction.fields.getTextInputValue('referrer_name') || null;

            const guildInfo = config.guilds[selectedGuild];
            if (!guildInfo) {
                return await interaction.reply({
                    content: 'The selected guild is not valid. Please contact an admin.',
                    ephemeral: true,
                });
            }
            const guildRole = interaction.guild.roles.cache.get(guildInfo.role_id);

            // Roles to handle
            const restrictorRole = interaction.guild.roles.cache.get(config.roles.restrictor);
            const initiateRole = interaction.guild.roles.cache.get(config.roles.initiate);
            const visitorRole = interaction.guild.roles.cache.get(config.roles.visitor);
            const envoyRole = interaction.guild.roles.cache.get(config.roles.envoy);

            // Mapping for weapon role truncations
            const weaponTruncations = {
                'Crossbow': 'X-bow',
                'Staff': 'Staff',
                'Sword & Shield': 'SnS',
                'Daggers': 'Daggers',
                'Longbow': 'Bow',
                'Wand & Tome': 'Wand',
                'Greatsword': 'GS',
            };

            // Parse, clean up, and truncate weapon roles
            const weaponRoles = member.roles.cache
                .filter((role) => role.name.includes('('))
                .map((role) => {
                    const match = role.name.match(/\((.*?)\)/);
                    if (match) {
                        return match[1]
                            .split('/')
                            .map((weapon) => weaponTruncations[weapon.trim()] || weapon.trim());
                    }
                    return null;
                })
                .filter(Boolean)
                .flat();

            // Join truncated weapons into a string
            const weapons = weaponRoles.join('/');

            // Create nickname with in-game name and weapons
            const nickname = `${ingameName} | ${weapons}`;

            // Handle roles
            if (restrictorRole) await member.roles.remove(restrictorRole);
            if (visitorRole) await member.roles.remove(visitorRole);
            if (initiateRole) await member.roles.add(initiateRole);
            if (envoyRole) await member.roles.remove(envoyRole);
            if (guildRole) await member.roles.add(guildRole);

            // Set nickname
            try {
                await member.setNickname(nickname);
            } catch (error) {
                console.error('Error setting nickname:', error);
                return await interaction.reply({
                    content: 'Welcome, New Recruit! However, I could not set your nickname. Please contact an admin.',
                    ephemeral: true,
                });
            }

            // Initialize guild data and referrals
            if (!guildData[member.id]) {
                guildData[member.id] = {
                    discordId: member.id,
                    username: ingameName,
                    referrer: null,
                    joinedAt: new Date().toISOString(),
                    referralCount: 0,
                    referredPeople: [],
                };
            }

            // Handle referral points if applicable
            if (guildPointsSystemEnabled && referrerNamesRaw) {
                const referrerNames = referrerNamesRaw.split(',').map((name) => name.trim());
                for (const referrerName of referrerNames) {
                    const referrer = Object.values(guildData).find((user) => user.username === referrerName);
                    if (referrer) {
                        referrer.referralCount += 1;
                        referrer.referredPeople.push(ingameName);
                        await updateUserBalance(referrer.discordId, 2); // Award points
                        await logTransaction(interaction.client, {
                            senderId: config.client_id,
                            recipientId: [referrer.discordId],
                            amountPerRecipient: 2,
                            totalAmount: 2,
                            reason: `Referral reward for referring ${ingameName}`,
                            timestamp: Math.floor(Date.now() / 1000),
                        });
                    }
                }
            }

            // Save updated guild data
            saveGuildData(guildData);

            // Send welcome message to recruit channel
            if (recruitChannel) {
                const referrerInfo = referrerNamesRaw
                    ? ` Referred by: **${referrerNamesRaw}**`
                    : '';
                await recruitChannel.send(
                    `🎉 **${member.user}** has joined ${guildInfo.name}!${referrerInfo}`
                );
            }

            // Reply to interaction
            await interaction.reply({ content: 'Welcome, New Recruit!', ephemeral: true });

        } else if (customId === 'envoy_modal') {
            // Handle envoy modal
            await interaction.deferReply({ ephemeral: true }); // Acknowledge interaction immediately

            try {
                const ingameName = interaction.fields.getTextInputValue('ingame_name');
                const guildName = interaction.fields.getTextInputValue('guild_name');

                // Roles to handle
                const restrictorRole = interaction.guild.roles.cache.get(config.roles.restrictor);
                const initiateRole = interaction.guild.roles.cache.get(config.roles.initiate);
                const visitorRole = interaction.guild.roles.cache.get(config.roles.visitor);
                const envoyRole = interaction.guild.roles.cache.get(config.roles.envoy);

                // Create nickname with in-game name and guild
                const nickname = `${ingameName} | ${guildName}`;

                // Update roles
                if (restrictorRole) await member.roles.remove(restrictorRole);
                if (visitorRole) await member.roles.remove(visitorRole);
                if (envoyRole) await member.roles.add(envoyRole);
                if (initiateRole) await member.roles.remove(initiateRole);

                // Set nickname
                try {
                    await member.setNickname(nickname);
                } catch (error) {
                    console.error('Error setting nickname:', error);
                    throw new Error('Failed to update nickname. Please contact an admin.');
                }

                // Send welcome message to envoy channel
                if (envoyChannel) {
                    await envoyChannel.send(
                        `📜 An envoy from **${guildName}** has appeared. Welcome, **${member.user}**!`
                    );
                }

                // Respond to interaction
                await interaction.followUp({ content: 'Welcome, Envoy!' });
            } catch (error) {
                console.error('Error handling envoy_modal:', error);
                await interaction.followUp({
                    content: 'An error occurred while processing your request. Please try again later.',
                });
            }
        }
    },
};
