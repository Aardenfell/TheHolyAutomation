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
const { checkScheduledEvents } = require('../../../utils/eventChecker');

// Path to the JSON file storing scheduled event data
const eventDataPath = path.join(__dirname, '../../../data/scheduledEvents.json');

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
            await interaction.deferReply();

            let eventData;

            // Attempt to read and parse the JSON data
            try {
                const rawData = fs.readFileSync(eventDataPath, 'utf-8');
                eventData = JSON.parse(rawData);

                // Handle the case of empty or malformed JSON data
                if (!Array.isArray(eventData) || eventData.length === 0) {
                    throw new Error('Empty or invalid event data.');
                }
            } catch (error) {
                console.warn('[SCHEDULED] Event data is missing or invalid. Fetching fresh data...');
                
                // Run the event checker to fetch and save data
                const client = interaction.client;
                await checkScheduledEvents(client);

                // Wait for a moment to ensure the file has been written
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Attempt to read the file again
                const rawData = fs.readFileSync(eventDataPath, 'utf-8');
                eventData = JSON.parse(rawData);

                // If still empty, reply with a failure message
                if (!Array.isArray(eventData) || eventData.length === 0) {
                    return interaction.editReply('No scheduled events found for this server.');
                }
            }

            // Process the event data into embeds
            const embeds = eventData.map(event => {
                const { name, description, status, scheduledStartTimestamp, scheduledEndTimestamp, entityType, location, interestedUsers } = event;

                const startTime = scheduledStartTimestamp
                    ? `<t:${Math.floor(scheduledStartTimestamp / 1000)}:F>`
                    : 'Not specified';
                const endTime = scheduledEndTimestamp
                    ? `<t:${Math.floor(scheduledEndTimestamp / 1000)}:F>`
                    : 'Not specified';

                return new EmbedBuilder()
                    .setTitle(name)
                    .setColor('Random')
                    .setDescription(description || 'No description provided.')
                    .addFields(
                        { name: 'Status', value: status, inline: true },
                        { name: 'Start Time', value: startTime, inline: true },
                        { name: 'End Time', value: endTime, inline: true },
                        { name: 'Entity Type', value: entityType.name || 'Unknown', inline: true },
                        { name: 'Location', value: location || 'N/A', inline: true },
                        {
                            name: `Interested Users (${interestedUsers.count || 0})`,
                            value: interestedUsers.users.length > 0 ? interestedUsers.users.join('\n') : 'No interested users.',
                        }
                    )
                    .setTimestamp();
            });

            // Send the embeds in the reply
            // TODO: #18 /scheduled output causes DiscordAPIError[50035]: Invalid Form Body @Aardenfell
            await interaction.editReply({ embeds });
        } catch (error) {
            console.error('Error executing /scheduled command:', error);
            await interaction.editReply('An error occurred while fetching scheduled events. Please try again later.');
        }
    },
};
