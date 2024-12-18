/**
 * @file manageScheduleAutocomplete.js
 * @description Handles the autocomplete interaction for the "manageschedule" command to assist users with selecting events dynamically.
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

        /**********************************************************************/
        // Dynamically Load toBeScheduled Event Data

        let toBeScheduledEvents = [];
        try {
            toBeScheduledEvents = JSON.parse(fs.readFileSync(toBeScheduledPath, 'utf-8'));
        } catch (error) {
            console.error('Error reading toBeScheduled.json:', error);
        }

        /**********************************************************************/
        // Filter Event Choices

        const filteredEvents = toBeScheduledEvents
            .filter(event =>
                `${event.name} | Start: ${new Date(event.scheduledTime).toLocaleString()} | ID: ${event.id}`
                    .toLowerCase()
                    .includes(focusedValue.toLowerCase())
            )
            .map(event => ({
                name: `${event.name} | Start: ${new Date(event.scheduledTime).toLocaleString()} | ID: ${event.id}`, // Display format: Name | Start Time | ID
                value: event.id // Use event ID as the value
            }));

        /**********************************************************************/
        // Respond with Autocomplete Choices

        await interaction.respond(filteredEvents.slice(0, 25)); // Limit to the first 25 matches
    },
};
