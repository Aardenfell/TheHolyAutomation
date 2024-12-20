/**
 * @file manageSchedule.js
 * @description Command to manage events stored in toBeScheduled.json, with optional updates to Discord API.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Paths to JSON data
const toBeScheduledPath = path.join(__dirname, '../../../data/toBeScheduled.json');
const scheduledEventsPath = path.join(__dirname, '../../../data/scheduledEvents.json');

// Load and save JSON utility functions
const loadJsonData = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const saveJsonData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

/**
 * @function parseDateTime
 * @description Converts DD/MM/YY HH:MM or DD/MM HH:MM to ISO 8601 format.
 * @param {string} input - The user-friendly date/time string.
 * @returns {string|null} ISO 8601 formatted string or null if invalid.
 */
function parseDateTime(input) {
    const dateTimeRegex = /^(\d{2})\/(\d{2})(?:\/(\d{2}))?\s+(\d{2}):(\d{2})$/;
    const match = input.match(dateTimeRegex);

    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // JS months are 0-based
    const year = match[3] ? 2000 + parseInt(match[3], 10) : new Date().getFullYear();
    const hour = parseInt(match[4], 10);
    const minute = parseInt(match[5], 10);

    const date = new Date(year, month, day, hour, minute);
    return isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * @function updateDiscordEvent
 * @description Updates the scheduled event via Discord API using local cache.
 * @param {object} guild - The Discord guild object.
 * @param {object} originalEventData - The original event data before changes.
 * @param {object} updatedEventData - The updated event data to apply.
 * @param {string} scheduledEventsPath - Path to the local cache of events.
 * @returns {Promise<void>}
 */
async function updateDiscordEvent(guild, originalEventData, updatedEventData, scheduledEventsPath) {
    try {
        const scheduledEvents = JSON.parse(fs.readFileSync(scheduledEventsPath, 'utf-8'));

        // Normalize originalEventData scheduled time to Unix timestamp for comparison
        const originalStartTimestamp = new Date(originalEventData.scheduledTime).getTime();

        // Find the matching event in the local cache
        const targetEvent = scheduledEvents.find(event =>
            event.name === originalEventData.name &&
            event.scheduledStartTimestamp === originalStartTimestamp
        );

        if (!targetEvent) throw new Error('Event not found in local cache');

        // Fetch the event from Discord
        const scheduledEvent = await guild.scheduledEvents.fetch(targetEvent.id);
        if (!scheduledEvent) throw new Error('Event not found on Discord.');

        // Update the event on Discord
        await scheduledEvent.edit({
            name: updatedEventData.name,
            scheduledStartTime: new Date(updatedEventData.scheduledTime),
            scheduledEndTime: new Date(
                new Date(updatedEventData.scheduledTime).getTime() + updatedEventData.duration * 60 * 1000
            ),
            description: updatedEventData.description,
            entityMetadata: updatedEventData.location ? { location: updatedEventData.location } : undefined,
        });

        console.log(`[MANAGE SCHEDULE] Updated Discord event "${updatedEventData.name}".`);
    } catch (error) {
        console.error(`[MANAGE SCHEDULE] Failed to update event on Discord: ${error.message}`);
    }
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('manageschedule')
        .setDescription('Manage scheduled events stored in toBeScheduled.json.')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('ID of the event to manage.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform.')
                .setRequired(true)
                .addChoices(
                    { name: 'Edit Name', value: 'edit_name' },
                    { name: 'Edit Start Time', value: 'edit_time' },
                    { name: 'Edit Duration', value: 'edit_duration' },
                    { name: 'Edit Ping Roles', value: 'edit_pings' },
                    { name: 'Edit Frequency', value: 'edit_frequency' },
                    { name: 'Delete Event', value: 'delete' }
                )
        )
        .addStringOption(option =>
            option.setName('new_value')
                .setDescription('Provide the new value based on the selected action.')
                .setAutocomplete(true) // Enables dynamic suggestions for `new_value`
        ),

    async execute(interaction) {
        const eventId = interaction.options.getString('event_id');
        const action = interaction.options.getString('action');
        const newValue = interaction.options.getString('new_value');

        const toBeScheduled = loadJsonData(toBeScheduledPath);
        const event = toBeScheduled.find(e => e.id === eventId);

        if (!event) {
            return interaction.reply({ content: `Event with ID "${eventId}" not found.`, ephemeral: true });
        }

        const scheduledEventsPath = path.join(__dirname, '../../../data/scheduledEvents.json');
        const originalEventData = { ...event }; // Shallow copy the original event data

        switch (action) {
            case 'edit_name':
                event.name = newValue;
                break;
            case 'edit_time':
                const isoDate = parseDateTime(newValue);
                if (!isoDate) {
                    return interaction.reply({ content: 'Invalid date format. Use DD/MM/YY HH:MM or DD/MM HH:MM.', ephemeral: true });
                }
                event.scheduledTime = isoDate;
                break;
            case 'edit_duration':
                const duration = parseInt(newValue, 10);
                if (isNaN(duration) || duration <= 0) {
                    return interaction.reply({ content: 'Duration must be a positive number.', ephemeral: true });
                }
                event.duration = duration;
                break;
            case 'edit_pings':
                event.description = `Announce to:\n${newValue.split(' ').join('\n')}`;
                break;
            case 'edit_frequency':
                if (!['daily', 'weekly', 'custom', 'none'].includes(newValue)) {
                    return interaction.reply({ content: 'Invalid frequency. Choose daily, weekly, custom, or none.', ephemeral: true });
                }
                event.frequency = newValue;
                // Skip API update for frequency changes
                saveJsonData(toBeScheduledPath, toBeScheduled);
                return interaction.reply({ content: `Frequency for event "${event.name}" has been updated.`, ephemeral: true });
            case 'delete':
                toBeScheduled.splice(toBeScheduled.indexOf(event), 1);
                saveJsonData(toBeScheduledPath, toBeScheduled);
                return interaction.reply({ content: `Event "${event.name}" has been deleted.`, ephemeral: true });
            default:
                return interaction.reply({ content: 'Invalid action.', ephemeral: true });
        }

        // Save updated event data to toBeScheduled.json
        saveJsonData(toBeScheduledPath, toBeScheduled);

        // Always update the Discord API except for frequency changes
        const guild = interaction.guild;
        if (!guild) {
            return interaction.reply({ content: 'This command must be run in a Discord server.', ephemeral: true });
        }
        await updateDiscordEvent(guild, originalEventData, event, scheduledEventsPath);

        return interaction.reply({ content: `Event "${event.name}" has been updated.`, ephemeral: true });
    },
};
