/**
 * @file selectMenuInteraction.js
 * @description Handles select menu interactions for various commands and features in the Discord bot.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.2.0
 */

const { Events } = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,

    /**
     * @function execute
     * @description Execute function to handle select menu interactions.
     * @param {object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        const { client } = interaction;

        // Only handle select menu interactions
        if (!interaction.isStringSelectMenu()) return;

        const customId = interaction.customId;
        console.log("Parsed action from customId:", customId);

        /**********************************************************************/
        // Match Regex-Based Select Commands (Special Cases)

        const matchingHandler = client.selectCommands.find(handler => {
            if (typeof handler.id === "string") {
                return handler.id === customId;
            } else if (handler.id instanceof RegExp) {
                return handler.id.test(customId);
            }
            return false;
        });

        if (matchingHandler) {
            try {
                return await matchingHandler.execute(interaction);
            } catch (err) {
                console.error("Error executing select menu handler:", err);
                return await interaction.reply({
                    content: "There was an issue processing your selection. Please try again.",
                    ephemeral: true,
                });
            }
        }

        /**********************************************************************/
        // Default Response for Unhandled Select Menus

        console.error("No handler found for select menu:", customId);
        return await require("../messages/defaultSelectError").execute(interaction);
    },
};
