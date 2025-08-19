const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { validateRegistration, validateLogin } = require('../middleware/validation');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Register
router.post('/register', rateLimit.auth, validateRegistration, async (req, res) => {
try {
const { email, password, firstName, lastName, phone } = req.body;

// Check if user exists
db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
if (err) {
return res.status(500).json({ error: 'Database error' });
}

if (row) {
return res.status(400).json({ error: 'Email already registered' });
}

// Hash password
const passwordHash = await bcrypt.hash(password, 10);

// Insert user
db.run(
`INSERT INTO users (email, password_hash, first_name, last_name, phone)
VALUES (?, ?, ?, ?, ?)`,
[email, passwordHash, firstName, lastName, phone],
function(err) {
if (err) {
return res.status(500).json({ error: 'Failed to create user' });
}

const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '24h' });

res.status(201).json({
message: 'Registration successful',
token,
user: {
id: this.lastID,
email,
firstName,
lastName,
maxSpendLimit: 35.00,
currentTier: 1
}
});
}
);
});
} catch (error) {
res.status(500).json({ error: 'Server error' });
}
});

// Login
router.post('/login', rateLimit.auth, validateLogin, async (req, res) => {
try {
const { email, password } = req.body;

db.get(
'SELECT * FROM users WHERE email = ?',
[email],
async (err, user) => {
if (err) {
return res.status(500).json({ error: 'Database error' });
}

if (!user || !await bcrypt.compare(password, user.password_hash)) {
return res.status(401).json({ error: 'Invalid credentials' });
}

const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

res.json({
message: 'Login successful',
token,
user: {
id: user.id,
email: user.email,
firstName: user.first_name,
lastName: user.last_name,
maxSpendLimit: user.max_spend_limit,
currentTier: user.current_tier,
kycStatus: user.kyc_status,
cooldownUntil: user.cooldown_until
}
});
}
);
} catch (error) {
res.status(500).json({ error: 'Server error' });
}
});

module.exports = router;

