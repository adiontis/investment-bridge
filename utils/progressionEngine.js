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
const riskPercentage = investmentAmount
```
