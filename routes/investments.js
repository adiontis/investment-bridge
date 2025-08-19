const express = require('express');
const { db } = require('../database');
const auth = require('../middleware/auth');
const { calculateProgression } = require('../utils/progressionEngine');
const { validateInvestment } = require('../middleware/validation');

const router = express.Router();

// Make investment
router.post('/', auth, validateInvestment, async (req, res) => {
try {
const { businessId, amount } = req.body;
const userId = req.user.userId;

// Get user details
db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
if (err) {
return res.status(500).json({ error: 'Database error' });
}

// Check cooldown
if (user.cooldown_until && new Date() < new Date(user.cooldown_until)) {
const cooldownEnd = new Date(user.cooldown_until);
const hoursLeft = Math.ceil((cooldownEnd - new Date()) / (1000 * 60 * 60));
return res.status(429).json({
error: 'Account in recovery period',
cooldownHours: hoursLeft
});
}

// Check spending limit
if (amount > user.max_spend_limit) {
return res.status(400).json({
error: 'Investment exceeds your current limit',
maxLimit: user.max_spend_limit
});
}

// Get business details
db.get('SELECT * FROM businesses WHERE id = ? AND verification_status = "verified"',
[businessId], (err, business) => {
if (err) {
return res.status(500).json({ error: 'Database error' });
}

if (!business) {
return res.status(404).json({ error: 'Business not found or not verified' });
}

// Check per-business investment limit (30% of monthly revenue)
const maxPerBusiness = business.monthly_revenue * 0.3;
if (amount > maxPerBusiness) {
return res.status(400).json({
error: 'Investment exceeds maximum allowed for this business',
maxAllowed: maxPerBusiness
});
}

// Calculate progression
const progression = calculateProgression(user, amount);
const riskPercentage = (amount / user.max_spend_limit) * 100;

// Calculate fees (2% platform fee)
const feeAmount = amount * 0.02;
const totalCharge = amount + feeAmount;

// Expected return (example: 5-15% based on risk rating)
const returnMultipliers = { 'A': 1.08, 'B': 1.12, 'C': 1.15, 'D': 1.18, 'F': 1.20 };
const expectedReturn = amount * (returnMultipliers[business.risk_rating] || 1.10);

// Insert investment
db.run(
`INSERT INTO investments
(user_id, business_id, amount, fee_amount, risk_percentage,
growth_increase, expected_return, payout_date)
VALUES (?, ?, ?, ?, ?, ?, ?, date('now', '+7 days'))`,
[userId, businessId, amount, feeAmount, riskPercentage,
progression.growthIncrease, expectedReturn],
function(err) {
if (err) {
return res.status(500).json({ error: 'Failed to create investment' });
}

// Update user's spending limit and cooldown
const newCooldown = progression.cooldownHours > 0
? new Date(Date.now() + progression.cooldownHours * 60 * 60 * 1000)
: null;

db.run(
`UPDATE users
SET max_spend_limit = ?, current_tier = ?, cooldown_until = ?,
updated_at = CURRENT_TIMESTAMP
WHERE id = ?`,
[progression.newMaxLimit, progression.newTier, newCooldown, userId],
(err) => {
if (err) {
return res.status(500).json({ error: 'Failed to update user progress' });
}

res.json({
message: 'Investment created successfully',
investment: {
id: this.lastID,
amount,
feeAmount,
totalCharge,
expectedReturn,
riskPercentage,
payoutDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
},
progression: {
newMaxLimit: progression.newMaxLimit,
newTier: progression.newTier,
growthIncrease: progression.growthIncrease,
cooldownHours: progression.cooldownHours
}
});
}
);
}
);
});
});
} catch (error) {
res.status(500).json({ error: 'Server error' });
}
});

// Get user's investments
router.get('/portfolio', auth, (req, res) => {
const userId = req.user.userId;

const query = `
SELECT i.*, b.name as business_name, b.risk_rating,
p.status as payout_status, p.amount as payout_amount,
p.processed_at, p.completed_at
FROM investments i
JOIN businesses b ON i.business_id = b.id
LEFT JOIN payouts p ON i.id = p.investment_id
WHERE i.user_id = ?
ORDER BY i.created_at DESC
`;

db.all(query, [userId], (err, investments) => {
if (err) {
return res.status(500).json({ error: 'Failed to fetch investments' });
}

// Group by status for easier frontend handling
const portfolio = {
active: investments.filter(inv => inv.status === 'pending_escrow'),
released: investments.filter(inv => inv.status === 'released'),
processing: investments.filter(inv => inv.status === 'processing'),
completed: investments.filter(inv => inv.status === 'paid'),
total: {
invested: investments.reduce((sum, inv) => sum + inv.amount, 0),
returns: investments.reduce((sum, inv) => sum + (inv.payout_amount || 0), 0),
pending: investments.filter(inv => inv.status === 'pending_escrow').length
}
};

res.json({ portfolio });
});
});

module.exports = router;

