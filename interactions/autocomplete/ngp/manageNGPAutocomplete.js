/**
 * @file ManageNGP Autocomplete Handler
 * @description Handles the autocomplete interaction for the manageNGP command, providing suggestions for active NGP events.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const fs = require('fs');
const path = require('path');

// Path to ngpEvents.json
const ngpEventsPath = path.join(__dirname, '../../../data/ngpEvents.json');

/**********************************************************************/
// Module Exports - Autocomplete Handler

module.exports = {
    name: 'managengp', // Command name should match the actual command name

    /**
     * @function execute
     * @description Executes autocomplete for the manageNGP command.
     * @param {import('discord.js').AutocompleteInteraction} interaction - The autocomplete interaction object.
     */
    async execute(interaction) {
        const focusedValue = interaction.options.getFocused();

        // Load events from ngpEvents.json
        let eventsData = [];
        try {
            eventsData = JSON.parse(fs.readFileSync(ngpEventsPath, 'utf-8'));
        } catch (error) {
            console.error('Error reading ngpEvents.json:', error);
        }

        /**********************************************************************/
        // Filter Active Events and Generate Autocomplete Suggestions

        // Filter to only active events and map them to their names and event IDs
        const activeEvents = eventsData
            .filter(event => event.active)
            .map(event => ({
                name: `${event.item} (ID: ${event.event_id})`,
                value: event.event_id,
            }));

        // Filter events based on the focused input
        const filtered = activeEvents.filter(event => 
            event.name.toLowerCase().includes(focusedValue.toLowerCase())
        );

        // Respond with up to 25 options
        await interaction.respond(
            filtered.slice(0, 25)
        );
    },
};
