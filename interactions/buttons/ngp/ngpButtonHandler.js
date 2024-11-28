// /**
//  * @file Button handler for Need, Greed, and Pass buttons in NGP events.
//  * @author Aardenfell
//  * @since 1.0.1
//  */

// const fs = require('fs');
// const path = require('path');

// // Path to JSON file for storing events
// const eventFilePath = path.join(__dirname, '../../../data/ngpEvents.json');

// // Load and save events to JSON
// function loadEventsFromFile() {
//     if (!fs.existsSync(eventFilePath)) {
//         fs.writeFileSync(eventFilePath, JSON.stringify({ events: [] }, null, 2));
//     }
//     const fileContent = fs.readFileSync(eventFilePath, 'utf-8');
//     return fileContent.trim() ? JSON.parse(fileContent) : { events: [] };
// }

// function saveEventsToFile(events) {
//     fs.writeFileSync(eventFilePath, JSON.stringify(events, null, 2));
// }

// module.exports = {
//     id: 'ngpButtonHandler',  // This ID needs to be registered in bot.js

//     /**
//      * @function execute
//      * @description Handles the Need/Greed/Pass button interactions.
//      * @param {ButtonInteraction} interaction - The interaction object from Discord.js
//      */
//     async execute(interaction) {
//         console.log('Button pressed:', interaction.customId);  // Debug button press

//         if (!interaction.isButton()) return;

//         // Extract eventId from the button's customId (e.g., "ngp_need_<eventId>")
//         const [action, , eventId] = interaction.customId.split('_');  // Split customId into action and eventId
//         console.log('Parsed action:', action, 'Parsed eventId:', eventId);  // Debug action and eventId

//         // Load event data from JSON
//         const eventData = loadEventsFromFile();
//         const event = eventData.events.find(e => e.event_id === eventId);

//         if (!event || !event.active) {
//             await interaction.reply({ content: 'This event has expired or is inactive.', ephemeral: true });
//             return;
//         }

//         const participantName = interaction.user.username;
//         const userId = interaction.user.id;

//         // Handle Need, Greed, or Pass based on the action parsed from customId
//         let rollType = '';
//         let rollValue = null;

//         if (action === 'ngp_need') {
//             rollType = 'Need';
//             rollValue = Math.floor(Math.random() * 100) + 1;  // Random roll between 1 and 100
//         } else if (action === 'ngp_greed') {
//             rollType = 'Greed';
//             rollValue = Math.floor(Math.random() * 100) + 1;  // Random roll between 1 and 100
//         } else if (action === 'ngp_pass') {
//             rollType = 'Pass';
//             rollValue = null;
//         }

//         // Update participant's roll in the event data
//         event.participants.forEach(participant => {
//             if (participant.name === participantName) {
//                 participant.roll_type = rollType.toLowerCase();
//                 participant.roll_value = rollValue;
//             }
//         });

//         // Save updated event data
//         saveEventsToFile(eventData);

//         // Send the roll message to the user
//         let rollMessage = '';
//         if (rollType === 'Pass') {
//             rollMessage = `<@${userId}> has passed on the item.`;
//         } else {
//             rollMessage = `<@${userId}> rolled a **${rollType}** roll of **${rollValue}**.`;
//         }

//         // Acknowledge the interaction
//         await interaction.reply({ content: rollMessage });
//     },
// };
