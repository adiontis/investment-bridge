// Automated Business Risk Rating System

const RATING_WEIGHTS = {
revenueConsistency: 0.25,
payoutHistory: 0.30,
investorReturns: 0.25,
reputationMetrics: 0.15,
financialHealth: 0.05
};

function calculateRiskRating(businessId) {
return new Promise((resolve, reject) => {
const { db } = require('../database');

// Get business data
db.get('SELECT * FROM businesses WHERE id = ?', [businessId], (err, business) => {
if (err) return reject(err);

Promise.all([
calculateRevenueConsistency(businessId),
calculatePayoutHistory(businessId),
calculateInvestorReturns(businessId),
calculateReputationMetrics(businessId),
calculateFinancialHealth(businessId)
]).then(scores => {
const [revenue, payout, returns, reputation, financial] = scores;

const totalScore =
(revenue * RATING_WEIGHTS.revenueConsistency) +
(payout * RATING_WEIGHTS.payoutHistory) +
(returns * RATING_WEIGHTS.investorReturns) +
(reputation * RATING_WEIGHTS.reputationMetrics) +
(financial * RATING_WEIGHTS.financialHealth);

const grade = scoreToGrade(totalScore);

// Update business rating in database
db.run(
'UPDATE businesses SET risk_rating = ?, risk_score = ? WHERE id = ?',
[grade, Math.round(totalScore), businessId],
(err) => {
if (err) return reject(err);
resolve({ grade, score: totalScore });
}
);
}).catch(reject);
});
});
}

function calculateRevenueConsistency(businessId) {
// Simplified - would integrate with bank data in production
return Promise.resolve(85); // Mock score
}

function calculatePayoutHistory(businessId) {
return new Promise((resolve) => {
const { db } = require('../database');

db.all(`
SELECT COUNT(*) as total,
COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed
FROM payouts p
JOIN investments i ON p.investment_id = i.id
WHERE i.business_id = ?
`, [businessId], (err, rows) => {
if (err || !rows[0] || rows[0].total === 0) {
return resolve(70); // Default score for new businesses
}

const successRate = (rows[0].completed / rows[0].total) * 100;
resolve(successRate);
});
});
}

function calculateInvestorReturns(businessId) {
return new Promise((resolve) => {
const { db } = require('../database');

db.all(`
SELECT AVG(p.amount / i.amount) as avg_return_ratio
FROM payouts p
JOIN investments i ON p.investment_id = i.id
WHERE i.business_id = ? AND p.status = 'paid'
`, [businessId], (err, rows) => {
if (err || !rows[0] || !rows[0].avg_return_ratio) {
return resolve(70); // Default score
}

const returnRatio = rows[0].avg_return_ratio;
const score = Math.min(100, Math.max(0, (returnRatio - 1) * 500 + 50));
resolve(score);
});
});
}

function calculateReputationMetrics(businessId) {
return new Promise((resolve) => {
const { db } = require('../database');

db.get(`
SELECT AVG(rating) as avg_rating, COUNT(*) as rating_count
FROM business_ratings
WHERE business_id = ?
`, [businessId], (err, row) => {
if (err || !row || row.rating_count === 0) {
return resolve(70); // Default score
}

const avgRating = row.avg_rating;
const ratingCount = row.rating_count;

// Score based on average rating with confidence adjustment
const baseScore = (avgRating / 5) * 100;
const confidenceMultiplier = Math.min(1, ratingCount / 10);

resolve(baseScore * confidenceMultiplier + (1 - confidenceMultiplier) * 70);
});
});
}

function calculateFinancialHealth(businessId) {
// Simplified - would analyze chargeback rates, refunds, etc.
return Promise.resolve(90);
}

function scoreToGrade(score) {
if (score >= 90) return 'A';
if (score >= 80) return 'B';
if (score >= 70) return 'C';
if (score >= 60) return 'D';
return 'F';
}

module.exports = {
calculateRiskRating,
scoreToGrade
};

