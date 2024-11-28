

// const { ActionRowBuilder, TextInputBuilder, TextInputStyle, ModalBuilder } = require('discord.js');
// const pollHelpers = require('../../../utils/pollHelpers.js');

// module.exports = {
//     id: 'ngpDistributionModal',

//     /**
//      * @description Executes when the distribution modal is submitted.
//      * @param {import('discord.js').Interaction & { client: import('../typings').Client }} interaction The interaction which was created
//      */
//     async execute(interaction) {
//         const raidDay = interaction.customId.split('_')[1]; // Assuming raidDay info is in customId

//         // Retrieve multiple item names, rarities, and images from text input
//         const itemsInput = interaction.fields.getTextInputValue('items');
//         const raritiesInput = interaction.fields.getTextInputValue('rarities');
//         const imagesInput = interaction.fields.getTextInputValue('images');

//         // Process inputs as lists (comma-separated)
//         const itemNames = itemsInput.split(',').map(item => item.trim());
//         const itemRarities = raritiesInput.split(',').map(rarity => rarity.trim());
//         const itemImages = imagesInput.split(',').map(imageUrl => imageUrl.trim());

//         // Create item array, each with name, rarity, and image
//         const items = itemNames.map((name, index) => ({
//             name,
//             rarity: itemRarities[index] || 'unknown', // Default to 'unknown' if no rarity
//             imageUrl: itemImages[index] || '' // Default to empty if no image
//         }));

//         // Pull existing sign-ups or data for this raid day
//         const dayData = pollHelpers.getRaidDayData(raidDay);

//         if (!dayData || !dayData.signUps) {
//             return interaction.reply({ content: `No sign-ups found for ${raidDay}.`, ephemeral: true });
//         }

//         // Start the NGP distribution for all items
//         await pollHelpers.startNGPDistribution(interaction.client, raidDay, dayData.signUps, items);

//         await interaction.reply({
//             content: `NGP distribution has started for items: ${itemNames.join(', ')} on ${raidDay}.`,
//             ephemeral: true
//         });
//     }
// };
