/**
 * @file NGP Help Command
 * @description Sends detailed help information about the NGP system to the user who requests it.
 * @author Aardenfell
 * @since 1.0.0
 * @version 1.0.0
 */

// Module export for the NGP help command
module.exports = {
  id: 'ngp_help',

  /**
   * @function execute
   * @description Executes the NGP help command, sending a help message to the user.
   * @param {object} interaction - The interaction object representing the user's request.
   */
  async execute(interaction) {
      const helpMessage = `
**NGP System Help:**

- **Need**:
- The 'Need' button will not appear for blue/rare items.
- A valid build post is required to roll Need. Post your build here: <#1305389518161055764>.
- The build must already exist in <#1301552024818810942>.
- Use 'Need' only if the item is required for your active build. **Needs are not for unlocking traits.** If you want an item for trait unlocking, use 'Greed' instead.

- **Greed**:
- Click 'Greed' if you want the item for non-build purposes, such as unlocking traits, selling it, or adding it to your Lithograph book.

- **Pass**:
- Click 'Pass' if you do not want the item.

- **Selling**
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

      try {
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
