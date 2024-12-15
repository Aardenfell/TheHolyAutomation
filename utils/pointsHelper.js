/**
 * @file Helper functions to manage user point balances and log transactions in JSON files.
 * @author Aardenfell
 * @since 1.0.0
 * @version 2.0.0
 */

// Required Node.js modules
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// Configuration and Utility Imports
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config.json'), 'utf-8'));
const { client_id } = require('../config.json');
const { saveNGPEvents, getCurrentEvents } = require('./eventUtils');

// Constants for file paths
const balancesPath = path.join(__dirname, '../data/pointsBalances.json');
const transactionsPath = path.join(__dirname, '../data/pointsTransactions.json');
const logChannelId = config.channels.transactionsLog;

/**********************************************************************/
// JSON File Operations

/**
 * @function readJson
 * @description Reads the JSON file at the given path and returns the parsed data.
 * @param {string} filePath - The path of the JSON file to read.
 * @returns {object} The parsed JSON data.
 */
function readJson(filePath) {
  try {
    const jsonData = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(jsonData);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {}; // If the file doesn't exist, return an empty object to initialize data
    } else {
      throw error;
    }
  }
}

/**
 * @function writeJson
 * @description Writes the given data to the JSON file at the specified path.
 * @param {string} filePath - The path of the JSON file to write to.
 * @param {object} data - The data to write to the JSON file.
 */
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**********************************************************************/
// Balance Management Functions

/**
 * @function initializeUserBalance
 * @description Initializes a user's balance if they don't already have one.
 * @param {string} userId - The ID of the user.
 */
function initializeUserBalance(userId) {
  const balancesData = readJson(balancesPath);

  // Check if users object exists; if not, create it
  if (!balancesData.users) {
    balancesData.users = {};
  }

  // If the user doesn't have an entry, initialize it with a balance of 10
  if (!balancesData.users[userId]) {
    balancesData.users[userId] = { balance: 10 };
    writeJson(balancesPath, balancesData);
  }
}

/**
 * @function initializeReserve
 * @description Initializes the reserve balance for the bot itself if it doesn't already exist.
 */
function initializeReserve() {
  initializeUserBalance(client_id);
}

/**
 * @function getUserBalance
 * @description Gets the balance of a given user.
 * @param {string} userId - The ID of the user.
 * @returns {number} The current balance of the user.
 */
function getUserBalance(userId) {
  initializeUserBalance(userId); // Ensure the user is initialized
  const balancesData = readJson(balancesPath);
  return balancesData.users[userId].balance;
}

/**
 * @function updateUserBalance
 * @description Updates a user's balance by adding or subtracting points.
 * @param {string} userId - The ID of the user.
 * @param {number} amount - The amount to add or subtract from the user's balance.
 */
function updateUserBalance(userId, amount) {
  initializeUserBalance(userId); // Ensure the user is initialized
  const balancesData = readJson(balancesPath);
  balancesData.users[userId].balance += amount;
  writeJson(balancesPath, balancesData);
}

/**********************************************************************/
// Points Transfer Functions

/**
 * @function transferPoints
 * @description Transfers points from one user to another.
 * @param {string} fromUserId - The ID of the user sending points.
 * @param {string} toUserId - The ID of the user receiving points.
 * @param {number} amount - The amount of points to transfer.
 * @throws Will throw an error if the sender does not have enough points.
 */
function transferPoints(fromUserId, toUserId, amount) {
  initializeUserBalance(fromUserId);
  initializeUserBalance(toUserId);

  const balancesData = readJson(balancesPath);

  if (balancesData.users[fromUserId].balance < amount) {
    throw new Error('Insufficient balance to complete the transfer.');
  }

  // Deduct points from sender and add to receiver
  balancesData.users[fromUserId].balance -= amount;
  balancesData.users[toUserId].balance += amount;
  writeJson(balancesPath, balancesData);
}

/**********************************************************************/
// Transaction Logging Functions

/**
 * @function logTransaction
 * @description Logs a transaction to the transactions JSON file and sends a notification to the Discord channel.
 * @param {object} client - The Discord client object.
 * @param {object} transaction - The transaction details.
 * @param {string|array} transaction.senderId - The ID(s) of the user(s) sending points.
 * @param {string|array} transaction.recipientId - The ID(s) of the user(s) receiving points.
 * @param {number} transaction.amount - The total amount of points transferred.
 * @param {number} transaction.amountPerRecipient - The amount of points each recipient receives.
 * @param {string} transaction.reason - The reason for the transfer.
 * @param {string} transaction.timestamp - The ISO string timestamp of the transaction.
 * @param {string} [ngpLink] - (Optional) Link to the related NGP event post.
 */
async function logTransaction(client, transaction, ngpLink = null) {
  const transactionsData = readJson(transactionsPath);

  // Ensure transactions array exists
  if (!transactionsData.transactions) {
    transactionsData.transactions = [];
  }

  // Check if senderId and recipientId are arrays or single IDs
  const senders = Array.isArray(transaction.senderId) ? transaction.senderId : [transaction.senderId];
  const recipients = Array.isArray(transaction.recipientId) ? transaction.recipientId : [transaction.recipientId];

  // Ensure recipients and senders are valid and non-null
  const validRecipients = recipients.filter(Boolean);
  const validSenders = senders.filter(Boolean);

  if (validRecipients.length === 0 && validSenders.length === 0) {
    console.error('No valid senders or recipients for transaction.');
    return;
  }

  // Determine the guild(s) involved in the transaction
  const guildsInvolvedSet = new Set();
  for (const userId of [...validSenders, ...validRecipients]) {
    const member = await client.guilds.cache
      .first() // Assuming only one guild, adjust if there are multiple guilds.
      .members.fetch(userId)
      .catch(() => null);

    if (member) {
      for (const [key, guild] of Object.entries(config.guilds)) {
        if (member.roles.cache.has(guild.role_id)) {
          guildsInvolvedSet.add(guild.name);
        }
      }
    }
  }

  const guildsInvolved = [...guildsInvolvedSet].join(', ') || 'None';

  // Calculate total amount if not provided
  const calculatedTotalAmount = (transaction.amountPerRecipient || 0) * validRecipients.length;
  const totalAmount = transaction.totalAmount || calculatedTotalAmount;

  // Create a single transaction entry in JSON for all recipients and senders
  const newTransaction = {
    transaction_id: `tx${Date.now()}`,
    from: validSenders,
    to: validRecipients,
    amount: transaction.amountPerRecipient || 0,
    totalAmount: totalAmount,
    reason: transaction.reason || 'No reason provided',
    timestamp: transaction.timestamp || Math.floor(Date.now() / 1000),
    guildsInvolved: guildsInvolved // Added guilds involved in transaction log
  };
  transactionsData.transactions.push(newTransaction);

  writeJson(transactionsPath, transactionsData);

  // Ensure `client` is defined
  if (!client || !client.channels) {
    console.error('Invalid client object. Transaction log will not be sent to the channel.');
    return;
  }

  // Log the transaction in the specified Discord channel
  if (!logChannelId) {
    console.error('Log channel ID is not defined. Transaction will not be logged to the channel.');
    return;
  }

  try {
    const logChannel = await client.channels.fetch(logChannelId);
    if (logChannel) {
      const senderList = validSenders.map((id) => (id === client_id ? 'Reserve' : `<@${id}>`)).join(', ');
      const recipientList = validRecipients.map((id) => (id === client_id ? 'Reserve' : `<@${id}>`)).join(', ');

      const transactionEmbed = new EmbedBuilder()
        .setColor('Random')
        .setTitle('New Points Transaction')
        .addFields(
          { name: 'Transaction ID', value: newTransaction.transaction_id },
          { name: 'From', value: senderList || 'Unknown' },
          { name: 'To', value: recipientList || 'Unknown' },
          { name: 'Amount', value: `${transaction.amountPerRecipient || 0} per recipient (${totalAmount || 0} total)` },
          { name: 'Reason', value: transaction.reason },
          { name: 'Guilds Involved', value: guildsInvolved }, // Added guilds involved in the transaction embed
          { name: 'Timestamp', value: `<t:${newTransaction.timestamp}>` }
        );

      // If an NGP link is provided, add it to the embed
      if (ngpLink) {
        transactionEmbed.addFields({ name: 'Related NGP Post', value: `${ngpLink}` });
      }

      await logChannel.send({ embeds: [transactionEmbed] });
    } else {
      console.error('Log channel not found.');
    }
  } catch (error) {
    console.error('Error sending transaction log to the channel:', error);
  }
}

/**********************************************************************/
// Points Distribution Functions

/**
 * @function distributePointsIfNotDone
 * @description Ensures points are distributed only once per event using a flag.
 * @param {object} event - The event object containing participants, rarity, and distribution state.
 * @param {object} client - The Discord client object.
 */
function distributePointsIfNotDone(event, client) {
  if (event.is_open_ngp) {
    console.log(`Skipping points distribution for Open NGP event: ${event.event_id}`);
    return; // Do not distribute points for Open NGPs
  }

  if (!event.points_distributed && Array.isArray(event.participants)) {
    distributePointsByRarity(event.participants, event.rarity, client, event.isGuildRaid || false, event);
    event.points_distributed = true; // Mark points as distributed

    // Save the updated event to prevent re-distribution
    saveNGPEvents(getCurrentEvents().map(e => (e.event_id === event.event_id ? event : e)));
  } else if (!Array.isArray(event.participants)) {
    console.error(`Invalid participants in event: ${event.event_id}`);
  } else {
    console.log(`Points already distributed for event ${event.event_id}. Skipping.`);
  }
}

/**
 * @function distributePointsByRarity
 * @description Distribute points to participants who passed based on rarity. Includes non-bidders in bidding events.
 * @param {Array} participants - The list of participants in the event.
 * @param {string} rarity - The rarity of the item being distributed.
 * @param {object} client - The Discord client object.
 * @param {boolean} isGuildRaid - Whether this event is part of a Guild Raid.
 */
async function distributePointsByRarity(participants, rarity, client, isGuildRaid = false, event) {
  if (!Array.isArray(participants)) {
    console.error('Invalid participants array in distributePointsByRarity:', participants);
    return;
  }

  const rarityPoints = {
    rare: { pool: 1, min: 0.1 },
    epic: { pool: 6, min: 1 },
    epic2: { pool: 12, min: 2 }, 
    archboss: { pool: 12, min: 2 }, 
    sellable: { pool: 12, min: 2}
  };

  // Base points for the rarity
  let { pool: basePoints, min: minPoints } = rarityPoints[rarity] || { pool: 10, min: 0.1 }; // Default values if rarity is unrecognized

  // Apply a multiplier for Guild Raid events
  let multiplierApplied = false;
  let totalPoints = basePoints;
  if (isGuildRaid) {
    basePoints *= 0.5; // Apply 0.5x multiplier
    minPoints *= 0.5; // Halve the minimum value
    multiplierApplied = true;
    console.log(`Applied 0.5x multiplier for Guild Raid. Adjusted pool: ${basePoints}, Adjusted min: ${minPoints}`);
  }

  // Filter participants eligible for rewards
  const eligibleParticipants = participants.filter(
    (participant) =>
      participant.roll_type === 'Pass' &&
      (!participant.bid_amount || participant.bid_amount <= 0) // Includes non-bidders
  );

  const numEligibleParticipants = eligibleParticipants.length;

  if (numEligibleParticipants > 0) {
    // Calculate points per participant and total distributed points
    let pointsPerParticipant = parseFloat((totalPoints / numEligibleParticipants).toFixed(2)); // Round for clarity

    // Ensure the points per participant are at least the minimum threshold
    if (pointsPerParticipant < minPoints) {
      pointsPerParticipant = minPoints;
    }

    // Calculate the total distributed points
    const totalDistributed = pointsPerParticipant * numEligibleParticipants;

    const recipientIds = eligibleParticipants.map((participant) =>
      participant.name.replace(/[<@>]/g, '') // Extract user IDs
    );

    // Update balances for each participant
    recipientIds.forEach((userId) => updateUserBalance(userId, pointsPerParticipant));

    // Deduct the total points distributed from the reserve
    updateUserBalance(config.client_id, -totalDistributed);

    // Generate NGP post link if available
    const ngpLink = `<#${event.message_id}>`;

    // Log a single transaction for all recipients
    await logTransaction(client, {
      senderId: config.client_id,
      recipientId: recipientIds,
      amountPerRecipient: pointsPerParticipant, // Points per user
      totalAmount: totalDistributed, // Total points distributed
      reason: `Participation reward for passing on NGP item of rarity ${rarity}${multiplierApplied ? ' (0.5x Guild Raid multiplier applied)' : ''}`,
      timestamp: Math.floor(Date.now() / 1000),
    }, ngpLink);

    console.log(
      `Distributed ${pointsPerParticipant.toFixed(2)} points to ${numEligibleParticipants} participants who passed without bidding.${multiplierApplied ? ' (0.5x multiplier applied)' : ''}`
    );
    console.log(`Deducted ${totalDistributed.toFixed(2)} points from the reserve.`);
  } else {
    console.log('No participants eligible for point distribution.');
  }
}

/**********************************************************************/
// Module Exports

module.exports = {
  initializeUserBalance,
  initializeReserve,
  getUserBalance,
  updateUserBalance,
  transferPoints,
  logTransaction,
  distributePointsByRarity,
  distributePointsIfNotDone,
};
