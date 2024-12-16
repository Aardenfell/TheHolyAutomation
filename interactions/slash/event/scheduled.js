/**
 * @file scheduled.js
 * @description Slash command to display scheduled events in the current guild.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to the JSON file containing event data
const eventDataPath = path.join(__dirname, '../../../data/scheduledEvents.json');

/**
 * @description Slash command to display scheduled events.
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('scheduled')
        .setDescription('Fetch and display the scheduled events for this server.'),

    /**
     * @description Executes the scheduled events slash command.
     * @param {import('discord.js').ChatInputCommandInteraction} interaction - The interaction object.
     */
    async execute(interaction) {
        try {
            // Defer the reply to handle potential latency in reading data
            await interaction.deferReply();

            // Check if the JSON file exists and read it
            if (!fs.existsSync(eventDataPath)) {
                return interaction.editReply('No scheduled events data found. Please try again later.');
            }

            const eventData = JSON.parse(fs.readFileSync(eventDataPath, 'utf-8'));
            if (eventData.length === 0) {
                return interaction.editReply('No scheduled events found for this server.');
            }

            // Iterate through events and build embed output
            const embeds = eventData.map(event => {
                const startTime = event.scheduledStartTimestamp
                    ? `<t:${event.scheduledStartTimestamp}:F>` // Discord timestamp
                    : 'Not specified';
                const endTime = event.scheduledEndTimestamp
                    ? `<t:${event.scheduledEndTimestamp}:F>` // Discord timestamp
                    : 'Not specified';

                const interestedUsers = event.interestedUsers?.users.join('\n') || 'No interested users.';

                return new EmbedBuilder()
                    .setTitle(event.name)
                    .setColor('Random')
                    .setDescription(event.description || 'No description provided.')
                    .addFields(
                        { name: 'Status', value: event.status, inline: true },
                        { name: 'Start Time', value: startTime, inline: true },
                        { name: 'End Time', value: endTime, inline: true },
                        { name: 'Entity Type', value: event.entityType.name, inline: true },
                        { name: 'Location', value: event.location || 'N/A', inline: true },
                        { name: `Interested Users (${event.interestedUsers?.count || '0'})`, value: interestedUsers }
                    )
                    .setTimestamp();
            });

            // Send the embeds in the reply
            await interaction.editReply({ embeds });
        } catch (error) {
            console.error('Error fetching scheduled events from JSON:', error);
            await interaction.editReply('An error occurred while fetching the scheduled events. Please try again later.');
        }
    },
};