/**
 * @file manageNGP.js
 * @description Utility command to manage NGP events, such as deleting, adding/removing participants, or viewing details.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { getNGPEventById, getAllActiveEvents, deleteNGPEvent, addParticipant, removeParticipant } = require('../../../utils/ngpHelpers');

/**********************************************************************/
// Load Configurations

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'));
const ngpSystemEnabled = config.systems.ngpSystem || false;

/**********************************************************************/
// Module Exports - Slash Command for Managing NGP Events

module.exports = {
    data: new SlashCommandBuilder()
        .setName('managengp')
        .setDescription('Utility command to manage NGP events (delete, add/remove participants, view events).')
        .addStringOption(option =>
            option.setName('event_id')
                .setDescription('ID of the NGP event to manage or view.')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Action to perform (delete, add, remove, view).')
                .setRequired(true)
                .addChoices(
                    { name: 'Delete', value: 'delete' },
                    { name: 'Add Participant', value: 'add' },
                    { name: 'Remove Participant', value: 'remove' },
                    { name: 'View', value: 'view' }  // New action for viewing events
                )
        )
        .addUserOption(option =>
            option.setName('participant')
                .setDescription('User to add or remove (required for add/remove actions).')
                .setRequired(false)
        ),
    
    /**
     * @description Executes the slash command to manage NGP events.
     * @param {Object} interaction - The interaction object from Discord.
     */
    async execute(interaction) {
        /**********************************************************************/
        // Check NGP System Status

        if (!ngpSystemEnabled) {
            return await interaction.reply({
                content: 'The NGP system is currently disabled.',
                ephemeral: true,
            });
        }

        /**********************************************************************/
        // Retrieve Command Options

        const eventId = interaction.options.getString('event_id');
        const action = interaction.options.getString('action');
        const participant = interaction.options.getUser('participant');

        /**********************************************************************/
        // Handle "View" Action to Display Event Details

        if (action === 'view') { 
            if (eventId === 'all') {
                // Show all active events if "all" is specified in event ID
                const activeEvents = getAllActiveEvents();
                if (activeEvents.length === 0) {
                    return await interaction.reply({
                        content: 'No active NGP events found.',
                        ephemeral: true,
                    });
                }
        
                // Create an embed displaying all active events
                const allEventsEmbed = new EmbedBuilder()
                    .setTitle('Active NGP Events')
                    .setDescription(
                        activeEvents.map(e => `**${e.item}** - ID: ${e.event_id} - Ends: <t:${e.expires_at}:R>`).join('\n')
                    )
                    .setColor('Random');
        
                await interaction.reply({ embeds: [allEventsEmbed], ephemeral: true });
            } else {
                // Handle view action for a specific event ID
                const event = getNGPEventById(eventId);
                if (!event) {
                    return await interaction.reply({
                        content: `Event with ID ${eventId} not found.`,
                        ephemeral: true,
                    });
                }
        
                // Create an embed with details of the specific event, including additional hidden fields
                const eventEmbed = new EmbedBuilder()
                    .setTitle(`NGP Event: ${event.item}`)
                    .addFields(
                        { name: 'Event ID', value: event.event_id, inline: true },
                        { name: 'Rarity', value: event.rarity || 'Unknown', inline: true },
                        { name: 'Participants', value: event.participants.map(p => `${p.name} (${p.roll_type} - ${p.roll_value || 'N/A'})`).join('\n') || 'None' },
                        { name: 'Created At', value: `<t:${event.created_at}:f>`, inline: true },
                        { name: 'Expires At', value: `<t:${event.expires_at}:f>`, inline: true },
                        { name: 'Status', value: event.active ? 'Active' : 'Inactive', inline: true },
                        { name: 'Open NGP', value: event.is_open_ngp ? 'Yes' : 'No', inline: true },
                        { name: 'Bidding', value: event.is_bidding ? 'Yes' : 'No', inline: true },
                        { name: 'Highest Bid', value: event.highest_bid ? `${event.highest_bid.amount} by <@${event.highest_bid.user_id}>` : 'None', inline: true },
                        { name: 'Winner', value: event.winner || 'No Winner', inline: true },
                        { name: 'Message ID', value: event.message_id || 'N/A', inline: true },
                        { name: 'Channel ID', value: event.channel_id || 'N/A', inline: true },
                        { name: 'Message Link', value: `<#${event.message_id}>` || 'N/A', inline: true },
                        { name: 'Channel Link', value: `<#${event.channel_id}>` || 'N/A', inline: true }
                    )
                    .setColor('Random');
        
                await interaction.reply({ embeds: [eventEmbed], ephemeral: true });
            }
            return;
        }
        
        /**********************************************************************/
        // Handle "Delete", "Add", and "Remove" Actions

        const event = getNGPEventById(eventId);
        if (!event) {
            return await interaction.reply({
                content: `Event with ID ${eventId} not found.`,
                ephemeral: true,
            });
        }

        switch (action) {
            case 'delete':
                await deleteNGPEvent(interaction, event);
                break;
            case 'add':
                if (!participant) {
                    return await interaction.reply({
                        content: 'Please specify a participant to add.',
                        ephemeral: true,
                    });
                }
                await addParticipant(interaction, event, participant);
                break;
            case 'remove':
                if (!participant) {
                    return await interaction.reply({
                        content: 'Please specify a participant to remove.',
                        ephemeral: true,
                    });
                }
                await removeParticipant(interaction, event, participant);
                break;
            default:
                await interaction.reply({
                    content: 'Invalid action specified.',
                    ephemeral: true,
                });
        }
    }
};
