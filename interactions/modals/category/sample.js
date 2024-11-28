/**
 * @file Sample modal interaction
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**
 * @type {import('../../../typings').ModalInteractionCommand}
 */
module.exports = {
	id: "sample",

	async execute(interaction) {
		await interaction.reply({
			content: "This was a reply from modal handler!",
		});
		return;
	},
};
