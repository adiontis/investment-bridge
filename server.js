const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const cron = require('node-cron');

const { initDatabase } = require('./database');
const authRoutes = require('./routes/auth');
const businessRoutes = require('./routes/businesses');
const investmentRoutes = require('./routes/investments');
const payoutRoutes = require('./routes/payouts');
const userRoutes = require('./routes/users');
const { processWeeklyPayouts } = require('./utils/escrow');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
contentSecurityPolicy: {
directives: {
defaultSrc: ["'self'"],
styleSrc: ["'self'", "'unsafe-inline'"],
scriptSrc: ["'self'", "'unsafe-inline'"],
imgSrc: ["'self'", "data:", "https:"],
},
},
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/users', userRoutes);

// Serve main app
app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Weekly payout job (Wednesdays at 12:00 PM EST)
cron.schedule('0 12 * * 3', () => {
console.log('Running weekly payout processing...');
processWeeklyPayouts();
}, {
timezone: "America/New_York"
});

// Initialize database and start server
initDatabase().then(() => {
app.listen(PORT, () => {
console.log(`Microvest server running on port ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
}).catch(err => {
console.error('Failed to initialize database:', err);
process.exit(1);
});

module.exports = app;
