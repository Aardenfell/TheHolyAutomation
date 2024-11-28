/**
 * @file Raid Sign-In Command
 * @description Handles sign-in interactions for raid events by validating password input and updating sign-in data.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

// Import required modules
const fs = require('fs');
const path = require('path');

// Path to the raid sign-up data file
const signUpDataPath = path.join(__dirname, '../../../data/raidSignUps.json');

module.exports = {
    id: 'signIn',

    /**
     * @function execute
     * @description Executes the sign-in interaction.
     * @param {Object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        try {
            // Retrieve the entered password from the modal
            const enteredPassword = interaction.fields.getTextInputValue('password');
            
            // Load the correct password from raid sign-up data
            const signUpData = JSON.parse(fs.readFileSync(signUpDataPath, 'utf8'));
            const messageId = interaction.message.id; // Use message ID to identify raid day
            const dayData = signUpData.find(data => data.messageId === messageId);

            // Handle case where no data is found for the raid day
            if (!dayData) {
                return await interaction.reply({
                    content: 'No data found for this raid day.',
                    ephemeral: true,
                });
            }

            // Check if the user has already signed in
            if (dayData.signedIn.includes(interaction.user.id)) {
                return await interaction.reply({
                    content: 'You have already signed in for this raid day.',
                    ephemeral: true,
                });
            }

            const correctPassword = dayData.password;

            // Check password validity
            if (enteredPassword === correctPassword) {
                // Update sign-in data and save it
                if (!dayData.signedIn.includes(interaction.user.id)) {
                    dayData.signedIn.push(interaction.user.id);
                    fs.writeFileSync(signUpDataPath, JSON.stringify(signUpData, null, 2));
                }

                // Respond with an ephemeral success message
                await interaction.reply({
                    content: 'Sign-in successful!',
                    ephemeral: true,
                });

                // Post a sign-in confirmation message to the thread
                const threadName = `Raid Sign-Up for ${dayData.day} | id:${dayData.messageId}`;
                let thread;

                try {
                    console.log(`Attempting to fetch message ID: ${messageId} for raid day: ${dayData.day}`);
                    const message = await interaction.channel.messages.fetch(messageId);

                    // Handle case where the message could not be found
                    if (!message) {
                        console.log(`Message with ID ${messageId} could not be found.`);
                        await interaction.followUp({
                            content: 'Failed to find the original sign-up message. Please contact an admin.',
                            ephemeral: true,
                        });
                        return;
                    }

                    // Check if a thread already exists for the message
                    thread = message.thread || interaction.channel.threads.cache.find(t => t.name === threadName);
                    if (thread) {
                        console.log(`Thread "${threadName}" already exists.`);
                    } else {
                        console.log(`Creating new thread for message ID: ${messageId} with name: ${threadName}`);
                        thread = await message.startThread({
                            name: threadName,
                            autoArchiveDuration: 1440, // 24 hours
                            reason: `Sign-in thread for ${dayData.day}`
                        });
                    }

                    // Post a confirmation message in the thread if created or exists
                    if (thread) {
                        await thread.send({
                            content: `<@${interaction.user.id}> has signed in for ${dayData.day}.`,
                            allowedMentions: {
                                parse: [],
                            }
                        });
                    } else {
                        await interaction.followUp({
                            content: 'Thread creation failed. Please try again later.',
                            ephemeral: true,
                        });
                    }

                } catch (error) {
                    console.error('Error during thread message posting:', error);
                    await interaction.followUp({
                        content: 'There was an error posting in the thread. Please contact support.',
                        ephemeral: true,
                    });
                }

            } else {
                // Respond with an error if the password is incorrect
                await interaction.reply({
                    content: 'Incorrect password, please try again.',
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.error('Error handling sign-in modal:', error);
            await interaction.reply({
                content: 'An error occurred while processing your sign-in. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
