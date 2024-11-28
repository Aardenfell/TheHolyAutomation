/**
 * @file signUpHandler.js
 * @description This module listens for button interactions to manage raid sign-ups, create threads, and maintain sign-up data.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

// Import required modules
const fs = require('fs');
const path = require('path');
const { ThreadAutoArchiveDuration } = require('discord.js');

// Define the path to the raid sign-up data file
const signUpPath = path.join(__dirname, '../data/raidSignUps.json');

/**********************************************************************/
// Module Exports - Interaction Handler

/**
 * @type {import('../typings').InteractionHandler}
 * @description Handles button interactions for raid sign-ups.
 */
module.exports = {
    name: 'interactionCreate',
    
    /**
     * @function execute
     * @description Executes the interaction handler when a button interaction is detected.
     * @param {import('discord.js').Interaction} interaction - The interaction object triggered by a user.
     */
    async execute(interaction) {
        // Ensure interaction is a button press and the correct type of button
        if (!interaction.isButton()) return;

        const [action, day] = interaction.customId.split('_');
        if (action !== 'signup') return;

        const userId = interaction.user.id;
        const signUpData = this.loadSignUpData();

        /**********************************************************************/
        // Find Relevant Sign-Up Entry and Update Sign-Ups

        // Find the relevant sign-up entry using the message ID
        const signUpEntry = signUpData.find(entry => entry.messageId === interaction.message.id);
        if (!signUpEntry) return;

        // Add user to sign-up and create thread if not done already
        if (!signUpEntry.signUps.includes(userId)) {
            signUpEntry.signUps.push(userId);
            await interaction.reply({ content: `You signed up for ${day}!`, ephemeral: true });

            /**********************************************************************/
            // Create Thread for User's Sign-Up

            // Create a sign-up thread for the user if one doesn't exist
            const threadName = `${interaction.user.username}'s Sign-Up | ${day}`;
            let thread = interaction.message.channel.threads.cache.find(t => t.name === threadName);

            if (!thread) {
                thread = await interaction.message.startThread({
                    name: threadName,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
                });
                await thread.send(`${interaction.user} has signed up for ${day}'s raid!`);
            }
        } else {
            await interaction.reply({ content: 'You are already signed up.', ephemeral: true });
        }

        /**********************************************************************/
        // Save Updated Sign-Up Data

        // Save updated sign-up data
        this.saveSignUpData(signUpData);
    },

    /**********************************************************************/
    // Helper Functions - Load and Save Sign-Up Data

    /**
     * @function loadSignUpData
     * @description Loads the sign-up data from the JSON file.
     * @returns {Array<Object>} The parsed sign-up data.
     */
    loadSignUpData() {
        try {
            return JSON.parse(fs.readFileSync(signUpPath, 'utf8')) || [];
        } catch {
            return [];
        }
    },

    /**
     * @function saveSignUpData
     * @description Saves the updated sign-up data to the JSON file.
     * @param {Array<Object>} data - The sign-up data to save.
     */
    saveSignUpData(data) {
        fs.writeFileSync(signUpPath, JSON.stringify(data, null, 2));
    },
};
