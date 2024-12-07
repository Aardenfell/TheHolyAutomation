/**
 * @file ngpHelpButton.js
 * @description Sends detailed help information about the NGP system to the user who requests it.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.2.0
 */

// Required modules
const config = require('../../../config.json');

module.exports = {
    id: 'ngp_help',

    /**
     * @function execute
     * @description Executes the NGP help command, sending a help message to the user.
     * @param {object} interaction - The interaction object representing the user's request.
     */
    async execute(interaction) {
        try {
            // Get the user's roles
            const memberRoles = interaction.member.roles.cache;

            // Determine the guild based on the user's role
            let guildId = null;
            for (const [key, guildConfig] of Object.entries(config.guilds)) {
                if (memberRoles.has(guildConfig.role_id)) {
                    guildId = key;
                    break;
                }
            }

            // If the user doesn't belong to any configured guild
            if (!guildId) {
                return await interaction.reply({
                    content: 'You do not belong to a recognized guild for the NGP system.',
                    ephemeral: true,
                });
            }

            // Get the specific forum channel ID for the guild
            const forumChannelId = config.guilds[guildId].ngpNeedValidationSubsystemForumID;

            // Construct the help message with the correct channel
            const helpMessage = `
**NGP System Help (Guild: ${config.guilds[guildId].name}):**

- **Need**:
- The 'Need' button will not appear for blue/rare items.
- A valid build post is required to roll Need. Post your build here: <#${forumChannelId}>.
- Use 'Need' only if the item is required for your active build. **Needs are not for unlocking traits.** If you want an item for trait unlocking, use 'Greed' instead.

- **Greed**:
- Click 'Greed' if you want the item for non-build purposes, such as unlocking traits, selling it, or adding it to your Lithograph book.

- **Pass**:
- Click 'Pass' if you do not want the item.

- **Selling**:
- Sell decisions must be unanimous. Profits will be evenly split amongst participants.

**How It Works:**
1. When an NGP post is created, all participants can click 'Need', 'Greed', or 'Pass' to roll for the item.
2. If all participants have rolled, the winner is declared immediately.
3. If all participants pass, the item remains in the guild chest, and the event may convert to an Open NGP.
4. Open NGPs allow any member to roll for the item.
5. The event automatically expires if no action is taken within a set time limit.
6. Winners are decided based on the highest roll.

**Note**: More info can be found in <#1295184289607974934>
`;

            // Send an ephemeral message with the updated help info
            await interaction.reply({
                content: helpMessage,
                ephemeral: true, // Only visible to the user who clicked the button
            });
        } catch (error) {
            console.error('Error sending help message:', error);
            await interaction.reply({
                content: 'Failed to display help info. Please try again.',
                ephemeral: true,
            });
        }
    },
};
