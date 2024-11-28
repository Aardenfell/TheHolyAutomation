// const { updateNGPEvent } = require('./ngpHelpers');

// /**
//  * Checks if all participants have rolled and declares the winner if so.
//  * @param {Object} event - The NGP event data.
//  * @param {Object} thread - The thread object where results are posted.
//  */
// function checkAndDeclareWinner(event, thread) {
//     // Check if all participants have rolled
//     const allParticipantsRolled = event.participants.every(p => p.roll_value !== null);

//     if (allParticipantsRolled) {
//         // First, look for the highest Need roll
//         const needRolls = event.participants.filter(p => p.roll_type === 'Need');
//         let winner = null;

//         if (needRolls.length > 0) {
//             winner = needRolls.reduce((prev, curr) => (curr.roll_value > prev.roll_value ? curr : prev));
//         } else {
//             // If no Need rolls, look for the highest Greed roll
//             const greedRolls = event.participants.filter(p => p.roll_type === 'Greed');
//             if (greedRolls.length > 0) {
//                 winner = greedRolls.reduce((prev, curr) => (curr.roll_value > prev.roll_value ? curr : prev));
//             }
//         }

//         if (winner) {
//             // Declare the winner in the thread
//             thread.send(`The winner of **${event.item}** is ${winner.name} with a roll of ${winner.roll_value}!`);
            
//             // Mark the event as complete (optional)
//             event.active = false;
//             updateNGPEvent(event.event_id, event);
//         } else {
//             // If no one rolled, announce the item is going to the guild bank
//             thread.send(`No one rolled for **${event.item}**. The item will be sent to the guild bank.`);
//         }
//     }
// }

// module.exports = {
//     checkAndDeclareWinner,
// };
