# The Holy Automation

![Project Status](https://img.shields.io/badge/Status-Active-green) [![GitHub license](https://img.shields.io/badge/license-MIT-green)](LICENSE) ![GitHub issues](https://img.shields.io/github/issues/Aardenfell/The-Holy-Automation) ![GitHub pull requests](https://img.shields.io/github/issues-pr/Aardenfell/The-Holy-Automation)

![GitHub stars](https://img.shields.io/github/stars/Aardenfell/The-Holy-Automation?style=social) ![GitHub forks](https://img.shields.io/github/forks/Aardenfell/The-Holy-Automation?style=social) ![GitHub watchers](https://img.shields.io/github/watchers/Aardenfell/The-Holy-Automation?style=social) ![GitHub follow](https://img.shields.io/github/followers/Aardenfell?label=Follow&style=social)

## Overview

**The Holy Automation** is a Discord bot designed to streamline various aspects of running a gaming guild or community. From distributing loot efficiently to managing raid participation, **The Holy Automation** provides systems that automate the tedious, ensuring that your community can focus on playing and having fun.

**Disclaimer**: I assume you already know how to create and host a Discord bot. I can assist with code-related issues, but not with the bot's setup on the developer portal or hosting.

## Features

### Systems Overview:

1. **NGP System** (Need/Greed/Pass System):
   - Facilitates loot distribution via a Need/Greed/Pass system.
   - Integrates with the guild points system to allow members to bid on items, incentivizing active and contributing members.
   - Supports dynamic bidding to encourage guild participation.

2. **Guild Points System** (Points Similar to DKP):
   - Earn points through participating in events or passing on NGP items.
   - Can be used to bid for items, rewarding active members.

3. **Boss Raid System**:
   - Allows for polling members on which bosses they want to run during the current reset period.
   - Automatically creates sign-in posts for raid days and helps in matchmaking bosses to run based on attendance, popularity, and previous runs.
   - Relieves the mental strain of planning raid schedules and ensures that all members get a chance to complete less popular content.

4. **Guild Access System**:
   - A simple gate to control access to specific areas of your Discord server.
   - Enforces users to change their nickname to their in-game name for easy identification.
   - Integrates an optional referral system (enabled when paired with the points system).

5. **Voice Hub System**:
   - Simple voice hub feature that creates temporary voice channels when users join the designated hub.
   - Ideal for creating party or raid voice channels without cluttering your server.

## Installation

1. **Clone the repository** to your local machine:
   ```sh
   git clone https://github.com/Aardenfell/The-Holy-Automation.git
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Configure your bot**:
   - Rename `presetConfig.json` to `config.json`.
   - Edit `config.json` to include your bot token, client ID, guild ID, and other relevant details.

4. **Run the bot**:
   ```sh
   npm start
   ```

## Configuration

You need to configure the bot by updating `config.json`. Here are some notable configurations:

- **Systems**:
  - `ngpSystem`: true/false to enable or disable the NGP system.
  - `guildPointsSystem`: true/false for enabling the points system.
  - `guildAccessSystem`: true/false for enabling the gate for Discord channels.
  - `bossRaidSystem`: true/false for enabling raid polling and matchmaking.
  - `voiceHubSystem`: true/false for enabling the voice hub system.

- **Roles and Channels**: Specify the role and channel IDs that correspond to your server setup.

## FAQ

**Q: How do I set up the bot in the Discord Developer Portal?**
A: This guide assumes you already know how to create a Discord bot and obtain a bot token. Please refer to [Discord's Developer Documentation](https://discord.com/developers/docs/intro) if needed.

**Q: How do I enable or disable specific systems?**
A: Use the `config.json` file to set each system to `true` or `false` as needed.

## Feedback and Contributions

Feedback and contributions are always welcome! Feel free to open an issue or submit a pull request [here](https://github.com/Aardenfell/The-Holy-Automation/issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

Thanks to the gaming community and all contributors for making this project possible. Let's automate the tedious and stay focused on the fun.

**Stay holy, stay automated.**

