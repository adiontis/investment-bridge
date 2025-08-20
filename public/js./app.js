// Main Application Controller

class Microvest {
  constructor() {
    this.currentUser = null;
    this.currentPage = 'home';
    this.apiBase = '/api';
    
    this.init();
  }
  
  init() {
    // Check for stored auth token
    const token = localStorage.getItem('authToken');
    if (token) {
      this.setAuthToken(token);
      this.loadUserData();
    }
    
    // Initialize page routing
    this.initializeRouting();
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Show appropriate page
    this.showPage(this.getInitialPage());
  }
  
  getInitialPage() {
    const hash = window.location.hash.substring(1);
    return hash || 'home';
  }
  
  initializeRouting() {
    window.addEventListener('hashchange', () => {
      const page = window.location.hash.substring(1) || 'home';
      this.showPage(page);
    });
  }
  
  setupEventListeners() {
    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegister(e.target);
      });
    }
    
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin(e.target);
      });
    }
  }
  
  showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
      page.classList.remove('active');
    });
    
    // Show requested page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = pageId;
      
      // Update URL hash
      if (window.location.hash.substring(1) !== pageId) {
        window.location.hash = pageId;
      }
      
      // Load page-specific data
      this.loadPageData(pageId);
    }
  }
  
  loadPageData(pageId) {
    switch (pageId) {
      case 'dashboard':
        if (this.currentUser) {
          this.loadDashboard();
        } else {
          this.showPage('login');
        }
        break;
      case 'businesses':
        this.loadBusinesses();
        break;
      case 'portfolio':
        if (this.currentUser) {
          this.loadPortfolio();
        } else {
          this.showPage('login');
        }
        break;
    }
  }
  
  async handleRegister(form) {
    const formData = new FormData(form);
    const data = {
      email: formData.get('email'),
      password: formData.get('password'),
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      phone: formData.get('phone')
    };
    
    try {
      const response = await this.apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (response.token) {
        this.setAuthToken(response.token);
        this.currentUser = response.user;
        this.updateAuthUI();
        this.showToast('Registration successful! Welcome to Microvest.', 'success');
        this.showPage('dashboard');
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }
  
  async handleLogin(form) {
    const formData = new FormData(form);
    const data = {
      email: formData.get('email'),
      password: formData.get('password')
    };
    
    try {
      const response = await this.apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (response.token) {
        this.setAuthToken(response.token);
        this.currentUser = response.user;
        this.updateAuthUI();
        this.showToast('Welcome back!', 'success');
        this.showPage('dashboard');
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }
  
  setAuthToken(token) {
    localStorage.setItem('authToken', token);
    this.authToken = token;
  }
  
  async loadUserData() {
    try {
      const response = await this.apiCall('/users/dashboard');
      this.currentUser = response.dashboard.user;
      this.updateAuthUI();
    } catch (error) {
      // Token might be expired
      this.logout();
    }
  }
  
  logout() {
    localStorage.removeItem('authToken');
    this.authToken = null;
    this.currentUser = null;
    this.updateAuthUI();
    this.showToast('Logged out successfully', 'success');
    this.showPage('home');
  }
  
  updateAuthUI() {
    const guestElements = document.querySelectorAll('.auth-guest');
    const userElements = document.querySelectorAll('.auth-required');
    
    if (this.currentUser) {
      guestElements.forEach(el => el.style.display = 'none');
      userElements.forEach(el => el.style.display = 'inline-flex');
    } else {
      guestElements.forEach(el => el.style.display = 'inline-flex');
      userElements.forEach(el => el.style.display = 'none');
    }
  }
  
  async loadDashboard() {
    try {
      const response = await this.apiCall('/users/dashboard');
      const dashboard = response.dashboard;
      
      // Update progress display
      document.getElementById('currentLimit').textContent = `$${Math.round(dashboard.progress.currentLimit)}`;
      document.getElementById('currentTier').textContent = `Tier ${dashboard.progress.currentTier}`;
      document.getElementById('progressFill').style.width = `${dashboard.progress.progressPercent}%`;
      document.getElementById('progressText').textContent = `$${Math.round(dashboard.progress.remainingToNextTier)} to next tier`;
      
      // Update stats
      document.getElementById('totalInvested').textContent = `$${Math.round(dashboard.stats.total_invested)}`;
      document.getElementById('activeInvestments').textContent = dashboard.stats.pending_count;
      document.getElementById('completedInvestments').textContent = dashboard.stats.completed_count;
      
      // Handle cooldown
      if (dashboard.cooldownInfo.inCooldown) {
        const banner = document.getElementById('cooldownBanner');
        const timer = document.getElementById('cooldownTimer');
        banner.style.display = 'flex';
        timer.textContent = `${dashboard.cooldownInfo.hoursRemaining}h remaining`;
      }
      
      // Load recent investments
      const recentContainer = document.getElementById('recentInvestments');
      if (dashboard.recentInvestments.length > 0) {
        recentContainer.innerHTML = dashboard.recentInvestments.map(inv => `
          <div class="investment-item">
            <div class="investment-info">
              <h4>${inv.business_name}</h4>
              <p>$${inv.amount} • ${new Date(inv.created_at).toLocaleDateString()}</p>
            </div>
            <div class="investment-status">
              <span class="investment-amount">$${inv.expected_return}</span>
              <span class="status-badge status-${inv.status.replace('_', '-')}">${inv.status.replace('_', ' ')}</span>
            </div>
          </div>
        `).join('');
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      this.showToast('Failed to load dashboard data', 'error');
    }
  }
  
  async loadBusinesses() {
    try {
      const response = await this.apiCall('/businesses');
      const businesses = response.businesses;
      
      const container = document.getElementById('businessesList');
      container.innerHTML = businesses.map(business => `
        <div class="business-card" onclick="app.showBusinessDetail(${business.id})">
          <div class="business-header">
            <h3 class="business-name">${business.name}</h3>
            <p class="business-description">${business.description}</p>
            
            <div class="business-stats">
              <div class="business-stat">
                <span class="stat-value">$${Math.round(business.monthly_revenue).toLocaleString()}</span>
                <span class="stat-label">Monthly Revenue</span>
              </div>
              <div class="business-stat">
                <span class="stat-value">${business.avg_rating || 'New'}</span>
                <span class="stat-label">Rating</span>
              </div>
            </div>
          </div>
          
          <div class="business-footer">
            <span class="risk-badge risk-${business.risk_rating}">Grade ${business.risk_rating}</span>
            <span class="max-investment">Max: $${Math.round(business.max_investment_per_user).toLocaleString()}</span>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error('Failed to load businesses:', error);
      this.showToast('Failed to load businesses', 'error');
    }
  }
  
  async showBusinessDetail(businessId) {
    try {
      const response = await this.apiCall(`/businesses/${businessId}`);
      const business = response.business;
      
      const container = document.querySelector('.business-detail-container');
      container.innerHTML = `
        <div class="business-detail-header">
          <button class="btn btn-outline" onclick="app.showPage('businesses')">← Back to Businesses</button>
        </div>
        
        <div class="business-detail-grid">
          <div class="business-info">
            <div class="card">
              <h1>${business.name}</h1>
              <p class="business-description">${business.description}</p>
              
              <div class="business-stats">
                <div class="business-stat">
                  <span class="stat-value">$${Math.round(business.monthly_revenue).toLocaleString()}</span>
                  <span class="stat-label">Monthly Revenue</span>
                </div>
                <div class="business-stat">
                  <span class="stat-value">${business.avg_rating || 'New'}</span>
                  <span class="stat-label">Rating (${business.rating_count || 0} reviews)</span>
                </div>
                <div class="business-stat">
                  <span class="stat-value">${business.stats.total_investments}</span>
                  <span class="stat-label">Total Investments</span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="investment-section">
            <div class="card investment-calculator">
              <h3>Make Investment</h3>
              
              <div class="investment-input">
                <label for="investmentAmount">Investment Amount</label>
                <input type="number" id="investmentAmount" min="5" max="${business.max_investment_per_user}" 
                       placeholder="Enter amount ($5 minimum)" oninput="app.updateInvestmentCalculator(${business.id}, this.value)">
              </div>
              
              <div id="investmentSummary" class="investment-summary" style="display:none;">
                <!-- Summary will be populated by updateInvestmentCalculator -->
              </div>
              
              <div id="riskInfo" class="risk-info" style="display:none;">
                <!-- Risk info will be populated by updateInvestmentCalculator -->
              </div>
              
              <button id="investButton" class="btn btn-primary btn-full" disabled 
                      onclick="app.makeInvestment(${business.id})">
                ${this.currentUser ? 'Invest Now' : 'Sign In to Invest'}
              </button>
            </div>
          </div>
        </div>
      `;
      
      this.showPage('businessDetail');
    } catch (error) {
      console.error('Failed to load business details:', error);
      this.showToast('Failed to load business details', 'error');
    }
  }
  
  updateInvestmentCalculator(businessId, amount) {
    const numAmount = parseFloat(amount);
    const summaryDiv = document.getElementById('investmentSummary');
    const riskDiv = document.getElementById('riskInfo');
    const investButton = document.getElementById('investButton');
    
    if (!numAmount || numAmount < 5) {
      summaryDiv.style.display = 'none';
      riskDiv.style.display = 'none';
      investButton.disabled = true;
      return;
    }
    
    if (!this.currentUser) {
      investButton.disabled = true;
      return;
    }
    
    // Calculate fees and expected return
    const feeAmount = numAmount * 0.02;
    const totalCharge = numAmount + feeAmount;
    const expectedReturn = numAmount * 1.12; // Example 12% return
    
    // Calculate risk level
    const riskPercent = (numAmount / this.currentUser.maxSpendLimit) * 100;
    let riskLevel = 'Low';
    let multiplier = 1.0;
    let cooldownHours = 0;
    
    if (riskPercent >= 100) {
      riskLevel = 'All-In';
      multiplier = 3.0;
      cooldownHours = 24;
    } else if (riskPercent >= 50) {
      riskLevel = 'High';
      multiplier = 2.0;
      cooldownHours = 12;
    } else if (riskPercent >= 25) {
      riskLevel = 'Medium';
      multiplier = 1.5;
    }
    
    // Show investment summary
    summaryDiv.innerHTML = `
      <div class="summary-row">
        <span>Investment Amount:</span>
        <span>$${numAmount.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Platform Fee (2%):</span>
        <span>$${feeAmount.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Total Charged:</span>
        <span>$${totalCharge.toFixed(2)}</span>
      </div>
      <div class="summary-row">
        <span>Expected Return:</span>
        <span>$${expectedReturn.toFixed(2)}</span>
      </div>
    `;
    summaryDiv.style.display = 'block';
    
    // Show risk information
    riskDiv.innerHTML = `
      <h4>Risk Level: ${riskLevel} (${riskPercent.toFixed(1)}% of your limit)</h4>
      <div class="risk-details">
        <p>Growth Multiplier: ${multiplier}x</p>
        ${cooldownHours > 0 ? `<p>Recovery Period: ${cooldownHours} hours after investment</p>` : ''}
        <p><strong>Warning:</strong> This investment carries substantial risk. You may lose your entire investment.</p>
      </div>
    `;
    riskDiv.style.display = 'block';
    
    // Enable/disable invest button
    investButton.disabled = numAmount > this.currentUser.maxSpendLimit;
    
    if (investButton.disabled && numAmount > this.currentUser.maxSpendLimit) {
      investButton.textContent = `Exceeds your $${this.currentUser.maxSpendLimit} limit`;
    } else {
      investButton.textContent = 'Invest Now';
    }
  }
  
  async makeInvestment(businessId) {
    const amount = parseFloat(document.getElementById('investmentAmount').value);
    
    if (!this.currentUser) {
      this.showPage('login');
      return;
    }
    
    if (!amount || amount < 5) {
      this.showToast('Minimum investment is $5', 'error');
      return;
    }
    
    try {
      const response = await this.apiCall('/investments', {
        method: 'POST',
        body: JSON.stringify({
          businessId,
          amount
        })
      });
      
      this.showToast('Investment successful! Funds are now in escrow.', 'success');
      
      // Update user data
      this.currentUser.maxSpendLimit = response.progression.newMaxLimit;
      this.currentUser.currentTier = response.progression.newTier;
      
      // Redirect to portfolio
      this.showPage('portfolio');
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }
  
  async loadPortfolio() {
    try {
      const response = await this.apiCall('/investments/portfolio');
      const portfolio = response.portfolio;
      
      const container = document.getElementById('portfolioContent');
      
      // Calculate next payout date
      const nextWednesday = this.getNextWednesday();
      document.getElementById('nextPayoutDate').textContent = nextWednesday.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      }) + ', 12:00 PM EST';
      
      container.innerHTML = `
        <div class="portfolio-sections">
          <div class="portfolio-section">
            <h3>Active Investments (${portfolio.active.length})</h3>
            <div class="portfolio-list">
              ${portfolio.active.length > 0 ? portfolio.active.map(inv => `
                <div class="portfolio-item">
                  <div class="portfolio-business">
                    <h4>${inv.business_name}</h4>
                    <p>Invested ${new Date(inv.created_at).toLocaleDateString()}</p>
                  </div>
                  <div class="portfolio-amount">$${inv.amount}</div>
                  <div class="portfolio-expected">$${inv.expected_return}</div>
                  <span class="status-badge status-${inv.status.replace('_', '-')}">${inv.status.replace('_', ' ')}</span>
                </div>
              `).join('') : '<div class="empty-state"><p>No active investments</p></div>'}
            </div>
          </div>
          
          <div class="card" style="margin-top: 32px;">
            <h3>Portfolio Summary</h3>
            <div class="stats-grid">
              <div class="stat">
                <span class="stat-value">$${portfolio.total.invested}</span>
                <span class="stat-label">Total Invested</span>
              </div>
              <div class="stat">
                <span class="stat-value">$${portfolio.total.returns}</span>
                <span class="stat-label">Total Returns</span>
              </div>
              <div class="stat">
                <span class="stat-value">${portfolio.total.pending}</span>
                <span class="stat-label">Pending</span>
              </div>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      this.showToast('Failed to load portfolio', 'error');
    }
  }
  
  getNextWednesday() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilWednesday = (3 - dayOfWeek + 7) % 7;
    const nextWednesday = new Date(today);
    nextWednesday.setDate(today.getDate() + (daysUntilWednesday === 0 ? 7 : daysUntilWednesday));
    return nextWednesday;
  }
  
  async apiCall(endpoint, options = {}) {
    const url = this.apiBase + endpoint;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.authToken && { 'Authorization': `Bearer ${this.authToken}` })
      },
      ...options
    };
    
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }
    
    return data;
  }
  
  showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
    }, duration);
  }
}

// Initialize the application
const app = new Microvest();

// Global functions for HTML onclick handlers
function showPage(pageId) {
  app.showPage(pageId);
}

function logout() {
  app.logout();
}