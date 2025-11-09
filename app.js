/* DEPRECATED - Using inline JavaScript in index.html */
// ========== IN-MEMORY STORAGE (localStorage alternative) ==========
const inMemoryStorage = {
  // Pre-populate with demo account
  'mosaic_users': JSON.stringify([{
    email: 'demo@mosaic.com',
    password: 'demo123',
    id: 1,
    name: 'Demo User',
    bankConnected: true,
    selectedBank: 'Wells Fargo'
  }])
};

function saveToLocalStorage(key, data) {
  // Use in-memory storage (persistent during session)
  inMemoryStorage['mosaic_' + key] = JSON.stringify(data);
  console.log('Saved to storage:', key, data);
}

function loadFromLocalStorage(key, defaultValue) {
  // Use in-memory storage (persistent during session)
  const data = inMemoryStorage['mosaic_' + key];
  const result = data ? JSON.parse(data) : defaultValue;
  console.log('Loaded from storage:', key, result);
  return result;
}

// Modal state
let activeModal = null;

// ========== STATE MANAGEMENT ==========
const appState = {
  currentPage: 'login',
  currentUser: null,
  isLoading: false,
  error: null,
  savedEmail: '',
  rememberMe: false,
  users: loadFromLocalStorage('users', [
    {
      email: 'demo@mosaic.com',
      password: 'demo123',
      id: 1,
      name: 'Demo User',
      bankConnected: true,
      selectedBank: 'Wells Fargo'
    }
  ]),
  banks: [
    'Wells Fargo', 'Citibank', 'Bank of America', 'Chase'
  ],
  bankAccounts: {
    'Chase': {
      balance: 5432.10,
      monthly_income: 4500.00,
      monthly_spending: 2200.00,
      daily_spending: 42.50,
      daily_budget: 200.00,
      score: 74,
      transactions: [
        { date: '2024-11-08', vendor: 'Starbucks', amount: 6.50, category: 'Coffee' },
        { date: '2024-11-08', vendor: 'Uber Eats', amount: 28.00, category: 'Food Delivery' },
        { date: '2024-11-08', vendor: 'Target', amount: 8.00, category: 'Shopping' }
      ]
    },
    'Bank of America': {
      balance: 3120.75,
      monthly_income: 3800.00,
      monthly_spending: 2950.00,
      daily_spending: 98.50,
      daily_budget: 130.00,
      score: 61,
      transactions: []
    },
    'Wells Fargo': {
      balance: 8765.50,
      monthly_income: 6200.00,
      monthly_spending: 3100.00,
      daily_spending: 103.30,
      daily_budget: 206.70,
      score: 82,
      transactions: []
    },
    'Citibank': {
      balance: 4250.00,
      monthly_income: 5000.00,
      monthly_spending: 2800.00,
      daily_spending: 75.00,
      daily_budget: 166.70,
      score: 68,
      transactions: []
    }
  },
  financialData: {
    balance: 5432.10,
    monthly_income: 4500.00,
    monthly_spending: 2200.00,
    daily_spending: 42.50,
    daily_budget: 200.00,
    savings_rate: 51.1,
    score: 74,
    credit_utilization: 18,
    debt_ratio: 0.15,
    personalizedTips: [
      'Your coffee spending at Starbucks is $186/month (42 visits). Brewing at home 3x/week could save $90/month.',
      'Your Chase credit utilization is at 18%. Great job keeping it under 30% for optimal credit health.',
      'You spent $380 on food delivery this month. Reducing to 2 orders/week saves $200/month and improves your score by 3 points.',
      'Your savings rate is 51% - excellent! You\'re saving $2,300/month which puts you in the top 15% of users.'
    ]
  },
  mosaicCategories: [
    { name: 'Savings', color: '#3B82F6', value: 85, rgb: '59, 130, 246' },
    { name: 'Income', color: '#FBBF24', value: 92, rgb: '251, 191, 36' },
    { name: 'Spending', color: '#F97316', value: 78, rgb: '249, 115, 22' },
    { name: 'Health', color: '#10B981', value: 88, rgb: '16, 185, 129' },
    { name: 'Subscriptions', color: '#A855F7', value: 65, rgb: '168, 85, 247' },
    { name: 'Debt', color: '#EF4444', value: 95, rgb: '239, 68, 68' },
    { name: 'Carbon', color: '#06B6D4', value: 70, rgb: '6, 182, 212' },
    { name: 'Emergency', color: '#E5E7EB', value: 82, rgb: '229, 231, 235' }
  ],
  guruMessages: [],
  guruMinimized: true
};

// ========== CATEGORY BREAKDOWN STATE ==========
const categoryTransactions = {
  'Groceries': [
    { store: 'Whole Foods', amount: 52.30, date: 'Nov 8' },
    { store: 'Trader Joe\'s', amount: 35.40, date: 'Nov 7' },
    { store: 'Whole Foods', amount: 48.95, date: 'Nov 6' },
    { store: 'Kroger', amount: 62.15, date: 'Nov 5' },
    { store: 'Whole Foods', amount: 55.80, date: 'Nov 4' },
    { store: 'Safeway', amount: 41.20, date: 'Nov 3' },
    { store: 'Trader Joe\'s', amount: 38.90, date: 'Nov 2' },
    { store: 'Whole Foods', amount: 59.60, date: 'Nov 1' },
    { store: 'Kroger', amount: 45.30, date: 'Oct 31' },
    { store: 'Whole Foods', amount: 50.40, date: 'Oct 30' }
  ],
  'Dining': [
    { store: 'The Cheesecake Factory', amount: 68.50, date: 'Nov 8' },
    { store: 'Chipotle', amount: 15.30, date: 'Nov 7' },
    { store: 'Olive Garden', amount: 52.80, date: 'Nov 6' },
    { store: 'Panera Bread', amount: 18.95, date: 'Nov 5' },
    { store: 'Red Lobster', amount: 72.30, date: 'Nov 4' },
    { store: 'Subway', amount: 12.50, date: 'Nov 3' },
    { store: 'Applebee\'s', amount: 45.60, date: 'Nov 2' },
    { store: 'Starbucks', amount: 6.75, date: 'Nov 1' },
    { store: 'McDonald\'s', amount: 11.20, date: 'Oct 31' },
    { store: 'Chili\'s', amount: 38.90, date: 'Oct 30' }
  ],
  'Subscriptions': [
    { store: 'Netflix', amount: 15.99, date: 'Nov 1' },
    { store: 'Spotify Premium', amount: 10.99, date: 'Nov 1' },
    { store: 'Disney+', amount: 13.99, date: 'Nov 1' },
    { store: 'HBO Max', amount: 15.99, date: 'Nov 1' },
    { store: 'Gym Membership', amount: 45.00, date: 'Nov 1' },
    { store: 'Adobe Creative Cloud', amount: 54.99, date: 'Nov 1' },
    { store: 'Amazon Prime', amount: 14.99, date: 'Oct 15' },
    { store: 'Apple iCloud', amount: 2.99, date: 'Nov 1' }
  ],
  'Shopping': [
    { store: 'Amazon', amount: 89.50, date: 'Nov 8' },
    { store: 'Target', amount: 65.30, date: 'Nov 7' },
    { store: 'Best Buy', amount: 124.99, date: 'Nov 6' },
    { store: 'Walmart', amount: 42.80, date: 'Nov 5' },
    { store: 'Amazon', amount: 56.70, date: 'Nov 4' },
    { store: 'Target', amount: 38.90, date: 'Nov 3' },
    { store: 'Apple Store', amount: 32.00, date: 'Nov 2' }
  ],
  'Utilities': [
    { store: 'Electric Company', amount: 120.50, date: 'Nov 1' },
    { store: 'Water Department', amount: 45.30, date: 'Nov 1' },
    { store: 'Internet Provider', amount: 79.99, date: 'Nov 1' },
    { store: 'Phone Bill', amount: 65.00, date: 'Nov 1' }
  ],
  'Transport': [
    { store: 'Shell Gas Station', amount: 52.40, date: 'Nov 8' },
    { store: 'Uber', amount: 28.50, date: 'Nov 7' },
    { store: 'Chevron', amount: 48.90, date: 'Nov 5' },
    { store: 'Lyft', amount: 35.60, date: 'Nov 4' },
    { store: 'BP Gas', amount: 51.20, date: 'Nov 2' },
    { store: 'Uber', amount: 22.80, date: 'Nov 1' }
  ]
};

// ========== ROUTING SYSTEM ==========
function updatePage() {
  const hash = window.location.hash.slice(1) || 'login';
  appState.currentPage = hash;
  
  console.log('Updating page to:', hash);
  
  let pageHTML = '';
  
  switch(hash) {
    case 'login':
      pageHTML = renderLoginPage();
      break;
    case 'signup':
      pageHTML = renderSignupPage();
      break;
    case 'signin-email':
      pageHTML = renderSigninEmailPage();
      break;
    case 'bank-selection':
      pageHTML = renderBankSelectionPage();
      break;
    case 'manual-entry':
      pageHTML = renderManualEntryPage();
      break;
    case 'dashboard':
      pageHTML = renderDashboardPage();
      break;
    case 'insights':
      pageHTML = renderInsightsPage();
      break;
    case 'goals':
      pageHTML = renderGoalsPage();
      break;
    case 'carbon':
      pageHTML = renderCarbonPage();
      break;
    case 'credit':
      pageHTML = renderCreditPage();
      break;
    case 'settings':
      pageHTML = renderSettingsPage();
      break;
    case 'purchase-advisor':
      pageHTML = renderPurchaseAdvisorPage();
      break;
    case 'goal-detail':
      const goalId = new URLSearchParams(window.location.search).get('id');
      pageHTML = renderGoalDetailPage(goalId);
      break;
    case 'create-goal':
      pageHTML = renderCreateGoalPage();
      break;
    case 'category':
      const category = new URLSearchParams(window.location.search).get('name');
      pageHTML = renderCategoryBreakdownPage(category);
      break;
    default:
      pageHTML = renderLoginPage();
  }
  
  const appEl = document.getElementById('app');
  if (!appEl) {
    console.error('App element not found!');
    return;
  }
  
  appEl.innerHTML = pageHTML;
  console.log('Page rendered:', hash);
  attachEventListeners();
  
  // Initialize charts and mosaic if on dashboard
  if (hash === 'dashboard' && appState.currentUser) {
    setTimeout(() => {
      initializeDashboardChart();
      initializeCoinMosaic();
    }, 100);
  }
  
  // Initialize insights page
  if (hash === 'insights' && appState.currentUser) {
    setTimeout(attachInsightListeners, 100);
  }
  
  // Initialize purchase advisor
  if (hash === 'purchase-advisor' && appState.currentUser) {
    setTimeout(attachPurchaseAdvisorListeners, 100);
  }
  
  // Initialize goal detail page
  if (hash.startsWith('goal-detail') && appState.currentUser) {
    setTimeout(attachGoalDetailListeners, 100);
  }
  
  // Handle Guru chat updates
  if ((hash === 'dashboard' || hash === 'goals' || hash === 'settings') && appState.currentUser) {
    setTimeout(attachGuruListeners, 100);
  }
}

function navigate(page) {
  window.location.hash = page;
}

// ========== EVENT LISTENERS ==========
function attachEventListeners() {
  // Navigation buttons
  document.querySelectorAll('[data-navigate]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(e.target.dataset.navigate);
    });
  });
  
  // Category cards with breakdown
  document.querySelectorAll('.category-card[data-category]').forEach(el => {
    el.addEventListener('click', (e) => {
      const category = e.currentTarget.dataset.category;
      window.location.hash = 'category?name=' + encodeURIComponent(category);
    });
  });
  
  // Action buttons
  document.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const action = e.target.dataset.action;
      
      if (action === 'google-signin') {
        handleGoogleSignin();
      } else if (action === 'logout') {
        handleLogout();
      } else if (action === 'disconnect-bank') {
        handleDisconnectBank();
      } else if (action === 'toggle-guru') {
        toggleGuru();
      } else if (action === 'send-guru-message') {
        sendGuruMessage();
      } else if (action === 'ask-guru') {
        const goal = e.target.dataset.goal;
        askGuruAboutGoal(goal);
      } else if (action === 'create-goal') {
        createNewGoal();
      } else if (action === 'close-modal') {
        closeMosaicModal();
      } else if (action === 'show-bank-options') {
        showBankOptions();
      } else if (action === 'use-plaid') {
        usePlaid();
      } else if (action === 'manual-entry') {
        showManualEntry();
      } else if (action === 'analyze-purchase') {
        analyzePurchase();
      }
    });
  });
  
  // Mosaic piece clicks
  document.querySelectorAll('.mosaic-piece').forEach(el => {
    el.addEventListener('click', (e) => {
      const category = e.currentTarget.dataset.category;
      if (category) {
        openMosaicModal(category);
      }
    });
  });
  
  // Modal background click to close
  const modalBg = document.querySelector('.mosaic-modal');
  if (modalBg) {
    modalBg.addEventListener('click', (e) => {
      if (e.target === modalBg) {
        closeMosaicModal();
      }
    });
  }
  
  // Forms
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  }
  
  const signinForm = document.getElementById('signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', handleSignin);
  }
  
  const manualEntryForm = document.getElementById('manual-entry-form');
  if (manualEntryForm) {
    manualEntryForm.addEventListener('submit', handleManualEntry);
  }
  
  // Bank selection
  document.querySelectorAll('.bank-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const bankName = e.currentTarget.dataset.bank;
      handleBankSelection(bankName);
    });
  });
  
  // Loading page animation
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    setTimeout(() => {
      loadingBar.style.width = '100%';
    }, 100);
  }
}

// ========== AUTHENTICATION ==========
function handleGoogleSignin() {
  // Simulate Google OAuth
  appState.currentUser = appState.users[0];
  document.getElementById('app').innerHTML = renderLoadingPage('Google Account');
  
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    setTimeout(() => {
      loadingBar.style.width = '100%';
    }, 100);
  }
  
  setTimeout(() => {
    navigate('dashboard');
  }, 2000);
}

function handleSignup(e) {
  e.preventDefault();
  
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const errorEl = document.getElementById('signup-error');
  
  // Validation
  if (!email || !password || !confirm) {
    errorEl.textContent = 'Please fill in all fields';
    errorEl.classList.add('show');
    return;
  }
  
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    errorEl.classList.add('show');
    return;
  }
  
  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match';
    errorEl.classList.add('show');
    return;
  }
  
  if (appState.users.find(u => u.email === email)) {
    errorEl.textContent = 'This email is already registered. Sign in instead.';
    errorEl.classList.add('show');
    return;
  }
  
  // Create new user
  const newUser = {
    email: email,
    password: password,
    id: appState.users.length + 1,
    name: email.split('@')[0],
    bankConnected: false,
    selectedBank: null
  };
  
  // CRITICAL: Save BEFORE setting current user
  appState.users.push(newUser);
  saveToLocalStorage('users', appState.users);
  
  // Now set as current user and save session
  appState.currentUser = newUser;
  saveToLocalStorage('currentUser', newUser);
  saveToLocalStorage('rememberMe', true);
  saveToLocalStorage('savedEmail', email);
  
  console.log('Account created and saved:', newUser);
  
  // Show loading then go to bank selection
  document.getElementById('app').innerHTML = renderLoadingPage('Your Account');
  
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    setTimeout(() => {
      loadingBar.style.width = '100%';
    }, 100);
  }
  
  setTimeout(() => {
    navigate('bank-selection');
  }, 2000);
}

function handleSignin(e) {
  e.preventDefault();
  
  const email = document.getElementById('signin-email').value;
  const password = document.getElementById('signin-password').value;
  const rememberCheckbox = document.getElementById('remember-me');
  const errorEl = document.getElementById('signin-error');
  
  // Validation
  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields';
    errorEl.classList.add('show');
    return;
  }
  
  const user = appState.users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    errorEl.textContent = 'Invalid email or password';
    errorEl.classList.add('show');
    return;
  }
  
  // FIXED: Save remember me preference
  const rememberMe = rememberCheckbox && rememberCheckbox.checked;
  appState.savedEmail = email;
  appState.rememberMe = rememberMe;
  
  // Success - save session
  appState.currentUser = user;
  appState.savedEmail = email;
  appState.rememberMe = rememberMe;
  
  // FIXED: Save to storage with remember me flag
  saveToLocalStorage('currentUser', user);
  saveToLocalStorage('rememberMe', rememberMe);
  saveToLocalStorage('savedEmail', email);
  
  console.log('Login successful, saved session:', { email, rememberMe });
  
  // Show loading
  document.getElementById('app').innerHTML = renderLoadingPage(user.selectedBank || 'Your Bank');
  
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    setTimeout(() => {
      loadingBar.style.width = '100%';
    }, 100);
  }
  
  setTimeout(() => {
    if (user.bankConnected) {
      navigate('dashboard');
    } else {
      navigate('bank-selection');
    }
  }, 1500);
}

function handleLogout() {
  appState.currentUser = null;
  appState.rememberMe = false;
  
  // Clear in-memory storage
  delete inMemoryStorage['mosaic_currentUser'];
  delete inMemoryStorage['mosaic_rememberMe'];
  delete inMemoryStorage['mosaic_savedEmail'];
  
  navigate('login');
}

function showBankOptions() {
  const container = document.getElementById('bank-options-container');
  if (container) {
    container.style.display = 'block';
    container.scrollIntoView({ behavior: 'smooth' });
  }
}

function usePlaid() {
  // BACKEND CONFIGURATION
  // Update this URL to your deployed backend:
  // - Local: http://localhost:3000
  // - Heroku: https://your-app.herokuapp.com
  // - Railway: https://your-app.railway.app
  const BACKEND_URL = 'http://localhost:3000';
  
  // Step 1: Get link_token from backend
  fetch(`${BACKEND_URL}/api/plaid/create_link_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    // Step 2: Initialize Plaid Link with link_token
    const handler = Plaid.create({
      token: data.link_token,
      onSuccess: function(public_token, metadata) {
        console.log('Plaid Link Success!', metadata);
        const bankName = metadata.institution.name || 'Bank';
        
        // Step 3: Exchange public_token for access_token via backend
        fetch(`${BACKEND_URL}/api/plaid/exchange_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_token })
        })
        .then(res => res.json())
        .then(data => {
          console.log('Token exchange successful!', data);
          
          // Step 4: Update user state
          appState.currentUser.bankConnected = true;
          appState.currentUser.selectedBank = bankName;
          saveToLocalStorage('currentUser', appState.currentUser);
          
          // Show loading
          document.getElementById('app').innerHTML = renderLoadingPage(bankName);
          const loadingBar = document.getElementById('loading-bar');
          if (loadingBar) {
            setTimeout(() => {
              loadingBar.style.width = '100%';
            }, 50);
          }
          
          setTimeout(() => {
            navigate('dashboard');
          }, 1200);
        })
        .catch(error => {
          console.error('Token exchange failed:', error);
          alert('Failed to connect bank. Please try again.');
        });
      },
      onExit: function(err, metadata) {
        if (err) {
          console.error('Plaid Link error:', err);
        }
        // User closed Plaid Link, show manual entry option
        showBankOptions();
      }
    });
    
    handler.open();
  })
  .catch(error => {
    console.error('Failed to create link token:', error);
    alert('Failed to initialize Plaid. Make sure backend is running at ' + BACKEND_URL);
    showBankOptions();
  });
}

function showManualEntry() {
  showBankOptions();
}

function handleManualEntry(e) {
  e.preventDefault();
  
  const bankName = document.getElementById('bank-name').value;
  const accountNumber = document.getElementById('account-number').value;
  const routingNumber = document.getElementById('routing-number').value;
  const username = document.getElementById('bank-username').value;
  const errorEl = document.getElementById('manual-entry-error');
  
  // Validation
  if (!bankName || !accountNumber || !routingNumber || !username) {
    errorEl.textContent = 'Please fill in all required fields';
    errorEl.classList.add('show');
    return;
  }
  
  if (routingNumber.length !== 9) {
    errorEl.textContent = 'Routing number must be 9 digits';
    errorEl.classList.add('show');
    return;
  }
  
  // Success - connect bank
  handleBankSelection(bankName);
}

function handleBankSelection(bankName) {
  if (!appState.currentUser) return;
  
  appState.currentUser.bankConnected = true;
  appState.currentUser.selectedBank = bankName;
  
  // Save to localStorage
  saveToLocalStorage('currentUser', appState.currentUser);
  saveToLocalStorage('users', appState.users);
  
  // Load actual bank data
  if (appState.bankAccounts[bankName]) {
    appState.financialData = { ...appState.bankAccounts[bankName] };
    appState.financialData.savings_rate = ((appState.financialData.monthly_income - appState.financialData.monthly_spending) / appState.financialData.monthly_income * 100).toFixed(1);
  }
  
  // Show loading with smooth animation
  document.getElementById('app').innerHTML = renderLoadingPage(bankName);
  
  const loadingBar = document.getElementById('loading-bar');
  if (loadingBar) {
    setTimeout(() => {
      loadingBar.style.width = '100%';
    }, 50);
  }
  
  // Faster connection (1.2s instead of 2.5s)
  setTimeout(() => {
    navigate('dashboard');
  }, 1200);
}

// ========== BANK MANAGEMENT ==========
function handleDisconnectBank() {
  if (!appState.currentUser) return;
  
  if (confirm('Are you sure you want to disconnect your bank?')) {
    appState.currentUser.bankConnected = false;
    appState.currentUser.selectedBank = null;
    navigate('bank-selection');
  }
}

// ========== GURU AI ASSISTANT ==========
function toggleGuru() {
  appState.guruMinimized = !appState.guruMinimized;
  updatePage();
}

function attachGuruListeners() {
  const guruInput = document.getElementById('guru-input');
  if (guruInput) {
    guruInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendGuruMessage();
      }
    });
  }
}

function sendGuruMessage() {
  const input = document.getElementById('guru-input');
  if (!input || !input.value.trim()) return;
  
  const userMessage = input.value.trim();
  input.value = '';
  
  // Add user message
  appState.guruMessages.push({
    sender: 'user',
    text: userMessage
  });
  
  // Generate Guru response
  const response = generateGuruResponse(userMessage);
  
  setTimeout(() => {
    appState.guruMessages.push({
      sender: 'guru',
      text: response
    });
    updatePage();
    
    // Scroll to bottom
    setTimeout(() => {
      const messagesDiv = document.getElementById('guru-messages');
      if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
    }, 100);
  }, 500);
  
  updatePage();
}

function generateGuruResponse(message) {
  const msg = message.toLowerCase();
  
  if (msg.includes('laptop') || msg.includes('macbook')) {
    return `Based on your current balance of $${appState.financialData.balance.toFixed(2)} and monthly spending, you can afford a MacBook. However, I recommend keeping a $2,000 emergency fund. Want me to create a savings plan that protects your financial health?`;
  } else if (msg.includes('save') || msg.includes('saving')) {
    return `Great question! You're currently saving ${appState.financialData.savings_rate}% of your income. To boost this, try cutting dining to $250/month (currently $380) and canceling unused subscriptions. This could add $200/month to savings!`;
  } else if (msg.includes('carbon') || msg.includes('footprint')) {
    return `Your carbon footprint this month is 285 kg CO2, down 8% from last month! Your biggest impact: food delivery ($120 = 45kg CO2). Switching to grocery stores could save 15kg/month. Want specific recommendations?`;
  } else if (msg.includes('credit') || msg.includes('score')) {
    return `Your financial health score is ${appState.financialData.score}, which translates to an estimated credit score in the same range. Keep making on-time payments and maintaining low credit utilization (currently 18%) to improve further!`;
  } else if (msg.includes('goal')) {
    return `I can help you set achievable goals! Based on your income and spending, I recommend: 1) Emergency fund (6 months expenses), 2) Short-term goals like gadgets or vacations, 3) Long-term investments. What would you like to save for?`;
  } else if (msg.includes('spend')) {
    return `Your monthly spending is $${appState.financialData.monthly_spending.toFixed(2)}. Top categories: Groceries ($520), Dining ($380), Shopping ($450). I notice you're spending $380/month dining out. Reducing to $250 could save $130/month or $1,560/year!`;
  } else {
    return `I'm here to help with your finances! I can advise on: savings goals, spending habits, carbon footprint, credit health, and whether you can afford purchases. What would you like to know more about?`;
  }
}

function askGuruAboutGoal(goal) {
  appState.guruMinimized = false;
  appState.guruMessages.push({
    sender: 'user',
    text: `Tell me about my ${goal} goal`
  });
  
  let response = '';
  if (goal === 'MacBook Pro') {
    response = `Your MacBook Pro goal ($1,999) is very achievable! You've saved $900 (45%). To reach your goal in 4 months, save $275/month. I recommend cutting dining to $250/month (save $130) and canceling HBO Max and Disney+ (save $30). You'll hit your goal and maintain financial health!`;
  } else if (goal === 'Emergency Fund') {
    response = `Your Emergency Fund goal ($12,000) is smart financial planning! You're at $3,420 (28%). Target: 6 months of expenses. To reach this in 12 months, save $715/month. This is aggressive but doable if you optimize subscriptions and reduce delivery spending. Want a detailed plan?`;
  } else if (goal === 'Vacation Fund') {
    response = `Your Vacation Fund ($3,500) is almost there! At $2,380 (68%), you only need $1,120 more. You're on track to hit this goal early - in just 2 months! Keep up your current savings rate and you'll be booking that trip soon!`;
  }
  
  setTimeout(() => {
    appState.guruMessages.push({
      sender: 'guru',
      text: response
    });
    updatePage();
  }, 500);
  
  updatePage();
}

// ========== INSIGHTS EXPANSION ==========
function attachInsightListeners() {
  document.querySelectorAll('.insight-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.insight-actions')) return;
      card.classList.toggle('expanded');
    });
  });
  
  // Attach action button listeners
  document.querySelectorAll('.insight-action-primary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.target.closest('.insight-card');
      const title = card.querySelector('h3').textContent;
      
      if (btn.textContent.includes('Set Reminder')) {
        handleSetReminder(title);
      } else if (btn.textContent.includes('Create Goal')) {
        handleCreateGoalFromInsight(title);
      }
    });
  });
  
  document.querySelectorAll('.insight-action-secondary').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (btn.textContent.includes('Create Goal')) {
        const card = e.target.closest('.insight-card');
        const title = card.querySelector('h3').textContent;
        handleCreateGoalFromInsight(title);
      } else if (btn.textContent.includes('Dismiss')) {
        const card = e.target.closest('.insight-card');
        card.style.display = 'none';
      }
    });
  });
}

// ========== PURCHASE ADVISOR ==========
function attachPurchaseAdvisorListeners() {
  // Listeners will be attached via data-action
}

function analyzePurchase() {
  const urlInput = document.getElementById('purchase-url');
  const resultsDiv = document.getElementById('purchase-results');
  const statusDiv = document.getElementById('analyzing-status');
  
  if (!urlInput || !resultsDiv) return;
  
  const url = urlInput.value.trim();
  if (!url) {
    alert('Please enter a product URL');
    return;
  }
  
  // Show analyzing status
  if (statusDiv) {
    statusDiv.style.display = 'block';
  }
  resultsDiv.innerHTML = '';
  
  // Simulate fetching and analyzing the URL
  setTimeout(() => {
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
    
    // Extract product info from URL
    const products = [
      { keywords: ['macbook', 'laptop', 'mac'], name: 'MacBook Pro 16-inch', price: 2499 },
      { keywords: ['iphone-15-pro', 'iphone/15', 'iphone-pro'], name: 'iPhone 15 Pro Max', price: 1199 },
      { keywords: ['iphone-17', 'iphone/17'], name: 'iPhone 17 Pro Max', price: 1299 },
      { keywords: ['iphone', 'phone'], name: 'iPhone 15 Pro', price: 999 },
      { keywords: ['airpods', 'headphone'], name: 'AirPods Pro', price: 249 },
      { keywords: ['ipad', 'tablet'], name: 'iPad Air', price: 599 }
    ];
  
    let product = { name: 'Product', price: 500 };
    const urlLower = url.toLowerCase();
    
    for (const p of products) {
      if (p.keywords.some(k => urlLower.includes(k))) {
        product = p;
        break;
      }
    }
  
    const balance = appState.financialData.balance;
    const monthlyIncome = appState.financialData.monthly_income;
    const monthlySpending = appState.financialData.monthly_spending;
    const monthlySavings = monthlyIncome - monthlySpending;
    const emergencyFund = 12000;
    const currentEmergency = 3420;
  
    let recommendation = '';
    let className = 'recommendation-box';
  
    if (balance - product.price >= currentEmergency) {
      // Can afford now
      className += ' success';
      recommendation = `
        <h4 style="color: #10B981; font-size: 20px; margin-bottom: 16px;">You can afford this!</h4>
      <p style="font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.8); margin-bottom: 12px;">
        <strong>Current balance:</strong> $${balance.toFixed(2)}<br>
        <strong>After purchase:</strong> $${(balance - product.price).toFixed(2)}<br>
        <strong>Emergency fund:</strong> $${currentEmergency.toFixed(2)} (maintained)
      </p>
        <p style="font-size: 14px; color: rgba(255,255,255,0.7);">You can buy this now and still maintain your financial health. Your emergency fund will remain intact.</p>
      `;
    } else if (product.price < monthlySavings * 3) {
      // Should save for a few months
      const monthsNeeded = Math.ceil(product.price / monthlySavings);
      const monthlySavingsNeeded = product.price / monthsNeeded;
      className += ' warning';
      recommendation = `
        <h4 style="color: #FFDE59; font-size: 20px; margin-bottom: 16px;">Save up first</h4>
      <p style="font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.8); margin-bottom: 16px;">
        Buying this now would reduce your emergency fund below recommended levels.
      </p>
      <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 12px; margin-bottom: 16px;">
        <h5 style="color: white; font-size: 16px; margin-bottom: 12px;">Savings Plan:</h5>
        <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 8px 0;">• Save $${monthlySavingsNeeded.toFixed(2)}/month</p>
        <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 8px 0;">• Timeline: ${monthsNeeded} months</p>
        <p style="font-size: 14px; color: rgba(255,255,255,0.8); margin: 8px 0;">• You'll have $${product.price.toFixed(2)} saved by then</p>
      </div>
      <h5 style="color: white; font-size: 16px; margin-bottom: 12px;">What to sacrifice:</h5>
      <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin: 8px 0;">• Option A: Cut dining by 50% (saves $190/month)</p>
      <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin: 8px 0;">• Option B: Cancel 2 subscriptions (saves $30/month) + reduce shopping by $${(monthlySavingsNeeded - 30).toFixed(0)}/month</p>
        <p style="font-size: 14px; color: rgba(255,255,255,0.7); margin: 8px 0;">• Option C: Increase income by $${monthlySavingsNeeded.toFixed(0)}/month (side gig)</p>
      `;
    } else {
      // Too expensive right now
      className += ' error';
      recommendation = `
        <h4 style="color: #FF6B6B; font-size: 20px; margin-bottom: 16px;">Not recommended</h4>
        <p style="font-size: 15px; line-height: 1.7; color: rgba(255,255,255,0.8); margin-bottom: 12px;">
          This purchase would significantly impact your financial health (currently ${appState.financialData.score}/100).
        </p>
        <p style="font-size: 14px; color: rgba(255,255,255,0.7);">Focus on building your emergency fund first. Come back to this goal in 6-12 months after improving your savings rate.</p>
      `;
    }
    
    resultsDiv.innerHTML = `
      <div class="${className}">
        <h3 style="color: white; font-size: 24px; margin-bottom: 20px;">${product.name} - $${product.price}</h3>
        ${recommendation}
      </div>
    `;
  }, 1500);
}

// ========== GOAL DETAIL ==========
function attachGoalDetailListeners() {
  // Listeners attached via data-action
}

function createNewGoal() {
  navigate('create-goal');
}

function submitNewGoal() {
  const goalName = document.getElementById('goal-name')?.value;
  if (!goalName) return;
  
  const targetAmount = prompt('Target amount ($):');
  if (!targetAmount) return;
  
  const targetDate = prompt('Target date (months from now):');
  if (!targetDate) return;
  
  appState.guruMinimized = false;
  appState.guruMessages.push({
    sender: 'user',
    text: `I want to save $${targetAmount} for ${goalName} in ${targetDate} months. Is this feasible?`
  });
  
  const monthlyRequired = (parseFloat(targetAmount) / parseInt(targetDate)).toFixed(2);
  const currentSavings = appState.financialData.monthly_income - appState.financialData.monthly_spending;
  
  let response = '';
  if (monthlyRequired <= currentSavings) {
    response = `Yes, this is definitely feasible! You need to save $${monthlyRequired}/month, and you're currently saving $${currentSavings.toFixed(2)}/month. You have room to spare! I've analyzed your spending and you can comfortably achieve this goal. Keep up your current habits!`;
  } else {
    const shortfall = monthlyRequired - currentSavings;
    response = `This goal needs $${monthlyRequired}/month, but you're saving $${currentSavings.toFixed(2)}/month. You need an extra $${shortfall.toFixed(2)}/month. Good news: I found potential savings in dining ($130/month) and subscriptions ($67/month). With these cuts, you can achieve your goal!`;
  }
  
  setTimeout(() => {
    appState.guruMessages.push({
      sender: 'guru',
      text: response
    });
    updatePage();
  }, 500);
  
  updatePage();
}

// ========== MOSAIC VISUALIZATION ==========
function initializeMosaicOld() {
  const mosaicGrid = document.getElementById('mosaic-grid');
  if (!mosaicGrid) return;
  
  // Define TREE-SHAPED mosaic pieces arranged in tree silhouette
  const crystalShapes = [
    // TOP - Root/Crown (1 piece - yellow)
    { category: 'Income', x: 280, y: 20, width: 140, height: 100, shape: 'polygon(50% 0%, 75% 25%, 100% 50%, 75% 75%, 50% 100%, 25% 75%, 0% 50%, 25% 25%)', opacity: 0.95 },
    
    // TIER 2 - First branches (2 pieces - blue)
    { category: 'Savings', x: 200, y: 110, width: 120, height: 90, shape: 'polygon(30% 0%, 70% 10%, 90% 40%, 100% 80%, 60% 100%, 20% 90%, 0% 60%, 10% 30%)', opacity: 0.92 },
    { category: 'Health', x: 380, y: 110, width: 120, height: 90, shape: 'polygon(30% 10%, 70% 0%, 100% 30%, 90% 60%, 80% 100%, 40% 100%, 0% 80%, 10% 40%)', opacity: 0.90 },
    
    // TIER 3 - Second branches (3 pieces - green/orange)
    { category: 'Spending', x: 160, y: 200, width: 100, height: 85, shape: 'polygon(40% 0%, 80% 15%, 100% 60%, 70% 100%, 30% 85%, 0% 50%, 20% 15%)', opacity: 0.88 },
    { category: 'Subscriptions', x: 290, y: 200, width: 110, height: 85, shape: 'polygon(30% 5%, 70% 0%, 100% 40%, 85% 80%, 50% 100%, 15% 80%, 0% 40%, 15% 10%)', opacity: 0.86 },
    { category: 'Carbon', x: 420, y: 200, width: 100, height: 85, shape: 'polygon(20% 15%, 60% 0%, 100% 50%, 80% 85%, 50% 100%, 30% 100%, 0% 60%, 15% 15%)', opacity: 0.87 },
    
    // TIER 4 - Bottom branches (4 pieces - purple)
    { category: 'Debt', x: 140, y: 290, width: 90, height: 80, shape: 'polygon(35% 0%, 75% 10%, 100% 55%, 80% 100%, 40% 90%, 0% 45%, 15% 10%)', opacity: 0.85 },
    { category: 'Emergency', x: 250, y: 295, width: 90, height: 75, shape: 'polygon(30% 5%, 70% 0%, 100% 50%, 75% 100%, 25% 95%, 0% 45%, 20% 10%)', opacity: 0.84 },
    { category: 'Health', x: 360, y: 295, width: 95, height: 75, shape: 'polygon(25% 0%, 75% 5%, 100% 45%, 85% 95%, 45% 100%, 15% 100%, 0% 50%, 15% 5%)', opacity: 0.83 },
    { category: 'Savings', x: 470, y: 290, width: 85, height: 80, shape: 'polygon(25% 10%, 65% 0%, 100% 45%, 90% 90%, 50% 100%, 10% 100%, 0% 55%, 15% 15%)', opacity: 0.82 }
  ];
  
  const score = appState.financialData.score || 74;
  
  crystalShapes.forEach((crystal, index) => {
    const category = appState.mosaicCategories.find(c => c.name === crystal.category);
    if (!category) return;
    
    // Show all pieces (tree always visible)
    // Only hide if score is very low
    const requiredScore = (index + 1) * 8;
    if (score < requiredScore) return;
    
    const piece = document.createElement('div');
    piece.className = 'mosaic-piece';
    piece.dataset.category = crystal.category; // Make clickable
    piece.style.left = crystal.x + 'px';
    piece.style.top = crystal.y + 'px';
    piece.style.width = crystal.width + 'px';
    piece.style.height = crystal.height + 'px';
    piece.style.setProperty('--piece-color', category.color);
    piece.style.setProperty('--piece-rgb', category.rgb);
    piece.style.setProperty('--piece-shape', crystal.shape);
    piece.style.setProperty('--piece-opacity', crystal.opacity);
    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'mosaic-piece-tooltip';
    tooltip.textContent = `${category.name}`;
    piece.appendChild(tooltip);
    
    // Stagger animation - tree grows from top to bottom
    piece.style.animation = `fadeIn 0.6s ease ${index * 0.08}s both`;
    
    mosaicGrid.appendChild(piece);
  });
  
  // Add fade-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.8) rotate(-5deg);
      }
      to {
        opacity: var(--piece-opacity);
        transform: scale(1) rotate(0deg);
      }
    }
  `;
  document.head.appendChild(style);
}

function submitNewGoal() {
  const name = document.getElementById('goal-name')?.value;
  const target = document.getElementById('goal-target')?.value;
  const months = document.getElementById('goal-months')?.value;
  
  if (!name || !target || !months) {
    alert('Please fill in all fields');
    return;
  }
  
  alert(`Goal "${name}" created! Target: $${target} in ${months} months`);
  navigate('goals');
}

// ========== CHART INITIALIZATION ==========
function initializeDashboardChart() {
  const canvas = document.getElementById('trends-chart');
  if (!canvas) {
    console.log('Chart canvas not found');
    return;
  }
  
  // Check if Chart.js is loaded
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      datasets: [{
        label: 'Monthly Spending',
        data: [2800, 3100, 2900, 3200, 3000, 2850, 3100, 2950, 3200, 3050, 2900, 2150],
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)',
            callback: function(value) {
              return '$' + value;
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        },
        x: {
          ticks: {
            color: 'rgba(255, 255, 255, 0.5)'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.05)'
          }
        }
      }
    }
  });
}

// ========== KEYBOARD SHORTCUTS ==========
window.addEventListener('keydown', (e) => {
  // Only activate when Cmd/Ctrl is pressed
  if (!e.metaKey && !e.ctrlKey) return;
  
  // Prevent default browser behavior
  switch(e.key.toLowerCase()) {
    case 'd':
      e.preventDefault();
      if (appState.currentUser) navigate('dashboard');
      break;
    case 'g':
      e.preventDefault();
      if (appState.currentUser) navigate('goals');
      break;
    case 'i':
      e.preventDefault();
      if (appState.currentUser) navigate('insights');
      break;
    case 's':
      e.preventDefault();
      if (appState.currentUser) navigate('settings');
      break;
    case 'k':
      e.preventDefault();
      // TODO: Implement search
      alert('Search coming soon!');
      break;
  }
});

// ========== SHOW/HIDE PASSWORD ==========
function togglePasswordVisibility(inputId, buttonEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  if (input.type === 'password') {
    input.type = 'text';
    buttonEl.textContent = '👁️';
  } else {
    input.type = 'password';
    buttonEl.textContent = '👁️‍🗨️';
  }
}

// ========== GLASS TREE MOSAIC WITH SHARDS ==========
function initializeCoinMosaic() {
  const coinContainer = document.getElementById('coin-mosaic');
  if (!coinContainer) return;
  
  const score = appState.financialData.score || 74;
  
  // 25 GLASS SHARDS arranged in TREE SHAPE
  // Shards glow and fill based on score
  const shards = [
    // TOP (Crown/Leaves - Green)
    { name: 'Savings', color: '#10B981', rgb: '16, 185, 129', x: 200, y: 20, size: 80, shape: 'polygon(30% 0%, 70% 5%, 95% 40%, 85% 75%, 50% 100%, 15% 75%, 5% 40%, 25% 5%)', minScore: 0 },
    { name: 'Health', color: '#34D399', rgb: '52, 211, 153', x: 120, y: 60, size: 65, shape: 'polygon(40% 10%, 80% 5%, 100% 45%, 75% 90%, 35% 100%, 5% 60%, 15% 20%)', minScore: 10 },
    { name: 'Goals', color: '#6EE7B7', rgb: '110, 231, 183', x: 280, y: 60, size: 65, shape: 'polygon(20% 5%, 60% 0%, 95% 40%, 85% 80%, 50% 100%, 15% 90%, 0% 50%)', minScore: 15 },
    
    // UPPER TRUNK (Yellow/Orange)
    { name: 'Income', color: '#FBBF24', rgb: '251, 191, 36', x: 180, y: 120, size: 75, shape: 'polygon(35% 0%, 75% 10%, 100% 50%, 80% 90%, 40% 100%, 10% 80%, 0% 40%, 20% 10%)', minScore: 20 },
    { name: 'Budget', color: '#FCD34D', rgb: '252, 211, 77', x: 100, y: 150, size: 60, shape: 'polygon(45% 5%, 85% 0%, 100% 50%, 70% 100%, 30% 95%, 0% 45%, 20% 10%)', minScore: 25 },
    { name: 'Growth', color: '#FDE68A', rgb: '253, 230, 138', x: 300, y: 150, size: 60, shape: 'polygon(15% 0%, 55% 5%, 100% 55%, 80% 100%, 45% 95%, 0% 50%, 10% 10%)', minScore: 30 },
    
    // MIDDLE TRUNK (Orange)
    { name: 'Spending', color: '#F97316', rgb: '249, 115, 22', x: 170, y: 220, size: 85, shape: 'polygon(40% 0%, 75% 5%, 100% 45%, 85% 85%, 50% 100%, 15% 85%, 0% 45%, 25% 5%)', minScore: 35 },
    { name: 'Emergency', color: '#FB923C', rgb: '251, 146, 60', x: 90, y: 250, size: 65, shape: 'polygon(35% 10%, 80% 0%, 100% 50%, 75% 95%, 30% 100%, 5% 60%, 15% 15%)', minScore: 40 },
    { name: 'Future', color: '#FDBA74', rgb: '253, 186, 116', x: 310, y: 250, size: 65, shape: 'polygon(20% 0%, 65% 5%, 100% 55%, 80% 100%, 35% 95%, 0% 50%, 15% 10%)', minScore: 45 },
    
    // LOWER BRANCHES (Red/Purple)
    { name: 'Debt', color: '#EF4444', rgb: '239, 68, 68', x: 160, y: 330, size: 80, shape: 'polygon(35% 5%, 70% 0%, 100% 40%, 90% 80%, 50% 100%, 10% 80%, 0% 40%, 25% 10%)', minScore: 50 },
    { name: 'Credit', color: '#F87171', rgb: '248, 113, 113', x: 80, y: 360, size: 70, shape: 'polygon(40% 0%, 85% 10%, 100% 60%, 70% 100%, 25% 90%, 0% 50%, 20% 10%)', minScore: 55 },
    { name: 'Carbon', color: '#06B6D4', rgb: '6, 182, 212', x: 320, y: 360, size: 70, shape: 'polygon(15% 10%, 60% 0%, 100% 50%, 75% 90%, 40% 100%, 0% 60%, 10% 20%)', minScore: 60 },
    
    // ROOTS (Dark colors)
    { name: 'Subscriptions', color: '#A855F7', rgb: '168, 85, 247', x: 150, y: 440, size: 75, shape: 'polygon(30% 0%, 70% 5%, 100% 50%, 75% 95%, 25% 100%, 0% 50%, 20% 5%)', minScore: 65 },
    { name: 'Investments', color: '#C084FC', rgb: '192, 132, 252', x: 70, y: 470, size: 65, shape: 'polygon(35% 5%, 80% 0%, 100% 55%, 70% 100%, 30% 95%, 0% 50%, 15% 10%)', minScore: 70 },
    { name: 'Wealth', color: '#E9D5FF', rgb: '233, 213, 255', x: 330, y: 470, size: 65, shape: 'polygon(20% 0%, 65% 5%, 100% 50%, 80% 95%, 35% 100%, 0% 55%, 15% 10%)', minScore: 75 }
  ];
  
  shards.forEach((shard, index) => {
    // Only show shards if score meets minimum
    const shouldShow = score >= shard.minScore;
    
    const shardEl = document.createElement('div');
    shardEl.className = 'glass-shard';
    shardEl.style.position = 'absolute';
    shardEl.style.left = shard.x + 'px';
    shardEl.style.top = shard.y + 'px';
    shardEl.style.width = shard.size + 'px';
    shardEl.style.height = shard.size + 'px';
    shardEl.style.setProperty('--shard-shape', shard.shape);
    shardEl.style.setProperty('--shard-color', shouldShow ? shard.color : 'rgba(100,100,100,0.2)');
    shardEl.style.setProperty('--shard-rgb', shard.rgb);
    shardEl.style.setProperty('--shard-opacity', shouldShow ? 0.7 : 0.2);
    shardEl.dataset.category = shard.name;

    
    // Add tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'mosaic-piece-tooltip';
    tooltip.textContent = shard.name;
    shardEl.appendChild(tooltip);
    
    // Click to open modal
    shardEl.addEventListener('click', () => {
      openMosaicModal(shard.name);
    });
    
    // Stagger animation (tree grows from top to bottom)
    shardEl.style.animation = `shardAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08}s both`;
    
    coinContainer.appendChild(shardEl);
  });
  
  // Add center score circle
  const center = document.createElement('div');
  center.className = 'coin-center';
  center.style.width = '160px';
  center.style.height = '160px';
  center.style.background = 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)';
  center.style.border = '3px solid rgba(255, 255, 255, 0.3)';
  center.style.boxShadow = '0 0 60px rgba(16, 185, 129, 0.6), inset 0 0 40px rgba(255, 255, 255, 0.2)';
  center.style.borderRadius = '50%';
  center.style.backdropFilter = 'blur(10px)';
  center.innerHTML = `
    <div class="coin-center-score" style="font-size: 64px; color: white; font-weight: 800; text-shadow: 0 0 20px rgba(16, 185, 129, 0.8);">${score}</div>
    <div class="coin-center-label" style="font-size: 13px; color: rgba(255,255,255,0.8); font-weight: 600; letter-spacing: 0.1em;">SCORE</div>
  `;
  coinContainer.appendChild(center);
  
  // Add animation keyframes
  if (!document.getElementById('shard-animations')) {
    const style = document.createElement('style');
    style.id = 'shard-animations';
    style.textContent = `
      @keyframes shardAppear {
        from {
          opacity: 0;
          transform: scale(0.7) rotate(-10deg) translateY(-20px);
        }
        to {
          opacity: var(--shard-opacity);
          transform: scale(1) rotate(0deg) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// ========== INSIGHT ACTION HANDLERS ==========
function handleSetReminder(insightTitle) {
  const frequency = prompt('How often would you like to be reminded?\n\n1. Daily\n2. Weekly\n3. Monthly\n\nEnter 1, 2, or 3:');
  
  const frequencies = { '1': 'Daily', '2': 'Weekly', '3': 'Monthly' };
  const selected = frequencies[frequency];
  
  if (selected) {
    alert(`✓ Reminder set!\n\nYou'll receive ${selected.toLowerCase()} reminders about:\n"${insightTitle}"\n\nCheck your email and app notifications.`);
  }
}

function handleCreateGoalFromInsight(insightTitle) {
  // Extract goal info from insight
  let goalName = '';
  let suggestedAmount = 0;
  
  if (insightTitle.includes('Coffee')) {
    goalName = 'Reduce Coffee Spending';
    suggestedAmount = 150;
  } else if (insightTitle.includes('Delivery')) {
    goalName = 'Reduce Food Delivery';
    suggestedAmount = 200;
  } else if (insightTitle.includes('Subscription')) {
    goalName = 'Cancel Unused Subscriptions';
    suggestedAmount = 67;
  } else if (insightTitle.includes('Emergency')) {
    goalName = 'Emergency Fund';
    suggestedAmount = 12000;
  } else {
    goalName = 'Savings Goal';
    suggestedAmount = 1000;
  }
  
  const confirmed = confirm(`Create a goal: "${goalName}"\nTarget savings: $${suggestedAmount}\n\nWould you like to create this goal?`);
  
  if (confirmed) {
    alert(`✓ Goal created!\n\n"${goalName}" - $${suggestedAmount}\n\nView it in the Goals tab.`);
    setTimeout(() => navigate('goals'), 1000);
  }
}

// ========== INITIALIZATION ==========

// Ensure app renders on load
function initializeApp() {
  console.log('Mosaic app initializing...');
  
  // Check if app element exists
  const appEl = document.getElementById('app');
  if (!appEl) {
    console.error('App element not found!');
    return;
  }
  // FIXED: Load saved state with remember me
  const savedUser = loadFromLocalStorage('currentUser', null);
  const rememberMe = loadFromLocalStorage('rememberMe', false);
  const savedEmail = loadFromLocalStorage('savedEmail', '');
  
  if (savedUser && rememberMe) {
    appState.currentUser = savedUser;
    appState.savedEmail = savedEmail;
    appState.rememberMe = true;
    if (savedUser.bankConnected && savedUser.selectedBank) {
      if (appState.bankAccounts[savedUser.selectedBank]) {
        appState.financialData = { ...appState.bankAccounts[savedUser.selectedBank] };
        appState.financialData.savings_rate = ((appState.financialData.monthly_income - appState.financialData.monthly_spending) / appState.financialData.monthly_income * 100).toFixed(1);
      }
    }
  }
  
  // Check for OAuth callback
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('oauth') === 'google') {
    handleGoogleSignin();
    return;
  }
  
  // FIXED: Auto-login if remember me is checked
  if (appState.currentUser && appState.rememberMe && appState.currentUser.bankConnected) {
    console.log('Auto-logging in user:', appState.currentUser.email);
    window.location.hash = 'dashboard';
  } else if (!window.location.hash) {
    // Ensure we start on login page
    window.location.hash = 'login';
  }
  
  updatePage();
  console.log('Mosaic app initialized successfully');
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Handle navigation
window.addEventListener('hashchange', updatePage);

// Modal functions
function openMosaicModal(category) {
  activeModal = category;
  updatePage();
}

function closeMosaicModal() {
  activeModal = null;
  updatePage();
}