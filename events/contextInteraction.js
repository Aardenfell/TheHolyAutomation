/**
 * @file Context Interaction Handler
 * @description Handles interactions created by context menu commands (user or message).
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { Events } = require("discord.js");

/**********************************************************************/
// Module Exports - Context Interaction Handling

module.exports = {
    name: Events.InteractionCreate,

    /**
     * @function execute
     * @description Executes when an interaction is created and handles it.
     * @param {import('discord.js').ContextMenuCommandInteraction & { client: import('../typings').Client }} interaction - The interaction which was created.
     */
    async execute(interaction) {
        // Deconstructed client from interaction object.
        const { client } = interaction;

        /**********************************************************************/
        // Validate Interaction Type

        // Checks if the interaction is a context interaction (to prevent unexpected behavior)
        if (!interaction.isContextMenuCommand()) return;

        /**********************************************************************/
        // Handle Interaction Based on Target Type

        // Checks if the interaction target was a user
        if (interaction.isUserContextMenuCommand()) {
            const command = client.contextCommands.get(
                "USER " + interaction.commandName
            );

            // Attempt to execute the interaction
            try {
                return await command.execute(interaction);
            } catch (err) {
                console.error(err);
                await interaction.reply({
                    content: "There was an issue while executing that context command!",
                    ephemeral: true,
                });
            }
        }
        // Checks if the interaction target was a message
        else if (interaction.isMessageContextMenuCommand()) {
            const command = client.contextCommands.get(
                "MESSAGE " + interaction.commandName
            );

            // Attempt to execute the interaction
            try {
                return await command.execute(interaction);
            } catch (err) {
                console.error(err);
                await interaction.reply({
                    content: "There was an issue while executing that context command!",
                    ephemeral: true,
                });
            }
        }
        // Unexpected interaction type
        else {
            console.log(
                "Something weird happened in context menu. Received a context menu of unknown type."
            );
        }
    },
};
