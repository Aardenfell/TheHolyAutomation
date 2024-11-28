/**
 * @file Poll Helpers for managing the weekly boss poll process, including poll creation, voting, and result processing.
 * @description This file handles boss poll data management and interaction with Discord channels to post poll results.
 */

const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eventEmitter = require('./ngpEvents.js');


const pollDataPath = path.join(__dirname, '../data/weeklyPolls.json');
const raidSignUpsPath = path.join(__dirname, '../data/raidSignUps.json');
const allocationHistoryPath = path.join(__dirname, '../data/allocationHistory.json');


const pollHelpers = {
    /**
     * @function startPoll
     * @description Initializes and saves a new poll, setting an expiration timer.
     * @param {Object} client - The Discord client object.
     * @param {Object} data - Poll data including pollId, duration, bosses, and channelId.
     */
    startPoll(client, data) {
        const polls = this.loadPollData();

        // Ensure each boss has required properties
        data.bosses = data.bosses.map((boss, index) => ({
            name: boss.name,
            votes: 0,
            voters: [],
            weight: boss.weight || 0, // Default weight if not present
            index: index + 1, // Assign a numerical index to each boss
        }));

        data.active = true;

        // Log the poll data for debugging
        console.log('Starting poll with data:', data);

        polls.push(data);
        this.savePollData(polls);

        const expirationDuration = data.debug ? 60 * 1000 : data.duration * 3600 * 1000;
        const pollExpirationUnix = Math.floor(Date.now() / 1000) + data.duration * 3600;

        const emojiMap = index => {
            const digits = index.toString().split('');
            return digits.map(digit => `${digit}️⃣`).join('');
        };

        // Determine raid days to display in the embed
        // const defaultRaidDays = ["Friday", "Saturday", "Sunday", "Monday", "Wednesday"];

        const defaultRaidSchedule = config.raids.defaultRaidSchedule;

        const raidDays = Array.isArray(data.overrideDays) && data.overrideDays.length > 0
            ? data.overrideDays
            : Object.keys(defaultRaidSchedule);

        // Construct Embed
        const pollEmbed = new EmbedBuilder()
            .setTitle('🌟 Weekly Boss Poll 🌟')
            .setDescription(
                `Vote for the bosses to run in this week's raids! 🎯  
                **Raid Days:** ${raidDays.map(day => `${day} at ${defaultRaidSchedule[day]}`).join(', ')}   
                **Poll Ends:** <t:${pollExpirationUnix}:R>\n\n` +
                data.bosses.map(boss => `${emojiMap(boss.index)} ${boss.name}`).join('\n') // Use emojiMap for indices
            )
            .setColor('Random');

        // Create buttons for each boss
        const bossButtons = data.bosses.map(boss =>
            new ButtonBuilder()
                .setCustomId(`vote_${boss.index}`)
                .setLabel(boss.index.toString()) // Plain text numerical label
                .setStyle(this.getButtonStyle(boss.weight)) // Dynamic color based on weight
        );

        // Group buttons into rows
        const rows = [];
        for (let i = 0; i < bossButtons.length; i += 5) {
            rows.push(new ActionRowBuilder().addComponents(bossButtons.slice(i, i + 5)));
        }

        // Send the poll message
        client.channels.fetch(data.channelId).then(channel => {
            channel.send({
                content: `# IT'S RAID TIME BICHES || <@&${config.roles.raid}> ||`,
                embeds: [pollEmbed],
                components: rows,
            }).then(sentMessage => {
                data.pollId = sentMessage.id; // Store poll message ID
                this.savePollData(polls);
            });
        });

        // Schedule expiration
        setTimeout(() => this.endPoll(client, data.pollId, data.channelId, data.debug), expirationDuration);
    },


    getButtonStyle(weight) {
        if (weight >= 25) return ButtonStyle.Success; // Green for high-priority bosses
        return ButtonStyle.Primary; // Blue for normal-priority bosses
    },


    /**
     * Handles expiration of active polls and processes their results.
     * @param {Client} client - The Discord client object.
     * @param {number} currentTime - The current time in Unix seconds.
     */
    async handlePollExpiration(client, currentTime) {
        const polls = this.loadPollData();

        // Find polls that are active and expired
        const expiredPolls = polls.filter(poll => poll.active && poll.expiration <= currentTime);

        for (const poll of expiredPolls) {
            console.log(`Poll expired: ${poll.pollId}`);
            await this.endPoll(client, poll.pollId, poll.channelId, poll.debug);
            poll.active = false; // Mark the poll as inactive
        }

        // Save updated poll data
        this.savePollData(polls);
    },

    /**
     * @function assignRaidCounts
     * @description Assigns raid counts to each day balancing weekend/weekday fairness.
     * @param {number} totalRuns - Total number of raids.
     * @param {Object} allocationHistory - Historical data for raid allocations.
     * @param {Array|null} overrideDays - Optional array of days to override the default raid days.
     * @param {Array|null} overrideCounts - Optional array of counts to override the default raid counts.
     * @returns {Object} Raid count allocation by day.
     */
    assignRaidCounts(totalRuns, allocationHistory = {}, overrideDays = null, overrideCounts = null) {
        const defaultRaidDays = ["Friday", "Saturday", "Sunday", "Monday", "Wednesday"];
        const raidDays = Array.isArray(overrideDays) && overrideDays.length > 0 ? overrideDays : defaultRaidDays;

        // Initialize raid counts and ensure allocationHistory keys exist
        const dayRaidCounts = {};
        raidDays.forEach(day => {
            dayRaidCounts[day] = 0;
            allocationHistory[day] = allocationHistory[day] || 0; // Default to 0 if missing
        });

        console.log(`Starting allocation process. Total runs: ${totalRuns}`);
        console.log(`Initial allocation history:`, allocationHistory);

        // Handle override counts if provided
        if (Array.isArray(overrideCounts) && overrideCounts.length === raidDays.length) {
            for (let i = 0; i < raidDays.length; i++) {
                dayRaidCounts[raidDays[i]] = overrideCounts[i] || 0;
                allocationHistory[raidDays[i]] += overrideCounts[i] || 0; // Update allocation history for overrides
            }
            console.log("Override raid counts applied:", dayRaidCounts);
            console.log("Updated allocation history with overrides:", allocationHistory);

            // Save the updated allocation history
            try {
                fs.writeFileSync(allocationHistoryPath, JSON.stringify(allocationHistory, null, 2));
                console.log("Allocation history updated and saved after overrides.");
            } catch (error) {
                console.error("Error saving allocation history after overrides:", error);
            }

            return dayRaidCounts;
        }

        // Step 1: Assign 1 minimum run to each day
        console.log("Step 1: Assigning baseline runs...");
        raidDays.forEach(day => {
            dayRaidCounts[day] = 1;
        });
        console.log(`Baseline runs assigned:`, dayRaidCounts);

        // Subtract the baseline runs from the total
        let remainingRuns = totalRuns - raidDays.length;
        console.log(`Remaining runs after baseline allocation: ${remainingRuns}`);

        if (remainingRuns < 0) {
            console.error("Error: More days than available total runs. Adjusting...");
            remainingRuns = 0;
        }

        // Step 2: Distribute remaining runs based on allocation history
        if (remainingRuns > 0) {
            console.log("Step 2: Distributing remaining runs...");
            while (remainingRuns > 0) {
                // Sort days by their allocation history (ascending order)
                const sortedDays = raidDays.sort((a, b) => allocationHistory[a] - allocationHistory[b]);

                for (const day of sortedDays) {
                    if (remainingRuns <= 0) break; // Stop if no remaining runs left

                    dayRaidCounts[day]++;
                    allocationHistory[day]++;
                    remainingRuns--;

                    console.log(`Allocated extra run to ${day}. Remaining runs: ${remainingRuns}`);
                    console.log(`Current allocation history:`, allocationHistory);
                }
            }
        } else {
            console.log("No remaining runs to distribute.");
        }

        // Step 3: Persist updated allocation history to file
        try {
            fs.writeFileSync(allocationHistoryPath, JSON.stringify(allocationHistory, null, 2));
            console.log("Updated allocation history saved successfully.");
        } catch (error) {
            console.error("Error saving allocation history:", error);
        }

        // Log and return results
        console.log("Final raid counts:", dayRaidCounts);
        console.log("Updated allocation history:", allocationHistory);
        return dayRaidCounts;
    },


    /**
     * @function endPoll
     * @description Ends a poll, updates the original poll message with results, and prepares sign-up posts.
     * @param {Object} client - The Discord client object.
     * @param {string} pollId - The ID of the poll.
     * @param {string} channelId - The ID of the channel where the poll was created.
     * @param {boolean} debug - If true, runs in debug mode.
     */
    async endPoll(client, pollId, channelId, debug = false) {
        const polls = this.loadPollData();
        const poll = polls.find(p => p.pollId === pollId);

        if (!poll || !poll.active) {
            console.log(`Poll ${pollId} is already inactive or not found.`);
            return;
        }

        // Filter bosses with at least one vote
        const possibleBosses = poll.bosses.filter(boss => boss.votes > 0);

        if (possibleBosses.length === 0) {
            console.log('No bosses received any votes. Ending poll without results.');
            poll.active = false;
            this.savePollData(polls);

            // Update the original poll message to reflect the expiration
            const channel = await client.channels.fetch(channelId);
            const originalMessage = await channel.messages.fetch(pollId);
            await originalMessage.edit({
                content: `# POLL HAS EXPIRED || <@&${config.roles.raid}> ||`,
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🛡️ Weekly Boss Poll Results 🛡️')
                        .setDescription("The poll has ended, but no bosses received any votes. Thank you for participating!")
                        .setColor('Red'),
                ],
                components: [], // Remove buttons as the poll is over
            });

            return;
        }

        // Load or initialize allocation history
        let allocationHistory = {};
        try {
            allocationHistory = JSON.parse(fs.readFileSync(allocationHistoryPath, 'utf8'));
        } catch {
            allocationHistory = { Friday: 0, Saturday: 0, Sunday: 0, Monday: 0, Wednesday: 0 };
        }

        // Calculate raid counts
        const totalRuns = 7
        const dayRaidCounts = this.assignRaidCounts(
            totalRuns,
            allocationHistory,
            poll.overrideDays,
            poll.overrideCounts
        );

        console.log("Assigned raid counts for poll:", dayRaidCounts);

        // Assign dayRaidCounts to the poll
        poll.dayRaidCounts = dayRaidCounts;
        poll.active = false; // Mark the poll as inactive
        this.savePollData(polls);

        // Prepare a summary of possible bosses
        const resultsEmbed = new EmbedBuilder()
            .setTitle('🛡️ Weekly Boss Poll Results 🛡️')
            .setDescription(
                `The poll has ended! Here are the bosses that received votes:\n\n` +
                possibleBosses.map(boss => `- ${boss.name}`).join('\n') +
                `\n\nThank you for participating!`
            )
            .setColor('Green');

        // Update the original poll message with results
        try {
            const channel = await client.channels.fetch(channelId);
            const originalMessage = await channel.messages.fetch(pollId);
            await originalMessage.edit({
                content: `# POLL HAS EXPIRED || <@&${config.roles.raid}> ||`,
                embeds: [resultsEmbed],
                components: [], // Remove buttons as the poll is over
            });

            await channel.send({
                content: `# Raid Posts Online! || <@&${config.roles.raid}> ||`,
            });

        } catch (error) {
            console.error("Failed to update the poll message:", error);
        }

        // Generate sign-up posts for selected bosses and raid days
        await this.createSignUpPosts(client, possibleBosses, poll);

        console.log(`Poll ended successfully: ${pollId}`);
    },



    /**
     * @function calculateTopBosses
     * @description Sorts and selects bosses based on votes and weight.
     * @param {Object} poll - Poll data with bosses and their current votes.
     * @returns {Array} - The top bosses for the poll.
     */
    calculateTopBosses(poll) {
        const sortedBosses = poll.bosses.sort((a, b) => (b.votes + b.weight) - (a.votes + a.weight));
        const maxBosses = poll.debug ? 3 : 7;
        return sortedBosses.slice(0, maxBosses);
    },

    /**
     * @function adjustBossWeights
     * @description Adjusts weights of bosses based on poll results to manage frequency.
     * @param {Array} bosses - List of bosses from the poll.
     * @param {Array} topBosses - The bosses that won the current poll.
     */
    adjustBossWeights(bosses, topBosses) {
        const bossesDataPath = path.join(__dirname, '../data/bosses.json');
        const bossesData = JSON.parse(fs.readFileSync(bossesDataPath, 'utf8'));

        const scalingFactor = 0.05; // Controls multiplier growth rate
        const baseIncrement = 1;   // Increment for bosses with votes

        console.log(`Adjusting weights. Top bosses: ${topBosses.map(b => b.name).join(', ')}`);

        bosses.forEach(boss => {
            const bossData = bossesData.find(b => b.name === boss.name);
            if (!bossData) {
                console.log(`Boss data for ${boss.name} not found. Skipping.`);
                return;
            }

            if (topBosses.some(tb => tb.name === boss.name)) {
                // Reset weight to baseline if the boss was chosen
                console.log(`Resetting weight for chosen boss: ${boss.name}`);
                bossData.weight = 0;
                bossData.lastran = new Date().toISOString().split('T')[0];
                bossData.totalrancount += 1;
            } else if (boss.votes > 0) {
                // Only adjust weight if boss has at least 1 vote
                const multiplier = 1 + Math.log(1 + boss.votes) * scalingFactor;
                bossData.weight = bossData.weight * multiplier + baseIncrement;
                console.log(`Adjusted weight for ${boss.name}. New weight: ${bossData.weight}`);
            } else {
                console.log(`Boss ${boss.name} had no votes. Weight remains unchanged.`);
            }
        });

        // Save the updated data back to the file
        console.log("Saving updated boss weights...");
        fs.writeFileSync(bossesDataPath, JSON.stringify(bossesData, null, 2));
        console.log("Updated boss weights saved successfully.");
    },


    matchmakeBoss(poll, raidData) {
        const bossesPath = path.join(__dirname, '../data/bosses.json');
        const bossesData = JSON.parse(fs.readFileSync(bossesPath, 'utf8'));

        if (!poll || !poll.bosses) {
            console.error('Poll data is missing or malformed:', poll);
            throw new Error('Invalid poll data for matchmaking.');
        }

        // Get attendees from the raid data
        const attendees = new Set(raidData.signedIn);

        // Filter bosses by attendance
        const eligibleBosses = poll.bosses.filter(boss =>
            boss.voters.some(voter => attendees.has(voter))
        );

        if (!eligibleBosses.length) {
            throw new Error('No eligible bosses based on attendance.');
        }

        // Calculate scores for eligible bosses
        const bossScores = eligibleBosses.map(boss => {
            const bossData = bossesData.find(b => b.name === boss.name);
            const votes = boss.votes || 0;
            const weight = bossData ? bossData.weight : 0;
            return {
                name: boss.name,
                score: votes * 2 + weight, // Weighted selection logic
            };
        });

        // Perform weighted random selection
        const totalScore = bossScores.reduce((sum, b) => sum + b.score, 0);
        const random = Math.random() * totalScore;
        let cumulative = 0;

        const selectedBoss = bossScores.find(boss => {
            cumulative += boss.score;
            return random < cumulative;
        });

        if (!selectedBoss) throw new Error('Matchmaking failed: No boss selected.');

        // Delegate weight adjustments to `adjustBossWeights`
        this.adjustBossWeights(poll.bosses, [{ name: selectedBoss.name }]);

        console.log(`Boss selected: ${selectedBoss.name}`);

        return selectedBoss.name;
    },




    /**
     * @function registerVote
     * @description Registers a user's vote for a specific boss.
     * @param {string} pollId - The ID of the poll.
     * @param {string} bossIndex - The index of the boss being voted for.
     * @param {string} userId - The ID of the user casting the vote.
     * @param {Object} interaction - The interaction object from Discord.js.
     */
    async registerVote(pollId, bossIndex, userId, interaction) {
        const polls = this.loadPollData();
        const poll = polls.find(p => p.pollId === pollId);

        if (!poll || !poll.active) {
            console.error(`Poll ${pollId} not found or inactive.`);
            return;
        }

        const boss = poll.bosses.find(b => b.index === parseInt(bossIndex));
        if (!boss) {
            console.error(`Boss with index ${bossIndex} not found.`);
            return;
        }

        if (!boss.voters.includes(userId)) {
            boss.votes = (boss.votes || 0) + 1;
            boss.voters.push(userId);
            this.savePollData(polls);

            console.log(`Vote registered for boss ${boss.name} by user ${userId}`);

            // Provide feedback to the user via interaction reply
            await interaction.reply({
                content: `✅ Your vote for **${boss.name}** has been registered!`,
                ephemeral: true,
            });
        } else {
            console.log(`User ${userId} already voted for ${boss.name}.`);

            // Notify the user they already voted
            await interaction.reply({
                content: `⚠️ You already voted for **${boss.name}**.`,
                ephemeral: true,
            });
        }
    },



    /**
     * @function createSignUpPosts
     * @description Creates sign-up posts for each raid day with interactive buttons.
     * @param {Client} client - The Discord client object.
     * @param {Array} bosses - Array of top bosses selected in the poll.
     */
    async createSignUpPosts(client, bosses, poll) {
        const signUpChannel = await client.channels.fetch(config.channels.raidSignUp); // Main sign-up channel
        const passwordChannel = await client.channels.fetch(config.channels.raidPassword); // Password announcement channel

        const { dayRaidCounts } = poll;
        const defaultRaidSchedule = config.raids.defaultRaidSchedule;

        if (!dayRaidCounts || typeof dayRaidCounts !== 'object') {
            console.error("Invalid or missing dayRaidCounts:", dayRaidCounts);
            return;
        }

        console.log("Creating sign-in posts for raid days:", dayRaidCounts);

        // Validate bosses array
        if (!Array.isArray(bosses) || bosses.length === 0) {
            console.error("Invalid or missing bosses array:", bosses);
            return;
        }

        for (const day of Object.keys(dayRaidCounts)) {
            const runs = dayRaidCounts[day];
            if (runs <= 0) {
                console.log(`Skipping ${day} as it has ${runs} runs.`);
                continue;
            }

            const password = this.generatePassword();

            // Calculate the Unix timestamp for the specific raid time on the given day
            const raidDate = new Date();
            const [hours, minutes] = defaultRaidSchedule[day].split(':').map(Number);
            raidDate.setHours(hours, minutes, 0, 0);

            // Find the next occurrence of the specified day of the week
            while (raidDate.getDay() !== this.getDayIndex(day)) {
                raidDate.setDate(raidDate.getDate() + 1);
            }
            const raidTimeUnix = Math.floor(raidDate.getTime() / 1000);

            // Embed for the raid day
            const embed = new EmbedBuilder()
                .setTitle(`🚀 Raid Sign-In | ${day} | Runs: ${runs}`)
                .setDescription(
                    `**Number of Runs:** ${runs}\n\n` +
                    `**Possible Bosses:**\n${bosses
                        .map(boss => `- ${boss.name}`)
                        .join('\n')}\n\n` +
                    `Sign-in for the raid on **${day}** at **<t:${raidTimeUnix}:t> (<t:${raidTimeUnix}:R>)**!\n`
                )
                .setColor('Green');

            // Action buttons
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`signUp_${day}`).setLabel('🔔').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`signIn_${day}`).setLabel('Sign In').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`lock_${day}`).setLabel('Lock').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`close_${day}`).setLabel('Close').setStyle(ButtonStyle.Secondary)
            );

            try {
                // Send sign-up message to the main channel
                const sentMessage = await signUpChannel.send({
                    content: `📣 **Sign-Up Post for ${day} Raid** 📣`,
                    embeds: [embed],
                    components: [buttons],
                });

                // Send password message to the password channel
                await passwordChannel.send({
                    content: `🔒 The password for the **${day}** raid is: \`${password}\`.`,
                });

                // Store the sign-up data
                this.storeSignUpData(sentMessage.id, day, password, poll.pollId);
            } catch (error) {
                console.error(`Error sending messages for ${day}:`, error);
            }
        }
    },




    /**
     * @function generatePassword
     * @description Generates a random alphanumeric password.
     * @returns {string} A secure password.
     */
    generatePassword() {
        const characters = '0123456789';
        const passwordLength = 4; // Length of the password
        let password = '';
        for (let i = 0; i < passwordLength; i++) {
            password += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return password;
    },



    /**
 * @function storeSignUpData
 * @description Stores the message ID, raid day, and password for tracking purposes.
 * @param {string} messageId - The ID of the sign-up post message.
 * @param {string} day - The raid day for which the post is created.
 * @param {string} password - The password for the sign-in process.
 */
    storeSignUpData(messageId, day, password, pollId) {
        const signUpData = JSON.parse(fs.readFileSync(raidSignUpsPath, 'utf8')) || [];

        // Add new sign-up entry with messageId as the unique identifier
        signUpData.push({
            messageId,
            day,
            password,
            pollId,
            signUps: [],
            signedIn: [],
            locked: false,
            closed: false,
        });

        // Save updated data
        fs.writeFileSync(raidSignUpsPath, JSON.stringify(signUpData, null, 2));
    }
    ,

    // Utility methods to load and save poll data
    loadPollData() {
        try {
            const data = JSON.parse(fs.readFileSync(pollDataPath, 'utf8')) || [];
            // Filter out any null values from the loaded data
            return data.filter(poll => poll !== null);
        } catch (error) {
            console.error("Error loading poll data:", error);
            return [];
        }
    },


    savePollData(data) {
        fs.writeFileSync(pollDataPath, JSON.stringify(data, null, 2));
    },
};

pollHelpers.handlePollExpiration = pollHelpers.handlePollExpiration.bind(pollHelpers);

module.exports = pollHelpers;
