const { db } = require('../database');

class NotificationService {
  static async sendPayoutNotification(userId, payoutAmount) {
    // In production, integrate with email service (SendGrid, etc.)
    console.log(`Notification: User ${userId} received payout of $${payoutAmount}`);
    
    // Store notification in database for in-app display
    db.run(
      `INSERT INTO notifications (user_id, type, title, message, created_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, 'payout', 'Payout Received', `You've received a payout of $${payoutAmount}`]
    );
  }
  
  static async sendInvestmentConfirmation(userId, businessName, amount) {
    console.log(`Notification: User ${userId} invested $${amount} in ${businessName}`);
    
    db.run(
      `INSERT INTO notifications (user_id, type, title, message, created_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, 'investment', 'Investment Confirmed', `Your $${amount} investment in ${businessName} is now in escrow`]
    );
  }
  
  static async sendKYCReminder(userId) {
    console.log(`Notification: KYC reminder for user ${userId}`);
    
    db.run(
      `INSERT INTO notifications (user_id, type, title, message, created_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, 'kyc', 'Complete Verification', 'Complete your KYC verification to receive payouts']
    );
  }
  
  static async sendCooldownNotification(userId, hoursRemaining) {
    console.log(`Notification: User ${userId} in cooldown for ${hoursRemaining} hours`);
    
    db.run(
      `INSERT INTO notifications (user_id, type, title, message, created_at) 
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [userId, 'cooldown', 'Account Recovery Period', `Your investment limit is recalibrating. ${hoursRemaining} hours remaining.`]
    );
  }
  
  static async sendWeeklyPayoutReminder() {
    console.log('Sending weekly payout reminders to all eligible users');
    
    // Get all users with pending investments
    db.all(`
      SELECT DISTINCT u.id, u.email, u.first_name
      FROM users u
      JOIN investments i ON u.id = i.user_id
      WHERE i.status = 'pending_escrow'
      AND date(i.payout_date) <= date('now', '+1 day')
    `, [], (err, users) => {
      if (err) {
        console.error('Error fetching users for payout reminder:', err);
        return;
      }
      
      users.forEach(user => {
        db.run(
          `INSERT INTO notifications (user_id, type, title, message, created_at) 
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [user.id, 'reminder', 'Payout Tomorrow', 'Your investments will be processed in tomorrow\'s weekly payout!']
        );
      });
    });
  }
}

module.exports = NotificationService;
