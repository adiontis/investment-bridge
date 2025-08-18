// Escrow and Payout Processing System

const { db } = require('../database');

function processWeeklyPayouts() {
console.log('Processing weekly payouts...');

// Get all investments ready for payout
const query = `
SELECT i.*, u.email, u.first_name, b.name as business_name
FROM investments i
JOIN users u ON i.user_id = u.id
JOIN businesses b ON i.business_id = b.id
WHERE i.status = 'pending_escrow'
AND date(i.payout_date) <= date('now')
AND u.kyc_status = 'verified'
`;

db.all(query, [], (err, investments) => {
if (err) {
console.error('Error fetching investments for payout:', err);
return;
}

console.log(`Found ${investments.length} investments ready for payout`);

investments.forEach(investment => {
processInvestmentPayout(investment);
});
});
}

function processInvestmentPayout(investment) {
const payoutAmount = investment.expected_return;
const profitAmount = payoutAmount - investment.amount;
const profitFee = profitAmount > 0 ? profitAmount * 0.05 : 0; // 5% fee on profits
const netPayout = payoutAmount - profitFee;

// Create payout record
db.run(
`INSERT INTO payouts
(investment_id, user_id, amount, fee_amount, status, processed_at)
VALUES (?, ?, ?, ?, 'processing', CURRENT_TIMESTAMP)`,
[investment.id, investment.user_id, netPayout, profitFee],
function(err) {
if (err) {
console.error('Error creating payout:', err);
return;
}

// Update investment status
db.run(
'UPDATE investments SET status = ? WHERE id = ?',
['released', investment.id],
(err) => {
if (err) {
console.error('Error updating investment status:', err);
return;
}

// Simulate bank transfer processing
setTimeout(() => {
completePayout(this.lastID);
}, 2000); // Simulate processing delay

console.log(`Processed payout for investment ${investment.id}: $${netPayout}`);
}
);
}
);
}

function completePayout(payoutId) {
db.run(
'UPDATE payouts SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
['paid', payoutId],
(err) => {
if (err) {
console.error('Error completing payout:', err);
return;
}

// Update associated investment status
db.run(`
UPDATE investments
SET status = 'paid'
WHERE id = (SELECT investment_id FROM payouts WHERE id = ?)
`, [payoutId], (err) => {
if (err) {
console.error('Error updating investment to paid status:', err);
} else {
console.log(`Completed payout ${payoutId}`);
}
});
}
);
}

module.exports = {
processWeeklyPayouts,
processInvestmentPayout,
completePayout
};
```
