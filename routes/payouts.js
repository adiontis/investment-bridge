const express = require('express');
const { db } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user's payout history
router.get('/history', auth, (req, res) => {
const userId = req.user.userId;

const query = `
SELECT p.*, i.amount as investment_amount, b.name as business_name
FROM payouts p
JOIN investments i ON p.investment_id = i.id
JOIN businesses b ON i.business_id = b.id
WHERE p.user_id = ?
ORDER BY p.created_at DESC
`;

db.all(query, [userId], (err, payouts) => {
if (err) {
return res.status(500).json({ error: 'Failed to fetch payout history' });
}

res.json({ payouts });
});
});

// Get next payout date and eligible investments
router.get('/schedule', auth, (req, res) => {
const userId = req.user.userId;

// Calculate next Wednesday
const today = new Date();
const dayOfWeek = today.getDay();
const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
const nextWednesday = new Date(today);
nextWednesday.setDate(today.getDate() + (daysUntilWednesday === 0 ? 7 : daysUntilWednesday));

// Get investments eligible for next payout
const query = `
SELECT i.*, b.name as business_name
FROM investments i
JOIN businesses b ON i.business_id = b.id
WHERE i.user_id = ? AND i.status = 'pending_escrow'
AND date(i.payout_date) <= date('now', '+7 days')
ORDER BY i.payout_date ASC
`;

db.all(query, [userId], (err, eligibleInvestments) => {
if (err) {
return res.status(500).json({ error: 'Failed to fetch payout schedule' });
}

res.json({
nextPayoutDate: nextWednesday.toISOString(),
eligibleInvestments
});
});
});

module.exports = router;
