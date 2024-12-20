/**
 * @file manageScheduleAutocomplete.js
 * @description Handles the autocomplete interaction for the "manageschedule" command to assist users with selecting events and dynamic suggestions for new values.
 * @author Aardenfell
 * @since inDev
 * @version inDev
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');

// Path to JSON data file
const toBeScheduledPath = path.join(__dirname, '../../../data/tobescheduled.json');

/**********************************************************************/
// Module Exports - Autocomplete Command Execution

module.exports = {
    name: 'manageschedule', // This should match the command name

    /**
     * @function execute
     * @description Executes autocomplete for the "manageschedule" command.
     * @param {import('discord.js').AutocompleteInteraction} interaction The autocomplete interaction.
     */
    async execute(interaction) {
        const focusedValue = interaction.options.getFocused();
        const optionName = interaction.options.getFocused(true).name; // Detect which option is being autocompleted
        const action = interaction.options.getString('action'); // Get the selected action if available

        // Suggestions for `new_value` based on action
        const suggestions = {
            edit_name: ['New Event Name Example 1', 'Event Name Example 2'],
            edit_time: ['Format(24hr):','DD/MM/YY HH:MM', '21/12/24 20:00'],
            edit_duration: ['Format(in minutes):','15', '30', '60'], // in minutes
            edit_frequency: ['Format:','daily', 'weekly', 'custom', 'none'],
        };

        

        
        if (optionName === 'new_value') {
            if (action === 'edit_pings') {
                // Fetch all roles from the server and filter based on input
                const roles = interaction.guild.roles.cache
                    .filter(role => role.name.toLowerCase().includes(focusedValue.toLowerCase()))
                    .map(role => ({
                        name: role.name,
                        value: `<@&${role.id}>`, // Return mention format
                    }));

                return await interaction.respond(roles.slice(0, 25)); // Limit to the first 25 roles
            }

            if (action && suggestions[action]) {
                // Suggest values for the "new_value" option based on the selected action
                const response = suggestions[action].filter(value => value.startsWith(focusedValue));
                return await interaction.respond(
                    response.slice(0, 25).map(value => ({ name: value, value }))
                );
            }
        }

        /**********************************************************************/
        // Dynamically Load toBeScheduled Event Data

        let toBeScheduledEvents = [];
        try {
            toBeScheduledEvents = JSON.parse(fs.readFileSync(toBeScheduledPath, 'utf-8'));
        } catch (error) {
            console.error('Error reading toBeScheduled.json:', error);
        }

        /**********************************************************************/
        // Filter Event Choices for `event_id`

        if (optionName === 'event_id') {
            const filteredEvents = toBeScheduledEvents
                .filter(event =>
                    `${event.name} | Start: ${new Date(event.scheduledTime).toLocaleString()} | ID: ${event.id}`
                        .toLowerCase()
                        .includes(focusedValue.toLowerCase())
                )
                .map(event => ({
                    name: `${event.name} | Start: ${new Date(event.scheduledTime).toLocaleString()} | ID: ${event.id}`, // Display format: Name | Start Time | ID
                    value: event.id, // Use event ID as the value
                }));

            return await interaction.respond(filteredEvents.slice(0, 25)); // Limit to the first 25 matches
        }

        // Default to an empty response if the option doesn't match anything
        return await interaction.respond([]);
    },
};
