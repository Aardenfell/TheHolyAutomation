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
const toBeScheduledPath = path.join(__dirname, '../../../data/tobescheduled.json');

// Load and save JSON utility functions
const loadJsonData = (filePath) => {
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

const saveJsonData = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

/**
 * @function updateDiscordEvent
 * @description Updates the scheduled event via Discord API.
 * @param {object} guild - The Discord guild object.
 * @param {object} eventData - The updated event data.
 * @returns {Promise<void>}
 */
async function updateDiscordEvent(guild, eventData) {
    try {
        const scheduledEvent = await guild.scheduledEvents.fetch(eventData.id);
        if (!scheduledEvent) throw new Error('Event not found on Discord.');

        await scheduledEvent.edit({
            name: eventData.name,
            scheduledStartTime: new Date(eventData.scheduledTime),
            scheduledEndTime: new Date(new Date(eventData.scheduledTime).getTime() + eventData.duration * 60 * 1000),
            description: eventData.description,
            entityMetadata: eventData.location ? { location: eventData.location } : undefined,
        });

        console.log(`[MANAGE SCHEDULE] Updated Discord event "${eventData.name}".`);
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
                .setDescription('The new value for the selected action.')
        )
        .addBooleanOption(option =>
            option.setName('update_api')
                .setDescription('Apply changes to Discord API. (Default: false)')
        ),

    async execute(interaction) {
        const eventId = interaction.options.getString('event_id');
        const action = interaction.options.getString('action');
        const newValue = interaction.options.getString('new_value');
        const updateApi = interaction.options.getBoolean('update_api') || false;

        const toBeScheduled = loadJsonData(toBeScheduledPath);
        const event = toBeScheduled.find(e => e.id === eventId);

        if (!event) {
            return interaction.reply({ content: `Event with ID "${eventId}" not found.`, ephemeral: true });
        }

        switch (action) {
            case 'edit_name':
                event.name = newValue;
                break;
            case 'edit_time':
                if (isNaN(Date.parse(newValue))) {
                    return interaction.reply({ content: 'Invalid date format. Use YYYY-MM-DDTHH:MM.', ephemeral: true });
                }
                event.scheduledTime = new Date(newValue).toISOString();
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
                break;
            case 'delete':
                toBeScheduled.splice(toBeScheduled.indexOf(event), 1);
                saveJsonData(toBeScheduledPath, toBeScheduled);
                return interaction.reply({ content: `Event "${event.name}" has been deleted.`, ephemeral: true });
            default:
                return interaction.reply({ content: 'Invalid action.', ephemeral: true });
        }

        // Save updated event data
        saveJsonData(toBeScheduledPath, toBeScheduled);

        // Optionally update the Discord API
        if (updateApi) {
            const guild = interaction.guild;
            if (!guild) {
                return interaction.reply({ content: 'This command must be run in a Discord server.', ephemeral: true });
            }
            await updateDiscordEvent(guild, event);
        }

        return interaction.reply({ content: `Event "${event.name}" has been updated.`, ephemeral: true });
    },
};
