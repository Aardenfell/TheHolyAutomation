// // massDistributeHelpers.js (in utils folder)
// const fs = require('fs');
// const path = require('path');
// const ngpEventsPath = path.join(__dirname, '../data/ngpEvents.json');

// function parseItemsFromInput(itemsInput) {
//     // Split item names by commas and trim whitespace
//     return itemsInput.split(',').map(item => item.trim()).filter(item => item.length > 0);
// }

// async function startImageCollection(interaction, itemNames) {
//     const collectedImages = [];
//     let currentItemIndex = 0;

//     const collector = interaction.channel.createMessageCollector({
//         filter: (m) => m.author.id === interaction.user.id,
//         time: 60000 // 1-minute timeout
//     });

//     // Notify user to upload images
//     await interaction.followUp({
//         content: `Please upload an image for **${itemNames[currentItemIndex]}**.`,
//         ephemeral: true
//     });

//     collector.on('collect', async (msg) => {
//         if (msg.content.toLowerCase() === 'done') {
//             collector.stop('finished');
//             return;
//         }

//         // Check for an image in the message
//         if (msg.attachments.size > 0) {
//             const imageUrl = msg.attachments.first().url;
//             collectedImages.push({ item: itemNames[currentItemIndex], imageUrl });

//             currentItemIndex++;
//             if (currentItemIndex < itemNames.length) {
//                 await interaction.followUp({
//                     content: `Please upload an image for **${itemNames[currentItemIndex]}**.`,
//                     ephemeral: true
//                 });
//             } else {
//                 collector.stop('all_items_collected');
//             }
//         } else {
//             await interaction.followUp({
//                 content: 'Please upload an image file.',
//                 ephemeral: true
//             });
//         }
//     });

//     collector.on('end', async (_, reason) => {
//         if (reason === 'all_items_collected' || reason === 'finished') {
//             // Confirm items and images with the user
//             await interaction.followUp({
//                 content: `Items and images collected:\n${collectedImages.map((data, idx) => `${idx + 1}. **${data.item}**`).join('\n')}
//                 Type **confirm** to proceed or **cancel** to discard.`,
//                 ephemeral: true
//             });

//             // Handle confirmation or cancellation
//             const confirmCollector = interaction.channel.createMessageCollector({
//                 filter: (m) => m.author.id === interaction.user.id && ['confirm', 'cancel'].includes(m.content.toLowerCase()),
//                 max: 1,
//                 time: 30000 // 30-second timeout
//             });

//             confirmCollector.on('collect', async (msg) => {
//                 if (msg.content.toLowerCase() === 'confirm') {
//                     await createNGPEvents(interaction, collectedImages);
//                 } else {
//                     await interaction.followUp({ content: 'Mass distribution canceled.', ephemeral: true });
//                 }
//                 confirmCollector.stop();
//             });
//         } else {
//             await interaction.followUp({ content: 'Mass distribution timed out. Please try again.', ephemeral: true });
//         }
//     });
// }

// // Function to create NGP posts for each item with its image
// async function createNGPEvents(interaction, itemsWithImages) {
//     const raidDay = "today"; // Replace with actual raid day logic if needed
//     const participants = ["User1", "User2"]; // Replace with actual participants list

//     for (const { item, imageUrl } of itemsWithImages) {
//         // Use existing ngpHelpers or relevant logic to post each item with its image
//         const eventId = Date.now().toString();
//         // Emit event or call existing NGP function to create posts
//         // Example message for each NGP post
//         await interaction.channel.send({
//             content: `NGP distribution for ${raidDay} - Item: ${item}`,
//             embeds: [{
//                 title: `NGP Distribution for ${item}`,
//                 description: `Participants: ${participants.join(', ')}`,
//                 image: { url: imageUrl }
//             }]
//         });
//     }

//     await interaction.followUp({ content: 'NGP posts created successfully!', ephemeral: true });
// }

// module.exports = { parseItemsFromInput, startImageCollection };
