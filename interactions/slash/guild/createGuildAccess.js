/**
 * @file createGuildAccess.js
 * @description This command creates a guild access post with rules and buttons for different types of members.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

// Import necessary classes from discord.js library
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Colors } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Load configuration settings
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const guildAccessSystemEnabled = config.systems.guildAccessSystem || false;

/**********************************************************************/
// Module Exports - Guild Access Command Execution

// Export the command module
module.exports = {
    // Command metadata
    data: new SlashCommandBuilder()
        .setName('create_guild_access')
        .setDescription('Creates a guild access post with rules and buttons.'),
    
    /**
     * @async
     * @function execute
     * @description Executes the slash command to create the guild access post.
     * @param {import('discord.js').CommandInteraction} interaction - The interaction object representing the command.
     */
    async execute(interaction) {
        // Check if Guild Access system is enabled
        if (!guildAccessSystemEnabled) {
            return await interaction.reply({
                content: 'The Guild Access system is currently disabled.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Create Guild Access Embed

        // Create an embed with guild access rules
        const embed = new EmbedBuilder()
            .setTitle('Guild Access Rules')
            .setDescription(
                `Welcome to our guild! Please read and understand the rules below:  
                - Follow the guild guidelines.  
                - Respect fellow members.  
                - Visit <#1308067406924615741> for detailed information.  

                **IF YOU AGREE/UNDERSTAND THE ABOVE THEN:**
                **Choose one of the following options to proceed:**
                New Recruit: You've already joined the guild
                Visitor: You're waiting to join/looking around
                Envoy: You're from another guild to discuss business`
            )
            .setColor(Colors.Blue); // Use predefined color constant

        /**********************************************************************/
        // Create Action Row with Buttons

        // Create an action row with buttons for different access options
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('new_recruit')
                .setLabel('New Recruit')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('visitor_access')
                .setLabel('Visitor')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('envoy_access')
                .setLabel('Envoy')
                .setStyle(ButtonStyle.Secondary)
        );

        /**********************************************************************/
        // Send Guild Access Post

        // Send the embed and buttons as a reply to the interaction
        await interaction.reply({ embeds: [embed], components: [row] });
    },
};
