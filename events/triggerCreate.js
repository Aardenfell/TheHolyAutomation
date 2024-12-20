/**
 * @file Main trigger handler file.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.7.1
 */
const { Events } = require("discord.js");

module.exports = {
	name: Events.MessageCreate,

	/**
	 * @description Executes when a message is created and handle it.
	 * @author Aardenfell
	 * @param {import('discord.js').Message & { client: import('../typings').Client }} message The message which was created.
	 */

	async execute(message) {
		// Ignore messages from bots
		if (message.author.bot) return;

		const messageContent = message.content.toLowerCase(); // Convert the message content to lowercase

		// Check all triggers
		let triggered = false;

		message.client.triggers.every((trigger) => {
			if (triggered) return false;

			trigger.name.every(async (name) => {
				if (triggered) return false;

				// Check if the trigger name matches the message content (case-insensitive)
				if (messageContent.includes(name.toLowerCase())) {
					try {
						trigger.execute(message);
					} catch (error) {
						console.error(error);
						message.reply({
							content: "There was an error trying to execute that trigger!",
						});
					}

					// Mark as triggered
					triggered = true;
					return false;
				}
			});
		});
	},
};
