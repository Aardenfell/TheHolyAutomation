/**
 * @file privatengp.js
 * @description This file defines the 'privatengp' command, which allows users to create an NGP post for distributing items using a voting system. Users can specify participants, item details, and include additional options for guild raids or custom timers.
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

// Load configuration data
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const ngpSystemEnabled = config.systems.ngpSystem || false;
const guildPointsSystemEnabled = config.systems.guildPointsSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Private NGP

module.exports = {
    // Define the Slash Command
    data: new SlashCommandBuilder()
        .setName('privatengp')
        .setDescription('Creates a Private NGP post (ping participants, 30 minutes or until votes).')
        .addStringOption(option =>
            option
                .setName('item')
                .setDescription('Select an item')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('participants').setDescription('List of participants (space-separated).').setRequired(true)
        )
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Attach an image for the item')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('duration')
                .setDescription('Override the default timer (in minutes).')
                .setRequired(false)
        )
        .addBooleanOption(option => // Add the optional flag for isGuildRaid
            option
                .setName('isguildraid')
                .setDescription('Flag to indicate if this is a Guild Raid NGP')
                .setRequired(false)
        ),

    /**********************************************************************/
    // Execute Command

    /**
     * @function execute
     * @description Execute the privatengp command to create a private NGP post.
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

        // Extract user-provided options from interaction
        const item = interaction.options.getString('item');
        const itemData = itemsData.find(data => data.name.toLowerCase() === item.toLowerCase());
        const rarity = itemData ? itemData.rarity : 'unknown';
        const image = interaction.options.getAttachment('image');
        const isGuildRaid = interaction.options.getBoolean('isguildraid') || false;

        const participantsRaw = interaction.options.getString('participants');
        const participants = participantsRaw.split(/\s+/).map(p => p.trim()).filter(Boolean);

        const timerMinutes = interaction.options.getInteger('duration') || 15;  // Default to 15 minutes for private NGP
        const currentTime = Math.floor(Date.now() / 1000);
        const expiresAt = currentTime + timerMinutes * 60;
        const eventId = Date.now().toString();  // Generate a unique event ID

        /**********************************************************************/
        // Create Action Row and Buttons

        const row = new ActionRowBuilder();
        if (rarity !== 'rare') { // Conditionally add the Need button only if rarity is not "rare"
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

        if (guildPointsSystemEnabled) { // Conditionally add the Bid button if the guild points system is enabled
            const bidButton = new ButtonBuilder()
                .setCustomId(`test_bid_${eventId}`)
                .setLabel('Bid')
                .setStyle(ButtonStyle.Danger);
            row.addComponents(bidButton);
        }

        row.addComponents(helpButton);

        /**********************************************************************/
        // Create Embed for Item and Participant Details

        const ngpEmbed = new EmbedBuilder()
            .setTitle(`[**${item}**]`)
            .setDescription(
                `**Participants**: ${participants.join(', ')}\n` +
                `**Expires**: <t:${expiresAt}:R> (Ends <t:${expiresAt}:T>)`
            )
            .setColor('Random')
            .setImage(image.url);

        // Send message to participants with the embed and buttons
        const sentMessage = await interaction.reply({
            content: `Private NGP created! Participants: ${participants.join(', ')}`,
            embeds: [ngpEmbed],
            components: [row],
            fetchReply: true,
        });

        /**********************************************************************/
        // Format Participants and Emit Event

        const formattedParticipants = participants.map(participant => ({
            name: participant.trim(),
            roll_type: null,
            roll_value: null
        }));

        // Emit the event to create the NGP
        eventEmitter.emit('createNGPEvent', {
            eventId,
            item,
            rarity,
            participants: formattedParticipants,
            expiresAt,
            messageId: sentMessage.id,
            channelId: sentMessage.channel.id,
            isGuildRaid,
        });

        // Log event creation
        console.log('NGP event created and saved with messageId:', sentMessage.id);
    },
};
