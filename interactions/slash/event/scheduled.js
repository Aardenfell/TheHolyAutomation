/**
 * @file scheduled.js
 * @description Slash command to display scheduled events in the current guild.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
            // Defer the reply to handle potential latency in fetching data
            await interaction.deferReply();

            // Get the guild and ensure it exists
            const guild = interaction.guild;
            if (!guild) {
                return interaction.editReply('This command can only be used within a server.');
            }

            // Fetch events from the guild
            const events = await guild.scheduledEvents.fetch();
            if (events.size === 0) {
                return interaction.editReply('No scheduled events found for this server.');
            }

            // Iterate through events and build embed output
            const embeds = [];
            for (const event of events.values()) {
                const status = event.status === 1
                    ? 'Scheduled'
                    : event.status === 2
                        ? 'Active'
                        : event.status === 3
                            ? 'Completed'
                            : 'Canceled';

                const entityType = event.entityType === 1
                    ? 'Stage Instance'
                    : event.entityType === 2
                        ? 'Voice'
                        : event.entityType === 3
                            ? 'External'
                            : 'Unknown';

                const startTime = event.scheduledStartAt
                    ? event.scheduledStartAt.toLocaleString()
                    : 'Not specified';

                const endTime = event.scheduledEndAt
                    ? event.scheduledEndAt.toLocaleString()
                    : 'Not specified';

                const location = event.entityMetadata?.location || 'N/A';

                // Fetch users interested in the event
                let userList = 'No interested users.';
                try {
                    const interestedUsers = await event.fetchSubscribers();
                    if (interestedUsers.size > 0) {
                        userList = interestedUsers
                            .map(subscriber => `<@${subscriber.user.id}>`) // Use mention format
                            .join('\n');
                    }
                } catch (fetchError) {
                    console.error(`Error fetching subscribers for event ${event.name}:`, fetchError);
                }

                const embed = new EmbedBuilder()
                    .setTitle(event.name)
                    .setColor('Random')
                    .setDescription(event.description || 'No description provided.')
                    .addFields(
                        { name: 'Status', value: status, inline: true },
                        { name: 'Start Time', value: startTime, inline: true },
                        { name: 'End Time', value: endTime, inline: true },
                        { name: 'Entity Type', value: entityType, inline: true },
                        { name: 'Location', value: location, inline: true },
                        { name: `Interested Users (${event.userCount || '0'})`, value: userList }
                    )
                    .setTimestamp(); // Add a timestamp to each embed

                embeds.push(embed);
            }

            // Send the embeds in the reply
            await interaction.editReply({ embeds });
        } catch (error) {
            console.error('Error fetching scheduled events:', error);
            await interaction.editReply('An error occurred while fetching the scheduled events. Please try again later.');
        }
    },
};
