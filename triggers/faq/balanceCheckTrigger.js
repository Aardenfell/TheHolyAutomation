/**
 * @file Balance Check Trigger command.
 * @author Aardenfell
 * @since 2.7.0
 * @version 2.7.0
 */

/**
 * @type {import('../../typings').TriggerCommand}
 */
module.exports = {
	name: [
		"how do i check my balance",
		"how do i check how many points i have",
		"check my points",
		"check balance",
		"points balance",
		"how many points do i have",
		"how do i see my points",
		"balance check",
		"view my points",
		"how do i find my balance",
		"how can i check my points",
		"how to check my points",
		"can i see my points",
		"what is my balance",
		"show my balance",
		"show my points",
		"how much gp do i have",
		"how much gp",
		"how many gp do i have",
		"can you show my balance",
		"find my points",
		"find my balance",
		"check my gp",
		"gp balance",
		"show me my points",
		"where can i see my points",
		"where is my balance",
		"i want to check my balance",
		"help with balance",
		"help with points",
	],

	execute(message, args) {
		// Responds to any balance-related trigger question
		message.channel.send({
			content: "To check your balance, use the `/balance` command!\nYou can also use `/transactionhistory` to check your recent transactions.",
		});
	},
};
