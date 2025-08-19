const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use writable directory in Railway (production), otherwise local file
const dbPath = process.env.NODE_ENV === 'production'
? path.join('/tmp', 'microvest.db')
: path.join(__dirname, 'microvest.db');

// Ensure directory exists (mainly for local dev)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
if (err) {
console.error('Failed to open DB:', err);
}
});

const initDatabase = () => {
return new Promise((resolve, reject) => {
db.serialize(() => {
// Users table
db.run(`
CREATE TABLE IF NOT EXISTS users (
id INTEGER PRIMARY KEY AUTOINCREMENT,
email TEXT UNIQUE NOT NULL,
password_hash TEXT NOT NULL,
first_name TEXT NOT NULL,
last_name TEXT NOT NULL,
phone TEXT,
kyc_status TEXT DEFAULT 'pending',
max_spend_limit REAL DEFAULT 35.00,
current_tier INTEGER DEFAULT 1,
cooldown_until DATETIME,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

// Businesses table
db.run(`
CREATE TABLE IF NOT EXISTS businesses (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL,
description TEXT,
owner_id INTEGER,
llc_verified BOOLEAN DEFAULT false,
bank_verified BOOLEAN DEFAULT false,
monthly_revenue REAL DEFAULT 0,
risk_rating TEXT DEFAULT 'C',
risk_score INTEGER DEFAULT 70,
video_url TEXT,
verification_status TEXT DEFAULT 'pending',
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (owner_id) REFERENCES users (id)
)
`);

// Investments table
db.run(`
CREATE TABLE IF NOT EXISTS investments (
id INTEGER PRIMARY KEY AUTOINCREMENT,
user_id INTEGER NOT NULL,
business_id INTEGER NOT NULL,
amount REAL NOT NULL,
fee_amount REAL DEFAULT 0,
status TEXT DEFAULT 'pending_escrow',
risk_percentage REAL,
growth_increase REAL DEFAULT 0,
expected_return REAL,
payout_date DATE,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users (id),
FOREIGN KEY (business_id) REFERENCES businesses (id)
)
`);

// Payouts table
db.run(`
CREATE TABLE IF NOT EXISTS payouts (
id INTEGER PRIMARY KEY AUTOINCREMENT,
investment_id INTEGER NOT NULL,
user_id INTEGER NOT NULL,
amount REAL NOT NULL,
fee_amount REAL DEFAULT 0,
status TEXT DEFAULT 'pending',
processed_at DATETIME,
completed_at DATETIME,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (investment_id) REFERENCES investments (id),
FOREIGN KEY (user_id) REFERENCES users (id)
)
`);

// Business ratings table
db.run(`
CREATE TABLE IF NOT EXISTS business_ratings (
id INTEGER PRIMARY KEY AUTOINCREMENT,
business_id INTEGER NOT NULL,
user_id INTEGER NOT NULL,
rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
comment TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (business_id) REFERENCES businesses (id),
FOREIGN KEY (user_id) REFERENCES users (id)
)
`);

// Development only: insert sample data
if (process.env.NODE_ENV !== 'production') {
db.run(`
INSERT OR IGNORE INTO businesses (
id, name, description, monthly_revenue, risk_rating, risk_score,
llc_verified, bank_verified, verification_status, video_url
) VALUES
(1, 'EcoTech Solutions', 'Sustainable technology for modern homes', 15000, 'A', 92, 1, 1, 'verified', 'https://example.com/video1'),
(2, 'Urban Farming Co', 'Vertical farming solutions for cities', 8500, 'B', 85, 1, 1, 'verified', 'https://example.com/video2'),
(3, 'Digital Health Plus', 'AI-powered health monitoring', 25000, 'A', 95, 1, 1, 'verified', 'https://example.com/video3'),
(4, 'Green Energy Storage', 'Battery solutions for renewable energy', 12000, 'B', 78, 1, 1, 'verified', 'https://example.com/video4'),
(5, 'Smart Logistics Hub', 'Last-mile delivery optimization', 6000, 'C', 72, 1, 1, 'verified', 'https://example.com/video5')
`);
}

resolve();
});
});
};

module.exports = { initDatabase };
