/**
 * @file schedule.js
 * @description Slash command to create scheduled events with optional custom frequency handling.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to the custom frequency events JSON file
const toBeScheduledPath = path.join(__dirname, '../../../data/tobescheduled.json');

/**
 * @function saveToBeScheduled
 * @description Save custom frequency events to the JSON file.
 * @param {object} event - The event data to save.
 */
function saveToBeScheduled(event) {
    let events = [];
    if (fs.existsSync(toBeScheduledPath)) {
        events = JSON.parse(fs.readFileSync(toBeScheduledPath, 'utf-8'));
    }
    events.push(event);
    fs.writeFileSync(toBeScheduledPath, JSON.stringify(events, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schedule')
        .setDescription('Create a scheduled event.')
        .addStringOption(option =>
            option
                .setName('name')
                .setDescription('The name of the event.')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('date')
                .setDescription('The date of the event (DD/MM/YY or DD/MM).')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('time')
                .setDescription('The time of the event (HH:MM in 24-hour format).')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('frequency')
                .setDescription('The frequency of the event.')
                .addChoices(
                    { name: 'None (One-Time)', value: 'none' },
                    { name: 'Daily', value: 'daily' },
                    { name: 'Weekly', value: 'weekly' },
                    { name: 'Custom', value: 'custom' }
                )
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('location')
                .setDescription('The location of the event (optional).')
        )
        .addStringOption(option =>
            option
                .setName('description')
                .setDescription('A description for the event (optional).')
        ),

    async execute(interaction) {
        try {
            const name = interaction.options.getString('name');
            const dateInput = interaction.options.getString('date');
            const timeInput = interaction.options.getString('time');
            const frequency = interaction.options.getString('frequency');
            const location = interaction.options.getString('location') || 'N/A';
            const description = interaction.options.getString('description') || 'No description provided.';

            // Parse the date input
            const dateParts = dateInput.split('/');
            if (dateParts.length < 2 || dateParts.length > 3) {
                return interaction.reply({
                    content: 'Invalid date format. Please use DD/MM/YY or DD/MM.',
                    ephemeral: true,
                });
            }

            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // JS months are 0-based
            const year = dateParts[2] ? parseInt(dateParts[2], 10) + 2000 : new Date().getFullYear();

            // Validate date
            if (isNaN(day) || isNaN(month) || isNaN(year)) {
                return interaction.reply({
                    content: 'Invalid date. Please ensure the date is in DD/MM/YY or DD/MM format.',
                    ephemeral: true,
                });
            }

            // Parse the time input
            const timeParts = timeInput.split(':');
            if (timeParts.length !== 2) {
                return interaction.reply({
                    content: 'Invalid time format. Please use HH:MM in 24-hour format.',
                    ephemeral: true,
                });
            }

            const hour = parseInt(timeParts[0], 10);
            const minute = parseInt(timeParts[1], 10);

            // Validate time
            if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                return interaction.reply({
                    content: 'Invalid time. Please ensure the time is in HH:MM (24-hour format).',
                    ephemeral: true,
                });
            }

            // Combine date and time into an ISO8601 timestamp
            const eventDate = new Date(year, month, day, hour, minute);
            if (isNaN(eventDate.getTime())) {
                return interaction.reply({
                    content: 'Invalid date or time. Please ensure both are valid.',
                    ephemeral: true,
                });
            }

            // Check if the combined date is in the past
            if (eventDate < new Date()) {
                return interaction.reply({
                    content: 'You cannot schedule an event in the past.',
                    ephemeral: true,
                });
            }

            // Use the formatted timestamp for scheduling
            const isoTimestamp = eventDate.toISOString();

            // Native event creation logic or saving to `tobescheduled.json` remains the same
            if (frequency === 'none') {
                const guild = interaction.guild;
                if (!guild) {
                    return interaction.reply({
                        content: 'This command can only be used within a server.',
                        ephemeral: true,
                    });
                }

                const createdEvent = await guild.scheduledEvents.create({
                    name,
                    scheduledStartTime: eventDate,
                    privacyLevel: 2, // Guild only
                    entityType: location === 'N/A' ? 2 : 3, // Voice or External
                    entityMetadata: location === 'N/A' ? undefined : { location },
                    description,
                });

                return interaction.reply({
                    content: `Event "${createdEvent.name}" scheduled successfully for ${eventDate.toLocaleString()}!`,
                });
            }

            // Custom frequency logic remains unchanged
            const eventId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const eventData = {
                id: eventId,
                name,
                description,
                scheduledTime: isoTimestamp,
                frequency,
                location,
                createdBy: interaction.user.id,
            };

            saveToBeScheduled(eventData);

            return interaction.reply({
                content: `Event "${name}" saved for custom scheduling with frequency: ${frequency}.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error('Error creating event:', error);
            return interaction.reply({
                content: 'An error occurred while creating the event. Please try again later.',
                ephemeral: true,
            });
        }
    },
};
