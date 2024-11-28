// /**
//  * @file Utility functions for handling event schedules, simplified to show only event names and times.
//  * The zone rule is now prefixed to the event name, and descriptions are removed from the output.
//  * @author Aardenfell
//  * @since 1.0.0
//  * @version 1.0.0
//  */

// const fs = require('fs');
// const path = require('path');

// // Load event data from JSON file
// const { events: eventData } = JSON.parse(fs.readFileSync(path.join(__dirname, './dynamicEvents.json'), 'utf-8'));

// /**
//  * @function purgeChannel
//  * @description Deletes all messages in the provided channel (used to clean up before reposting).
//  * @param {TextChannel} channel - The Discord channel to purge.
//  * @returns {Promise<void>}
//  */
// async function purgeChannel(channel) {
//     try {
//         const fetchedMessages = await channel.messages.fetch({ limit: 100 });
//         await channel.bulkDelete(fetchedMessages);
//     } catch (error) {
//         console.error('Error purging the channel:', error);
//     }
// }

// /**
//  * @function getNextBiHourlyEventTime
//  * @description Calculates the next occurrence of a bi-hourly event starting from a given time.
//  * @param {string} startTime - The event's start time in "HH:MM" format (e.g., "05:00" for 5 AM).
//  * @returns {number} The Unix timestamp of the next event.
//  */
// function getNextBiHourlyEventTime(startTime) {
//   const now = new Date();
//   const [startHour, startMinute] = startTime.split(":").map(Number);

//   const startEventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute, 0);
//   const nowUnix = Math.floor(now.getTime() / 1000);

//   for (let i = 0; i < 24; i += 3) {
//     let nextEventTime = new Date(startEventTime);
//     nextEventTime.setHours(startEventTime.getHours() + i);
//     const nextEventUnix = Math.floor(nextEventTime.getTime() / 1000);
    
//     if (nextEventUnix >= nowUnix) {
//       return nextEventUnix;
//     }
//   }

//   startEventTime.setDate(startEventTime.getDate() + 1);
//   return Math.floor(startEventTime.getTime() / 1000);
// }

// /**
//  * @function getNextEventTimes
//  * @description Dynamically gets the next events from eventData based on current time, including the current and next occurrences.
//  * @returns {Array} Array of upcoming event objects with both current active time and calculated next times.
//  */
// function getNextEventTimes() {
// 	const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp (seconds)
	
// 	return eventData.map(event => {
// 	  const next_time = getNextBiHourlyEventTime(event.start_time); // Calculate next occurrence of event
// 	  const current_time = next_time - 10800; // The current event time is 3 hours before the next occurrence
  
// 	  // If the current time has passed, consider the next event's window active
// 	  const is_active = now >= current_time && now < current_time + 3600; // 1-hour active window
  
// 	  return {
// 		...event,
// 		next_time,    // The next scheduled time for the event
// 		current_time, // The current active time (3 hours before next event)
// 		is_active     // Boolean flag if the event is currently active
// 	  };
// 	});
//   }
  

// /**
//  * @function updateEventSchedule
//  * @description Purges the channel and sends the event schedule with current active events and upcoming ones.
//  * @param {TextChannel} channel - The Discord channel where the event schedule should be posted.
//  * @param {String} rolePing - The role to be pinged when an event is active.
//  */
// async function updateEventSchedule(channel, rolePing) {
// 	await purgeChannel(channel);
  
// 	const upcomingEvents = getNextEventTimes();
// 	const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp (seconds)
  
// 	let activeEvents = [];
// 	let eventMessage = `**Event Schedule:**\n`;
  
// 	upcomingEvents.forEach((event) => {
// 	  // Check if the event is currently active based on current_time and its active window
// 	  if (event.is_active) {
// 		activeEvents.push(
// 		  `\`${event.rule}\` **${event.name}**\n` +
// 		  `Time: <t:${event.current_time}:T> (<t:${event.current_time}:R>) - **Active Now**\n`
// 		);
// 	  } else {
// 		eventMessage += `\`${event.rule}\` **${event.name}**\n` +
// 		  `Time: <t:${event.next_time}:T> (<t:${event.next_time}:R>)\n\n`;
// 	  }
// 	});
  
// 	// Display currently active events at the top
// 	if (activeEvents.length > 0) {
// 	  eventMessage = `${rolePing}\n\n**Currently Active Events:**\n` + activeEvents.join("\n") + "\n\n" + eventMessage;
// 	} else {
// 	  eventMessage = `No currently active events.\n\n` + eventMessage;
// 	}
  
// 	// Send the event schedule message to the channel
// 	await channel.send(eventMessage);
//   }
  

// module.exports = {
//   getNextEventTimes,
//   updateEventSchedule,
//   getNextBiHourlyEventTime,
//   purgeChannel
// };
