// Risk-Reward Progression System Implementation

const TIER_CONFIG = {
1: { min: 35, max: 250, baseGrowthRate: 0.50 },
2: { min: 250, max: 1000, baseGrowthRate: 0.75 },
3: { min: 1000, max: 2000, baseGrowthRate: 1.00 },
4: { min: 2000, max: 3000, baseGrowthRate: 1.50 }
};

const RISK_MULTIPLIERS = {
low: { threshold: 0.25, multiplier: 1.0, cooldownHours: 0 },
medium: { threshold: 0.50, multiplier: 1.5, cooldownHours: 0 },
high: { threshold: 0.99, multiplier: 2.0, cooldownHours: 12 },
allIn: { threshold: 1.00, multiplier: 3.0, cooldownHours: 24 }
};

const MAX_INCREASE_PER_TRANSACTION = 500;
const MAX_SPEND_LIMIT = 3000;

function calculateProgression(user, investmentAmount) {
// 1. Minimum investment check
if (investmentAmount < 5) {
throw new Error('Minimum investment is $5');
}

// 2. Determine current tier
const currentTier = getCurrentTier(user.max_spend_limit);
const tierConfig = TIER_CONFIG[currentTier];

if (!tierConfig) {
throw new Error('Invalid tier configuration');
}

// 3. Calculate risk percentage and get multiplier
const riskPercentage = investmentAmount / user.max_spend_limit;
const riskLevel = getRiskLevel(riskPercentage);
const riskMultiplier = RISK_MULTIPLIERS[riskLevel];

// 4. Calculate raw increase
const rawIncrease = investmentAmount * tierConfig.baseGrowthRate;

// 5. Apply risk adjustment
const riskAdjustedIncrease = rawIncrease * riskMultiplier.multiplier;

// 6. Apply per-transaction cap
const cappedIncrease = Math.min(riskAdjustedIncrease, MAX_INCREASE_PER_TRANSACTION);

// 7. Calculate new max limit
const newMaxLimit = Math.min(user.max_spend_limit + cappedIncrease, MAX_SPEND_LIMIT);

// 8. Determine new tier
const newTier = getCurrentTier(newMaxLimit);

return {
growthIncrease: cappedIncrease,
newMaxLimit,
newTier,
riskLevel,
cooldownHours: riskMultiplier.cooldownHours,
wasCapReached: riskAdjustedIncrease > MAX_INCREASE_PER_TRANSACTION
};
}

function getCurrentTier(maxSpendLimit) {
for (const [tier, config] of Object.entries(TIER_CONFIG)) {
if (maxSpendLimit >= config.min && maxSpendLimit < config.max) {
return parseInt(tier);
}
}
return 4; // Max tier
}

function getRiskLevel(riskPercentage) {
if (riskPercentage >= RISK_MULTIPLIERS.allIn.threshold) return 'allIn';
if (riskPercentage >= RISK_MULTIPLIERS.high.threshold) return 'high';
if (riskPercentage >= RISK_MULTIPLIERS.medium.threshold) return 'medium';
return 'low';
}

module.exports = {
calculateProgression,
TIER_CONFIG,
RISK_MULTIPLIERS
};
