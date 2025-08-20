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
      window.scrollTo(0, 0);
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
      
      document.getElementById('currentLimit').textContent = `$${Math.round(dashboard.progress.currentLimit)}`;
      document.getElementById('currentTier').textContent = `Tier ${dashboard.progress.currentTier}`;
      document.getElementById('progressFill').style.width = `${dashboard.progress.progressPercent}%`;
      document.getElementById('progressText').textContent = `$${Math.round(dashboard.progress.remainingToNextTier)} to next tier`;
      
      document.getElementById('totalInvested').textContent = `$${Math.round(dashboard.stats.total_invested)}`;
      document.getElementById('activeInvestments').textContent = dashboard.stats.pending_count;
      document.getElementById('completedInvestments').textContent = dashboard.stats.completed_count;
      
      if (dashboard.cooldownInfo.inCooldown) {
        const banner = document.getElementById('cooldownBanner');
        const timer = document.getElementById('cooldownTimer');
        banner.style.display = 'flex';
        timer.textContent = `${dashboard.cooldownInfo.hoursRemaining}h remaining`;
      }
    } catch (error) {
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
      this.showToast('Failed to load businesses', 'error');
    }
  }
  
  async showBusinessDetail(businessId) {
    this.showPage('businessDetail');
    this.showToast('Business details coming soon!', 'info');
  }
  
  async loadPortfolio() {
    const container = document.getElementById('portfolioContent');
    container.innerHTML = `
      <div class="empty-state">
        <p>Portfolio functionality coming soon!</p>
      </div>
    `;
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
  
  showToast(message, type = 'info', duration = 3000) {
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