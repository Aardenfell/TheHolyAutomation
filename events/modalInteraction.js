/**
 * @file Modal Interaction Handler
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

const { Events } = require("discord.js");
const guildAccessModals = require("../interactions/modals/guild/guildAccessModals.js"); // Adjust path if necessary

module.exports = {
    name: Events.InteractionCreate,

    /**
     * @description Executes when an interaction is created and handles it.
     * @param {import('discord.js').Interaction & { client: import('../typings').Client }} interaction - The interaction which was created
     */
    async execute(interaction) {
        const { client } = interaction;

        // Check if the interaction is a modal submission
        if (!interaction.isModalSubmit()) return;

        const customId = interaction.customId;
        console.log('Parsed action from customId:', customId);

        // Explicitly handle guild access modals
        if (['new_recruit_modal', 'envoy_modal'].includes(customId)) {
            try {
                await guildAccessModals.handle(interaction);
            } catch (err) {
                console.error('Error executing guild access modal:', err);
                return await interaction.reply({
                    content: "There was an issue processing this modal. Please try again.",
                    ephemeral: true,
                });
            }
            return;
        }

        // Handle dynamic "signIn" modals (e.g., "signIn_Wednesday", "signIn_Tuesday")
        if (customId.startsWith('signIn')) {
            const [action] = customId.split('_'); // Normalize to "signIn"
            const signInHandler = client.modalCommands.get(action);

            if (signInHandler) {
                try {
                    await signInHandler.execute(interaction);
                } catch (err) {
                    console.error('Error executing signIn modal:', err);
                    return await interaction.reply({
                        content: "There was an issue processing the sign-in modal. Please try again.",
                        ephemeral: true,
                    });
                }
            } else {
                console.error('SignIn handler not found for modal:', customId);
                return await interaction.reply({
                    content: "This sign-in modal is not correctly configured. Please contact an admin.",
                    ephemeral: true,
                });
            }
            return;
        }

        // Handle other modals using client.modalCommands
        const command = client.modalCommands.get(customId);
        if (!command) {
            console.log('No handler found for modal:', customId);
            return await require("../messages/defaultModalError").execute(interaction);
        }

        // Execute the handler for the modal interaction
        try {
            await command.execute(interaction);
        } catch (err) {
            console.error('Error executing modal:', err);
            await interaction.reply({
                content: "There was an issue while understanding this modal!",
                ephemeral: true,
            });
        }
    },
};
