const express = require('express');
const { db } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all verified businesses
router.get('/', (req, res) => {
const query = `
SELECT b.*,
ROUND(AVG(br.rating), 1) as avg_rating,
COUNT(br.id) as rating_count,
ROUND(b.monthly_revenue * 0.3) as max_investment_per_user
FROM businesses b
LEFT JOIN business_ratings br ON b.id = br.business_id
WHERE b.verification_status = 'verified'
GROUP BY b.id
ORDER BY b.risk_score DESC, b.monthly_revenue DESC
`;

db.all(query, [], (err, businesses) => {
if (err) {
return res.status(500).json({ error: 'Failed to fetch businesses' });
}

res.json({ businesses });
});
});

// Get single business with detailed info
router.get('/:id', (req, res) => {
const businessId = req.params.id;

const businessQuery = `
SELECT b.*,
ROUND(AVG(br.rating), 1) as avg_rating,
COUNT(br.id) as rating_count,
ROUND(b.monthly_revenue * 0.3) as max_investment_per_user
FROM businesses b
LEFT JOIN business_ratings br ON b.id = br.business_id
WHERE b.id = ? AND b.verification_status = 'verified'
GROUP BY b.id
`;

db.get(businessQuery, [businessId], (err, business) => {
if (err) {
return res.status(500).json({ error: 'Database error' });
}

if (!business) {
return res.status(404).json({ error: 'Business not found' });
}

// Get recent ratings and comments
const ratingsQuery = `
SELECT br.*, u.first_name, u.last_name
FROM business_ratings br
JOIN users u ON br.user_id = u.id
WHERE br.business_id = ?
ORDER BY br.created_at DESC
LIMIT 10
`;

db.all(ratingsQuery, [businessId], (err, ratings) => {
if (err) {
return res.status(500).json({ error: 'Failed to fetch ratings' });
}

// Get investment statistics
const statsQuery = `
SELECT
COUNT(*) as total_investments,
COALESCE(SUM(amount), 0) as total_invested,
COALESCE(AVG(amount), 0) as avg_investment
FROM investments
WHERE business_id = ?
`;

db.get(statsQuery, [businessId], (err, stats) => {
if (err) {
return res.status(500).json({ error: 'Failed to fetch stats' });
}

res.json({
business: {
...business,
ratings,
stats
}
});
});
});
});
});

// Add rating/comment to business
router.post('/:id/rate', auth, (req, res) => {
const { rating, comment } = req.body;
const businessId = req.params.id;
const userId = req.user.userId;

if (!rating || rating < 1 || rating > 5) {
return res.status(400).json({ error: 'Rating must be between 1 and 5' });
}

// Check if user has invested in this business
db.get(
'SELECT id FROM investments WHERE user_id = ? AND business_id = ?',
[userId, businessId],
(err, investment) => {
if (err) {
return res.status(500).json({ error: 'Database error' });
}

if (!investment) {
return res.status(403).json({ error: 'You must invest before rating' });
}

// Insert or update rating
db.run(
`INSERT OR REPLACE INTO business_ratings
(business_id, user_id, rating, comment)
VALUES (?, ?, ?, ?)`,
[businessId, userId, rating, comment],
function(err) {
if (err) {
return res.status(500).json({ error: 'Failed to save rating' });
}

res.json({ message: 'Rating saved successfully' });
}
);
}
);
});

module.exports = router;
```
