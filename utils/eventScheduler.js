// /**
//  * @file Event scheduler for posting and updating event times in Discord.
//  * This file handles the 'ready' event when the bot starts and sets up the event schedule updater.
//  * @author Aardenfell
//  * @since 1.0.0
//  * @version 1.0.0
//  */

// const { TextChannel } = require('discord.js');
// const { getNextEventTimes, updateEventSchedule } = require('./eventSchedulerUtils'); // Adjusted path to utils

// /**
//  * @description Event handler for the bot's 'ready' event, which runs once when the bot logs in.
//  * It sets up a schedule to post and update the event times in a Discord channel.
//  * @type {import('../typings').Event}
//  */
// module.exports = {
// 	name: 'ready', // This event is fired when the bot is ready.
// 	once: true,    // We want this to run only once when the bot logs in.
// 	async execute(client) {
// 		// Log that the bot is ready and running
// 		console.log(`${client.user.tag} is ready!`);

// 		// Replace 'YOUR_CHANNEL_ID' with the ID of the channel where you want the event schedule posted.
// 		const channelId = '1295676397104267315';
// 		const channel = client.channels.cache.get(channelId); // Fetch the channel using its ID

// 		// Replace 'ROLE_ID' with the role you want to ping when an event is active
// 		const rolePing = '\Placeholder'; // This will ping the role when events are active

// 		// Ensure the channel is a text channel before proceeding
// 		if (channel instanceof TextChannel) {
// 			// Post the initial event schedule to the channel
// 			updateEventSchedule(channel, rolePing);

// 			// Set an interval to update the event schedule every hour (3600000 milliseconds = 1 hour)
// 			setInterval(() => {
// 				// Call the function to update the event schedule with new times
// 				updateEventSchedule(channel, rolePing);
// 			}, 60000); // Runs every 1 hour
// 		}
// 	},
// };
