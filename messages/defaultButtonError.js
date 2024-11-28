/**
 * @file Default Error Message On Error Button Interaction
 * @author Aardenfell
 * @since 3.0.0
 */

module.exports = {
	/**
	 * @description Executes when the button interaction could not be fetched.
	 * @author Aardenfell
	 * @param {import('discord.js').ButtonInteraction} interaction The Interaction Object of the command.
	 */

	async execute(interaction) {
		await interaction.reply({
			content: "There was an issue while fetching this button! Tell <@462462341556994048>!",
			ephemeral: true,
		});
		return;
	},
};
