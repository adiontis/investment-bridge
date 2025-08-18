const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 5, // 5 attempts per window
message: {
error: 'Too many authentication attempts, please try again later.'
},
standardHeaders: true,
legacyHeaders: false,
});

const apiLimiter = rateLimit({
windowMs: 15 * 60 * 1000, // 15 minutes
max: 100, // 100 requests per window
message: {
error: 'Too many requests, please try again later.'
}
});

const investmentLimiter = rateLimit({
windowMs: 60 * 1000, // 1 minute
max: 3, // 3 investments per minute
message: {
error: 'Investment rate limit exceeded. Please wait before making another investment.'
}
});

module.exports = {
auth: authLimiter,
api: apiLimiter,
investment: investmentLimiter
};
```
