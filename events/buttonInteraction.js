/**
 * @file buttonInteraction.js
 * @description Handles button interactions for various commands and features in the Discord bot.
 * @since 1.0.0
 * @version 2.2.0
 */

/**********************************************************************/
// Required Modules

const { Events } = require("discord.js");

/**********************************************************************/
// Module Exports - Interaction Button Handling

module.exports = {
    name: Events.InteractionCreate,

    /**
     * @function execute
     * @description Execute function to handle button interactions.
     * @param {object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const { client } = interaction;

        // Only handle button interactions
        if (!interaction.isButton()) return;

        const customId = interaction.customId;
        console.log('Parsed action from customId:', customId);

        /**********************************************************************/
        // Guild Access Handling

        if (['new_recruit', 'visitor_access', 'envoy_access'].includes(customId)) {
            const accessHandler = client.buttonCommands.get('guild_access');
            if (accessHandler) {
                try {
                    return await accessHandler.execute(interaction);
                } catch (err) {
                    console.error('Error executing guild access button:', err);
                    return await interaction.reply({
                        content: "There was an issue processing your selection. Please try again.",
                        ephemeral: true,
                    });
                }
            } else {
                console.error('Guild access handler not found for button:', customId);
                return await interaction.reply({
                    content: "This guild access button is not correctly configured. Please contact an admin.",
                    ephemeral: true,
                });
            }
        }

        /**********************************************************************/
        // Existing Button Handling Logic

        const [prefix, ...rest] = customId.split('_');
        const action = `${prefix}_${rest[0]}`;
        const mainAction = prefix;

        // Raid Handling
        if (['signUp', 'signIn', 'close', 'lock', 'override'].includes(mainAction)) {
            const raidHandler = client.buttonCommands.get('raid_day');
            if (raidHandler) {
                try {
                    return await raidHandler.execute(interaction);
                } catch (err) {
                    console.error('Error executing raid button:', err);
                    return await interaction.reply({
                        content: "There was an issue processing your raid sign-up. Please try again.",
                        ephemeral: true,
                    });
                }
            }
        // Vote Handling
        } else if (mainAction === 'vote') {
            const voteHandler = client.buttonCommands.get('vote');
            if (voteHandler) {
                try {
                    return await voteHandler.execute(interaction);
                } catch (err) {
                    console.error('Error executing vote button:', err);
                    return await interaction.reply({
                        content: "There was an issue processing your vote. Please try again.",
                        ephemeral: true,
                    });
                }
            } else {
                console.error('Vote handler not found:', action);
                return await interaction.reply({
                    content: "This vote button is not correctly configured. Please contact an admin.",
                    ephemeral: true,
                });
            }
        // NGP Handling
        } else if (mainAction === 'ngp') {
            const ngpHandler = client.buttonCommands.get(action);
            if (ngpHandler) {
                try {
                    return await ngpHandler.execute(interaction, client);
                } catch (err) {
                    console.error('Error executing NGP button:', err);
                    await interaction.reply({
                        content: "There was an issue while executing that button!",
                        ephemeral: true,
                    });
                }
            }
        // Test NGP Handling
        } else if (mainAction === 'test') {
            const testHandler = client.buttonCommands.get(action);
            if (testHandler) {
                try {
                    return await testHandler.execute(interaction, client);
                } catch (err) {
                    console.error('Error executing Test NGP button:', err);
                    await interaction.reply({
                        content: "There was an issue while executing that button!",
                        ephemeral: true,
                    });
                }
            }
        } else {
            // Default Handler for Unhandled Buttons
            console.log('No handler found for button:', customId);
            return await require("../messages/defaultButtonError").execute(interaction);
        }
    },
};
