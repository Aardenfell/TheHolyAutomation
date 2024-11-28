/**
 * @file Voice State Handler
 * @description Handles the voice state update event to create and delete temporary voice channels.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

/**********************************************************************/
// Required Modules

const { PermissionsBitField } = require('discord.js');
const config = require('../config.json');

/**********************************************************************/
// Module Exports - Voice State Update Handler

module.exports = {
    name: 'voiceStateUpdate',

    /**
     * @function execute
     * @description Handles the voice state update event to create and delete temporary voice channels.
     * @param {object} oldState - The previous voice state.
     * @param {object} newState - The new voice state.
     * @param {object} client - The Discord client instance.
     */
    async execute(oldState, newState, client) {
        // Check if the voiceHubSystem is enabled in the configuration
        if (!config.systems.voiceHubSystem) {
            console.log('Voice Hub System is disabled. Ignoring voiceStateUpdate.');
            return;
        }

        /**********************************************************************/
        // User Joins Hub Channel - Create Temporary Voice Channel

        if (newState.channelId && newState.channelId === config.channels.hubChannel) {
            const guild = newState.guild;
            const member = newState.member;
            const hubChannel = newState.channel;

            try {
                // Create a new temporary voice channel and copy permissions from the hub channel
                const tempChannel = await guild.channels.create({
                    name: `👑 ${member.user.username}'s Party`,
                    type: 2, // Type 2 for voice channels
                    parent: hubChannel.parent, // Use the same category as the hub channel if applicable
                    userLimit: 6, // Set default channel size to 6
                    permissionOverwrites: [
                        ...hubChannel.permissionOverwrites.cache.map(overwrite => ({
                            id: overwrite.id,
                            allow: overwrite.allow,
                            deny: overwrite.deny,
                        })),
                        {
                            id: member.id,
                            allow: [
                                PermissionsBitField.Flags.ManageChannels,
                                PermissionsBitField.Flags.Connect,
                                PermissionsBitField.Flags.Speak,
                            ],
                        },
                    ], // Copy permissions from the hub channel and add party leader permissions
                });

                // Move the user to the new channel
                await member.voice.setChannel(tempChannel);

                console.log(`Temporary channel created: ${tempChannel.name} for ${member.user.tag}`);
            } catch (error) {
                console.error('Error creating temporary voice channel:', error);
            }
        }

        /**********************************************************************/
        // User Leaves Temporary Voice Channel - Delete Channel if Empty

        if (oldState.channelId) {
            const oldChannel = oldState.channel;

            // If the channel name starts with "👑" and is now empty, delete it
            if (oldChannel && oldChannel.members.size === 0 && oldChannel.name.startsWith("👑")) {
                try {
                    await oldChannel.delete();
                    console.log(`Temporary channel deleted: ${oldChannel.name}`);
                } catch (error) {
                    console.error('Error deleting temporary voice channel:', error);
                }
            }
        }
    }
};

