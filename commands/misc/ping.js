/**
 * @file Sample ping command
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**
 * @type {import('../../typings').LegacyCommand}
 */
module.exports = {
	name: "ping",
	// Refer to typings.d.ts for available properties.

	execute(message, args) {
		message.channel.send({ content: "Pong." });
	},
};
