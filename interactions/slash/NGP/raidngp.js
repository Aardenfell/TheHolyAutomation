/**
 * @file raidngp.js
 * @description Creates a Guild NGP post for a raid, fetching participants automatically.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eventEmitter = require('../../../utils/ngpEvents.js');
const fs = require('fs');
const path = require('path');

// Paths to data files
const raidSignUpsPath = path.join(__dirname, '../../../data/raidSignUps.json');
const itemsData = require('../../../data/items.json');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));

// System toggles from config
const ngpSystemEnabled = config.systems.ngpSystem || false;
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Raid NGP

module.exports = {
    data: new SlashCommandBuilder()
        .setName('raidngp')
        .setDescription('Creates a Guild NGP post for a raid (participants auto-fetched).')
        .addStringOption(option =>
            option
                .setName('item')
                .setDescription('Select an item')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option
                .setName('raid')
                .setDescription('Select the raid (autocompletes from signed-in raids).')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Attach an image for the item')
                .setRequired(true)
        ),

    /**
     * @function execute
     * @description Executes the command to create a Guild NGP post.
     * @param {import('discord.js').CommandInteraction} interaction The command interaction.
     */
    async execute(interaction) {
        // Check if NGP system is enabled
        if (!ngpSystemEnabled) {
            return await interaction.reply({
                content: 'The NGP system is currently disabled.',
                ephemeral: true,
            });
        }

        // Fetch interaction options
        const item = interaction.options.getString('item');
        const raidMessageId = interaction.options.getString('raid'); // The messageId of the selected raid
        const image = interaction.options.getAttachment('image');

        // Fetch item data for rarity
        const itemData = itemsData.find(data => data.name.toLowerCase() === item.toLowerCase());
        const rarity = itemData ? itemData.rarity : 'unknown';

        /**********************************************************************/
        // Validate Raid Sign-Ups Data

        if (!fs.existsSync(raidSignUpsPath)) {
            return await interaction.reply({
                content: `The raid sign-up data file is missing. Please contact an admin.`,
                ephemeral: true,
            });
        }

        let raidSignUps = [];
        try {
            raidSignUps = JSON.parse(fs.readFileSync(raidSignUpsPath, 'utf8'));
            if (!Array.isArray(raidSignUps)) throw new Error('Invalid raid sign-up data format.');
        } catch (error) {
            console.error('Error reading raid sign-ups:', error);
            return await interaction.reply({
                content: `Failed to load raid sign-up data. Please contact an admin.`,
                ephemeral: true,
            });
        }

        // Find the selected raid
        const selectedRaid = raidSignUps.find(raid => raid.messageId === raidMessageId);
        if (!selectedRaid) {
            return await interaction.reply({
                content: `No raid found with the provided ID. Please ensure the selected raid is valid.`,
                ephemeral: true,
            });
        }

        // Validate participants
        if (!selectedRaid.signedIn || !Array.isArray(selectedRaid.signedIn) || selectedRaid.signedIn.length === 0) {
            return await interaction.reply({
                content: `No participants found for the selected raid. Make sure the raid is active and has sign-ups.`,
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Prepare Participants and Event Details

        const participants = selectedRaid.signedIn.map(id => `<@${id}>`);
        const timerMinutes = 15; // 15 minutes default for guild NGP
        const currentTime = Math.floor(Date.now() / 1000);
        const expiresAt = currentTime + timerMinutes * 60;
        const eventId = Date.now().toString(); // Generate a unique event ID

        /**********************************************************************/
        // Create Action Buttons

        const row = new ActionRowBuilder();
        if (rarity !== 'rare') {
            const needButton = new ButtonBuilder()
                .setCustomId(`ngp_need_${eventId}`)
                .setLabel('Need')
                .setStyle(ButtonStyle.Success);
            row.addComponents(needButton);
        }

        const greedButton = new ButtonBuilder()
            .setCustomId(`ngp_greed_${eventId}`)
            .setLabel('Greed')
            .setStyle(ButtonStyle.Danger);

        const passButton = new ButtonBuilder()
            .setCustomId(`ngp_pass_${eventId}`)
            .setLabel('Pass')
            .setStyle(ButtonStyle.Primary);

        const helpButton = new ButtonBuilder()
            .setCustomId('ngp_help')
            .setLabel('Help')
            .setStyle(ButtonStyle.Secondary);

        row.addComponents(greedButton, passButton);

        if (guildPointsSystemEnabled) {
            const bidButton = new ButtonBuilder()
                .setCustomId(`test_bid_${eventId}`)
                .setLabel('Bid')
                .setStyle(ButtonStyle.Danger);
            row.addComponents(bidButton);
        }

        row.addComponents(helpButton);

        /**********************************************************************/
        // Create Embed for the NGP Event

        const ngpEmbed = new EmbedBuilder()
            .setTitle(`[**${item}**]`)
            .setDescription(
                `**Participants**: ${participants.join(', ')}\n` +
                `**Expires**: <t:${expiresAt}:R> (Ends <t:${expiresAt}:T>)`
            )
            .setColor('Random')
            .setImage(image.url);

        /**********************************************************************/
        // Send the NGP Message with Embed and Buttons

        const sentMessage = await interaction.reply({
            content: `Guild NGP created! Participants from the ${selectedRaid.day} raid: ${participants.join(', ')}.`,
            embeds: [ngpEmbed],
            components: [row],
            fetchReply: true,
        });

        /**********************************************************************/
        // Emit Event with Participants and Details

        const formattedParticipants = selectedRaid.signedIn.map(id => ({
            name: `<@${id}>`,
            roll_type: null,
            roll_value: null
        }));

        eventEmitter.emit('createNGPEvent', {
            eventId,
            item,
            rarity,
            participants: formattedParticipants,
            expiresAt,
            messageId: sentMessage.id,
            channelId: sentMessage.channel.id,
            isGuildRaid: true,
        });

        console.log('NGP event created and saved with messageId:', sentMessage.id);
    },
};
