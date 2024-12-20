/**
 * @file salaryDistributor.js
 * @description Distributes weekly salaries to members based on their auxiliary roles and salary rates.
 * @author Aardenfell
 * @since 2.7.0
 * @version 2.7.0
 */

/**********************************************************************/
// Required Modules and Utilities

const fs = require('fs');
const path = require('path');
const { updateUserBalance, logTransaction } = require('./pointsHelper'); // Existing helper functions
// const { client } = require('./client'); // Discord client instance

/**********************************************************************/
// Configuration and Data Paths

// TODO create error message to run /salary add 
// Path to auxiliary roles configuration
const auxiliaryRolesPath = path.join(__dirname, '../data/auxiliaryRoles.json');

// Load auxiliary roles and salary rates with initialization
function loadAuxiliaryRoles() {
    try {
        if (!fs.existsSync(auxiliaryRolesPath)) {
            console.warn('[ GP DISTRIBUTOR ] Auxiliary roles file not found. Initializing default configuration.');
            const defaultRoles = [];
            fs.writeFileSync(auxiliaryRolesPath, JSON.stringify(defaultRoles, null, 2));
        }
        return JSON.parse(fs.readFileSync(auxiliaryRolesPath, 'utf-8'));
    } catch (error) {
        console.error('[ GP DISTRIBUTOR ] Error reading auxiliary roles file:', error);
        return [];
    }
}

// Initialize auxiliary roles
const auxiliaryRoles = loadAuxiliaryRoles();


// Salary rates by type
const salaryRates = {
    High: 7.5,
    Medium: 5,
    Low: 2.5,
};

/**********************************************************************/
// Main Function: Distribute Salaries

/**
 * @function distributeSalaries
 * @description Distributes weekly salaries to guild members based on their roles.
 */
async function distributeSalaries() {
    console.log('[ GP DISTRIBUTOR ] Starting salary distribution...');

    // Fetch the first guild (adjust for multi-guild use cases if necessary)
    const guild = client.guilds.cache.first();
    if (!guild) {
        console.error('[ GP DISTRIBUTOR ] Guild not found.');
        return;
    }

    // Fetch all members of the guild
    const members = await guild.members.fetch();

    // Map roles to their corresponding salary rates
    const roleSalaryMap = auxiliaryRoles.reduce((map, role) => {
        map[role.roleId] = salaryRates[role.salaryType] || 0;
        return map;
    }, {});

    // Iterate through guild members to calculate and distribute salaries
    for (const member of members.values()) {
        const memberRoles = member.roles.cache.map(role => role.id);

        // Get the salaries for the member's roles, sorted by highest rate
        const salaries = memberRoles
            .filter(roleId => roleSalaryMap[roleId])
            .map(roleId => roleSalaryMap[roleId])
            .sort((a, b) => b - a);

        if (salaries.length === 0) continue; // Skip if no valid roles

        // Calculate total salary: highest rate + 1 GP per additional eligible role
        const totalSalary = salaries[0] + (salaries.length - 1) * 1;

        // Update the member's balance
        updateUserBalance(member.id, totalSalary);

        // Log the salary transaction
        await logTransaction(client, {
            senderId: 'Reserve',
            recipientId: member.id,
            amountPerRecipient: totalSalary,
            reason: 'Weekly salary for auxiliary roles',
            timestamp: Math.floor(Date.now() / 1000),
        });

        console.log(`[ GP DISTRIBUTOR ] Distributed ${totalSalary} GP to ${member.user.tag}.`);
    }

    console.log('[ GP DISTRIBUTOR ] Salary distribution complete.');
}

/**********************************************************************/
// Module Export

module.exports = { distributeSalaries, loadAuxiliaryRoles };
