const express = require('express');
const { db } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get user dashboard data
router.get('/dashboard', auth, (req, res) => {
const userId = req.user.userId;

// Get user info with current stats
db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
if (err) {
return res.status(500).json({ error: 'Database error' });
}

// Get investment summary
const investmentQuery = `
SELECT
COUNT(*) as total_investments,
COALESCE(SUM(amount), 0) as total_invested,
COUNT(CASE WHEN status = 'pending_escrow' THEN 1 END) as pending_count,
COUNT(CASE WHEN status = 'paid' THEN 1 END) as completed_count
FROM investments
WHERE user_id = ?
`;

db.get(investmentQuery, [userId], (err, investmentStats) => {
if (err) {
return res.status(500).json({ error: 'Failed to fetch investment stats' });
}

// Get recent investments
const recentQuery = `
SELECT i.*, b.name as business_name, b.risk_rating
FROM investments i
JOIN businesses b ON i.business_id = b.id
WHERE i.user_id = ?
ORDER BY i.created_at DESC
LIMIT 5
`;

db.all(recentQuery, [userId], (err, recentInvestments) => {
if (err) {
return res.status(500).json({ error: 'Failed to fetch recent investments' });
}

// Calculate tier progress
const tierRanges = [
{ tier: 1, min: 35, max: 250 },
{ tier: 2, min: 250, max: 1000 },
{ tier: 3, min: 1000, max: 2000 },
{ tier: 4, min: 2000, max: 3000 }
];

const currentTierRange = tierRanges.find(t => t.tier === user.current_tier);
const progressPercent = currentTierRange
? ((user.max_spend_limit - currentTierRange.min) / (currentTierRange.max - currentTierRange.min)) * 100
: 100;

const dashboard = {
user: {
id: user.id,
email: user.email,
firstName: user.first_name,
lastName: user.last_name,
maxSpendLimit: user.max_spend_limit,
currentTier: user.current_tier,
kycStatus: user.kyc_status,
cooldownUntil: user.cooldown_until
},
progress: {
currentLimit: user.max_spend_limit,
currentTier: user.current_tier,
progressPercent: Math.min(progressPercent, 100),
nextTierAt: currentTierRange ? currentTierRange.max : 3000,
remainingToNextTier: currentTierRange
? Math.max(0, currentTierRange.max - user.max_spend_limit)
: 0
},
stats: investmentStats,
recentInvestments,
cooldownInfo: {
inCooldown: user.cooldown_until && new Date() < new Date(user.cooldown_until),
hoursRemaining: user.cooldown_until
? Math.max(0, Math.ceil((new Date(user.cooldown_until) - new Date()) / (1000 * 60 * 60)))
: 0
}
};

res.json({ dashboard });
});
});
});
});

// Update KYC status (simplified - in production would integrate with ID verification service)
router.post('/kyc', auth, (req, res) => {
const { documentType, documentNumber } = req.body;
const userId = req.user.userId;

// Simplified KYC - in production, integrate with Jumio/Persona/etc
if (!documentType || !documentNumber) {
return res.status(400).json({ error: 'Document type and number required' });
}

db.run(
'UPDATE users SET kyc_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
['verified', userId],
function(err) {
if (err) {
return res.status(500).json({ error: 'Failed to update KYC status' });
}

res.json({ message: 'KYC verification completed successfully' });
}
);
});

module.exports = router;
