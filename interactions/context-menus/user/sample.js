/**
 * @file Sample Use Context Menu interaction
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**
 * @type {import('../../../typings').ContextInteractionCommand}
 */
module.exports = {
	data: {
		name: "sample",
		type: 2, // 2 is for user context menus
	},

	async execute(interaction) {
		await interaction.reply({
			content: "I am a sample user context menu.",
		});
		return;
	},
};
