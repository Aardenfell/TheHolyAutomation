/**
 * @file voteBoss.js
 * @description This module is responsible for handling user votes when the 'vote' button is clicked.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const pollHelpers = require('../../../utils/pollHelpers.js');

/**********************************************************************/
// Module Exports - Vote Button Interaction Execution

module.exports = {
    id: 'vote',

    /**
     * @function execute
     * @description Registers a user's vote based on the button they clicked.
     * @param {import('discord.js').ButtonInteraction} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        // Extract the action type and boss index from the button's customId.
        const [action, bossIndex] = interaction.customId.split('_');
        const pollId = interaction.message.id; 
        const userId = interaction.user.id;

        // Log the voting attempt for debugging purposes.
        console.log(`Attempting to register vote for pollId: ${pollId}, bossIndex: ${bossIndex}, userId: ${userId}`);

        try {
            // Pass interaction to pollHelpers.registerVote to handle the voting logic.
            await pollHelpers.registerVote(pollId, bossIndex, userId, interaction);
        } catch (error) {
            // Handle any errors that may occur during the voting process.
            console.error('Error registering vote:', error);
            await interaction.reply({
                content: 'There was an error processing your vote. Please try again later.',
                ephemeral: true,
            });
        }
    }
};
