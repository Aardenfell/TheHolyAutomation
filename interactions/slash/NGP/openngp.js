/**
 * @file openngp.js
 * @description Handles the creation of an open NGP (Need/Greed/Pass) post, which includes an item embed, action buttons, and event tracking.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const eventEmitter = require('../../../utils/ngpEvents.js');
const itemsData = require('../../../data/items.json');
const fs = require('fs');
const path = require('path');

// Load configuration
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));

// Check if NGP system is enabled
const ngpSystemEnabled = config.systems.ngpSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Open NGP

module.exports = {
    // Define the slash command using SlashCommandBuilder
    data: new SlashCommandBuilder()
        .setName('openngp')
        .setDescription('Creates an Open NGP post (everyone pinged, 48 hours).')
        .addStringOption((option) =>
            option
                .setName('item')
                .setDescription('The item to roll for.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addAttachmentOption((option) =>
            option
                .setName('image')
                .setDescription('Attach an image for the item')
                .setRequired(true)
        ),

    /**
     * @function execute
     * @description Command execution logic to handle creating an Open NGP post.
     * @param {object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        // Check if NGP system is enabled
        if (!ngpSystemEnabled) {
            return await interaction.reply({
                content: 'The NGP system is currently disabled.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Retrieve Item Data and Image from Interaction Options

        const item = interaction.options.getString('item');
        const itemData = itemsData.find((data) => data.name.toLowerCase() === item.toLowerCase());
        const rarity = itemData ? itemData.rarity : 'unknown';
        const image = interaction.options.getAttachment('image');

        /**********************************************************************/
        // Timer and Event Data Setup

        // Set the timer for the NGP post (48 hours in minutes)
        const timerMinutes = 48 * 60;
        const participants = ['@everyone'];  // For Open NGP, participants are everyone

        // Get current time in Unix format (seconds since epoch)
        const currentTime = Math.floor(Date.now() / 1000);

        // Calculate expiration time based on 48-hour timer
        const expiresAt = currentTime + timerMinutes * 60;

        // Generate a unique event ID
        const eventId = Date.now().toString();

        /**********************************************************************/
        // Create Action Buttons for NGP Post

        const row = new ActionRowBuilder();

        // Conditionally add the Need button only if rarity is not "rare"
        if (rarity !== 'rare') {
            const needButton = new ButtonBuilder()
                .setCustomId(`ngp_need_${eventId}`)
                .setLabel('Need')
                .setStyle(ButtonStyle.Success);
            row.addComponents(needButton);
        }

        // Create Greed, Pass, and Help buttons
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

        row.addComponents(greedButton, passButton, helpButton);

        /**********************************************************************/
        // Create and Send NGP Embed

        const ngpEmbed = new EmbedBuilder()
            .setTitle(`Open NGP Created for [**${item}**]`)
            .setDescription(
                `**Participants**: @everyone\n` +
                `**Expires**: <t:${expiresAt}:R> (Ends <t:${expiresAt}:T>)`
            )
            .setColor('Random')
            .setImage(image.url);

        // Send the NGP post with a ping to @roleId
        const roleId = config.roles.openNGP;
        const sentMessage = await interaction.reply({
            content: `<@&${roleId}>`,
            embeds: [ngpEmbed],
            components: [row],
            allowedMentions: { roles: [roleId] },
            fetchReply: true,
        });

        /**********************************************************************/
        // Save Event Data and Emit Event

        // Save the message ID and channel ID to use for thread creation later
        const channelId = sentMessage.channel.id;
        const messageId = sentMessage.id;

        // Emit the createNGPEvent with relevant data
        eventEmitter.emit('createNGPEvent', {
            eventId,
            item,
            rarity,
            participants: [],
            expiresAt,
            is_open_ngp: true,
            messageId,  // Save the messageId in event data
            channelId,  // Store the channel ID
        });

        console.log('NGP event created and saved with messageId:', messageId);
    },
};
