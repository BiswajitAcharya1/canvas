// Canvas AI Study Planner - In-Memory State Management

// Application State (stored in memory)
const appState = {
    canvasUrl: null,
    canvasToken: null,
    assignments: [],
    currentAssignment: null
};

// Note: No AI API keys needed - using Pollinations.AI (completely free!)

// API Response Cache (5 minute cache for Canvas API)
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// DOM Elements
const setupScreen = document.getElementById('setupScreen');
const assignmentsScreen = document.getElementById('assignmentsScreen');
const setupForm = document.getElementById('setupForm');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const assignmentsGrid = document.getElementById('assignmentsGrid');
const loadingAssignments = document.getElementById('loadingAssignments');
const emptyState = document.getElementById('emptyState');
const studyPlanModal = document.getElementById('studyPlanModal');
const modalBackdrop = document.getElementById('modalBackdrop');
const closeModal = document.getElementById('closeModal');
const generatingState = document.getElementById('generatingState');
const studyPlanContent = document.getElementById('studyPlanContent');
const modalTitle = document.getElementById('modalTitle');
const setupError = document.getElementById('setupError');
const setupStatus = document.getElementById('setupStatus');
const helpToggle = document.getElementById('helpToggle');
const helpContent = document.getElementById('helpContent');

// Help toggle handler
if (helpToggle) {
    helpToggle.addEventListener('click', () => {
        helpContent.classList.toggle('hidden');
        helpToggle.classList.toggle('active');
    });
}

// Event Listeners
setupForm.addEventListener('submit', handleSetupSubmit);
disconnectBtn.addEventListener('click', handleDisconnect);
closeModal.addEventListener('click', hideModal);
modalBackdrop.addEventListener('click', hideModal);

// Setup Form Handler
async function handleSetupSubmit(e) {
    e.preventDefault();
    
    const canvasUrl = document.getElementById('canvasUrl').value.trim();
    const canvasToken = document.getElementById('canvasToken').value.trim();
    
    // Show loading state
    connectBtn.disabled = true;
    const btnText = connectBtn.querySelector('.btn-text');
    const spinner = connectBtn.querySelector('.spinner');
    setupError.classList.add('hidden');
    setupStatus.classList.add('hidden');
    
    try {
        // Validate inputs
        validateInputs(canvasUrl, canvasToken);
        
        // Step 1: Test credentials
        console.log('=== Starting Canvas Connection ===');
        btnText.textContent = 'Testing credentials...';
        spinner.classList.remove('hidden');
        setupStatus.innerHTML = 'Testing credentials...';
        setupStatus.classList.remove('hidden');
        
        const validatedUrl = await testCanvasCredentials(canvasUrl, canvasToken);
        console.log('✓ Credentials validated successfully');
        
        // Show success status
        setupStatus.innerHTML = 'Connected! Fetching courses...';
        
        // Store credentials in memory with validated URL
        appState.canvasUrl = validatedUrl;
        appState.canvasToken = canvasToken;
        
        // Step 2: Load assignments with progress
        btnText.textContent = 'Loading assignments...';
        await loadAssignmentsWithProgress();
        
        // Show final success
        const assignmentCount = appState.assignments.length;
        console.log('=== Successfully loaded', assignmentCount, 'assignments ===');
        console.log('Assignments stored in appState:', appState.assignments);
        setupStatus.innerHTML = `Successfully loaded ${assignmentCount} assignments!`;
        
        // Switch to assignments screen after brief delay
        setTimeout(() => {
            console.log('Switching to assignments screen...');
            showScreen('assignments');
        }, 1500);
        
    } catch (error) {
        console.error('Setup error:', error);
        const errorMessage = getErrorMessage(error);
        setupError.textContent = errorMessage;
        setupError.classList.remove('hidden');
        setupStatus.classList.add('hidden');
    } finally {
        connectBtn.disabled = false;
        btnText.textContent = 'Connect to Canvas';
        spinner.classList.add('hidden');
    }
}

// Validate inputs before making API calls
function validateInputs(canvasUrl, canvasToken) {
    // Validate Canvas URL
    if (!canvasUrl) {
        throw new Error('Canvas URL is required');
    }
    
    // Check if URL looks like a Canvas instance
    if (!canvasUrl.includes('instructure.com') && !canvasUrl.includes('canvas')) {
        throw new Error('Invalid Canvas URL format. Must include https:// (e.g., https://yourschool.instructure.com)');
    }
    
    // Validate Canvas token
    if (!canvasToken || canvasToken.length < 50) {
        throw new Error('Invalid API token. Generate one from Canvas → Account → Settings → New Access Token');
    }
}

// CORS Proxy Fallback List
const CORS_PROXIES = [
    '', // Try direct first (might work for some Canvas instances)
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.allorigins.win/raw?url='
];

// Fetch with timeout
function fetchWithTimeout(url, options, timeout = 30000) {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeout)
        )
    ]);
}

// Fetch from Canvas with caching and multiple proxy fallbacks
async function fetchFromCanvas(endpoint, canvasUrl, token, proxyIndex = 0, retryCount = 0) {
    // Check cache first
    const cacheKey = `${canvasUrl}${endpoint}`;
    const cached = apiCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`[Cache Hit] ${endpoint}`);
        return cached.data;
    }
    // Clean and format URL
    let cleanUrl = canvasUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    cleanUrl = cleanUrl.replace(/\/$/, '');
    
    const fullUrl = `${cleanUrl}${endpoint}`;
    const proxy = CORS_PROXIES[proxyIndex];
    const requestUrl = proxy ? `${proxy}${encodeURIComponent(fullUrl)}` : fullUrl;
    
    console.log(`[Attempt ${retryCount + 1}] Trying proxy ${proxyIndex}: ${proxy || 'direct'}`);
    console.log(`Fetching: ${endpoint}`);
    
    try {
        const response = await fetchWithTimeout(requestUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache'
        }, 30000);
        
        if (!response.ok) {
            // Canvas API error (401, 403, 404, etc.)
            console.error(`Canvas API returned status ${response.status}`);
            
            if (response.status === 401) {
                throw new Error('INVALID_TOKEN');
            } else if (response.status === 403) {
                throw new Error('ACCESS_DENIED');
            } else if (response.status === 404) {
                throw new Error('NOT_FOUND');
            } else {
                throw new Error(`HTTP_ERROR_${response.status}`);
            }
        }
        
        const data = await response.json();
        console.log(`✓ Success with proxy ${proxyIndex}`);
        
        // Cache the successful response
        apiCache.set(cacheKey, { data, timestamp: Date.now() });
        
        return data;
        
    } catch (error) {
        console.error(`✗ Proxy ${proxyIndex} failed:`, error.message);
        
        // If it's a Canvas API error (not network), don't retry with other proxies
        if (error.message === 'INVALID_TOKEN' || 
            error.message === 'ACCESS_DENIED' || 
            error.message === 'NOT_FOUND' ||
            error.message.startsWith('HTTP_ERROR_')) {
            throw error;
        }
        
        // Network error - try next proxy
        if (proxyIndex < CORS_PROXIES.length - 1) {
            console.log(`Trying next proxy (${proxyIndex + 1})...`);
            return fetchFromCanvas(endpoint, canvasUrl, token, proxyIndex + 1, retryCount);
        }
        
        // All proxies failed - retry with first proxy (max 3 retries)
        if (retryCount < 2) {
            console.log(`All proxies failed. Retrying (attempt ${retryCount + 2}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            return fetchFromCanvas(endpoint, canvasUrl, token, 0, retryCount + 1);
        }
        
        // All attempts exhausted
        console.error('All connection attempts failed');
        throw error;
    }
}

// Handle errors with user-friendly messages
function getErrorMessage(error) {
    if (error.message === 'INVALID_TOKEN') {
        return 'Invalid API token. Generate a new one from Canvas → Settings → New Access Token';
    } else if (error.message === 'ACCESS_DENIED') {
        return 'Access denied. Your API token may not have proper permissions.';
    } else if (error.message === 'NOT_FOUND') {
        return 'Canvas URL not found. Please check your institution\'s Canvas URL.';
    } else if (error.message.startsWith('HTTP_ERROR_')) {
        const statusCode = error.message.replace('HTTP_ERROR_', '');
        return `Canvas API error (${statusCode}). Please try again.`;
    } else if (error.message === 'REQUEST_TIMEOUT') {
        return 'Request timed out. This might be a Canvas server issue. Try again in a few moments.';
    } else if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        return 'Connection failed. This might be a Canvas CORS issue. Try: 1) Check your URL format, 2) Verify your token is valid, 3) Try again in a few moments.';
    } else {
        return `Error: ${error.message}`;
    }
}

// Test Canvas credentials before proceeding
async function testCanvasCredentials(url, token) {
    // Clean and format URL
    let canvasUrl = url.trim();
    if (!canvasUrl.startsWith('http://') && !canvasUrl.startsWith('https://')) {
        canvasUrl = 'https://' + canvasUrl;
    }
    canvasUrl = canvasUrl.replace(/\/$/, '');
    
    try {
        // Test with /api/v1/users/self endpoint
        console.log('Testing Canvas credentials...');
        await fetchFromCanvas('/api/v1/users/self', canvasUrl, token);
        
        console.log('Canvas credentials validated successfully');
        return canvasUrl;
    } catch (error) {
        console.error('Credential test failed:', error);
        throw error;
    }
}

// Load Assignments from Canvas API
async function loadAssignments() {
    loadingAssignments.classList.remove('hidden');
    assignmentsGrid.innerHTML = '';
    emptyState.classList.add('hidden');
    
    try {
        console.log('Fetching assignments from Canvas...');
        const assignments = await fetchCanvasAssignments();
        console.log('Fetched assignments:', assignments);
        appState.assignments = assignments;
        
        if (assignments.length === 0) {
            emptyState.classList.remove('hidden');
        } else {
            renderAssignments(assignments);
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        emptyState.classList.remove('hidden');
    } finally {
        loadingAssignments.classList.add('hidden');
    }
}

// Fetch Real Assignments from Canvas API with progress updates (OPTIMIZED - PARALLEL LOADING)
async function fetchCanvasAssignments(progressCallback) {
    const { canvasUrl, canvasToken } = appState;
    
    try {
        // Step 1: Fetch all courses
        console.log('=== Fetching Courses ===');
        if (progressCallback) progressCallback('Fetching courses...');
        
        const courses = await fetchFromCanvas(
            '/api/v1/courses?enrollment_state=active&per_page=100', 
            canvasUrl, 
            canvasToken
        );
        console.log(`✓ Fetched ${courses.length} courses`);
        
        if (progressCallback) progressCallback(`Loading assignments from ${courses.length} courses in parallel...`);
        
        // Step 2: Fetch assignments from ALL courses in PARALLEL (much faster!)
        console.log('=== Fetching Assignments in Parallel ===');
        const assignmentPromises = courses.map((course, i) => {
            if (!course.id || !course.name) return Promise.resolve([]);
            
            console.log(`[${i+1}/${courses.length}] Starting fetch for: ${course.name}`);
            
            return fetchFromCanvas(
                `/api/v1/courses/${course.id}/assignments?include[]=submission&per_page=100&order_by=due_at`,
                canvasUrl,
                canvasToken
            )
            .then(assignments => {
                console.log(`  ✓ Found ${assignments.length} assignments in ${course.name}`);
                
                // Filter and format assignments
                return assignments
                    .filter(assignment => {
                        // Only include assignments with due dates that haven't passed
                        if (!assignment.due_at) return false;
                        const dueDate = new Date(assignment.due_at);
                        return dueDate > new Date();
                    })
                    .map(assignment => {
                        const description = assignment.description || assignment.body || '';
                        return {
                            id: assignment.id,
                            name: assignment.name,
                            course: course.name,
                            course_id: course.id,
                            due_date: assignment.due_at,
                            points: assignment.points_possible || 0,
                            description: description
                        };
                    });
            })
            .catch(error => {
                console.warn(`⚠ Failed to fetch assignments for ${course.name}:`, error.message);
                return []; // Return empty array on error
            });
        });
        
        // Wait for all parallel requests to complete
        const allAssignmentsArrays = await Promise.all(assignmentPromises);
        const allAssignments = allAssignmentsArrays.flat();
        console.log(`✓ Parallel fetch complete: ${allAssignments.length} total assignments`);
        
        // Sort by due date
        allAssignments.sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
        
        console.log(`=== Success: ${allAssignments.length} assignments from ${courses.length} courses ===`);
        return allAssignments;
        
    } catch (error) {
        console.error('=== Error in fetchCanvasAssignments ===', error);
        throw error;
    }
}

// Load assignments with progress feedback
async function loadAssignmentsWithProgress() {
    try {
        const assignments = await fetchCanvasAssignments((progress) => {
            setupStatus.innerHTML = `✅ ${progress}`;
        });
        
        appState.assignments = assignments;
        return assignments;
    } catch (error) {
        console.error('Error loading assignments:', error);
        throw error;
    }
}

// Render Assignments (OPTIMIZED - Document Fragment for faster DOM manipulation)
function renderAssignments(assignments) {
    console.log('=== renderAssignments called with', assignments ? assignments.length : 0, 'assignments ===');
    
    // Clear existing content
    assignmentsGrid.innerHTML = '';
    
    // Hide loading state
    if (loadingAssignments) {
        loadingAssignments.style.display = 'none';
        loadingAssignments.classList.add('hidden');
    }
    
    // Check if we have assignments
    if (!assignments || assignments.length === 0) {
        console.log('No assignments to display');
        if (emptyState) {
            emptyState.style.display = 'flex';
            emptyState.classList.remove('hidden');
        }
        if (assignmentsGrid) {
            assignmentsGrid.style.display = 'none';
        }
        return;
    }
    
    // Hide empty state
    if (emptyState) {
        emptyState.style.display = 'none';
        emptyState.classList.add('hidden');
    }
    
    // Show assignments grid
    assignmentsGrid.style.display = 'grid';
    assignmentsGrid.classList.remove('hidden');
    
    // Create assignment cards using document fragment (FASTER DOM manipulation)
    const fragment = document.createDocumentFragment();
    assignments.forEach((assignment, index) => {
        console.log(`Creating card ${index + 1}: ${assignment.name}`);
        const card = createAssignmentCard(assignment, index);
        fragment.appendChild(card);
    });
    
    // Append all cards at once (much faster than individual appends)
    assignmentsGrid.appendChild(fragment);
    
    console.log('=== Finished rendering', assignments.length, 'assignment cards ===');
}

// Format due date with correct timezone handling
function formatDueDate(dueDateString) {
    if (!dueDateString) {
        return { 
            text: 'No due date', 
            class: 'due-none', 
            daysRemaining: null 
        };
    }
    
    // Parse the due date from Canvas (ISO 8601 format)
    const dueDate = new Date(dueDateString);
    
    // Get current date/time
    const now = new Date();
    
    // Calculate difference in milliseconds
    const timeDiff = dueDate.getTime() - now.getTime();
    
    // Convert to days (can be negative if overdue)
    const daysRemaining = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    // For display purposes, also calculate "due today" correctly
    // Set both to midnight for accurate day comparison
    const nowMidnight = new Date(now);
    nowMidnight.setHours(0, 0, 0, 0);
    const dueDateMidnight = new Date(dueDate);
    dueDateMidnight.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.floor((dueDateMidnight - nowMidnight) / (1000 * 60 * 60 * 24));
    
    // Format display date
    const displayDate = dueDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
    
    // Determine urgency class and text
    let urgencyClass = 'due-later';
    let urgencyText = '';
    
    if (daysDiff < 0) {
        urgencyClass = 'due-overdue';
        urgencyText = ` (OVERDUE by ${Math.abs(daysDiff)} days)`;
    } else if (daysDiff === 0) {
        urgencyClass = 'due-urgent';
        urgencyText = ' (DUE TODAY)';
    } else if (daysDiff === 1) {
        urgencyClass = 'due-urgent';
        urgencyText = ' (DUE TOMORROW)';
    } else if (daysDiff < 3) {
        urgencyClass = 'due-urgent';
        urgencyText = ` (${daysDiff} days left)`;
    } else if (daysDiff < 7) {
        urgencyClass = 'due-soon';
        urgencyText = ` (${daysDiff} days left)`;
    } else {
        urgencyClass = 'due-later';
        urgencyText = ` (${daysDiff} days left)`;
    }
    
    return {
        text: displayDate + urgencyText,
        class: urgencyClass,
        daysRemaining: daysDiff  // Return the accurate day count
    };
}

// Create Assignment Card with Description Preview and Improved Due Date
function createAssignmentCard(assignment, index) {
    console.log(`  Creating card for: ${assignment.name} (Course: ${assignment.course})`);
    
    const card = document.createElement('div');
    card.className = 'assignment-card glass-card';
    card.style.animationDelay = `${index * 0.05}s`;
    card.style.opacity = '0';
    card.style.animation = `slideUp 0.2s ease-out ${index * 0.05}s forwards`;
    
    // Format due date with countdown
    let dueDate = 'No due date';
    let dueCountdown = '';
    let dueDateClass = 'due-none';
    
    if (assignment.due_date) {
        const date = new Date(assignment.due_date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const dueDateMidnight = new Date(date);
        dueDateMidnight.setHours(0, 0, 0, 0);
        
        const daysRemaining = Math.ceil((dueDateMidnight - now) / (1000 * 60 * 60 * 24));
        
        // Format the actual date
        dueDate = date.toLocaleDateString('en-US', { 
            weekday: 'short',
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        // Create countdown text
        if (daysRemaining < 0) {
            dueDateClass = 'due-overdue';
            dueCountdown = `OVERDUE by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`;
        } else if (daysRemaining === 0) {
            dueDateClass = 'due-urgent';
            dueCountdown = 'DUE TODAY';
        } else if (daysRemaining === 1) {
            dueDateClass = 'due-urgent';
            dueCountdown = 'DUE TOMORROW';
        } else if (daysRemaining < 3) {
            dueDateClass = 'due-urgent';
            dueCountdown = `Due in ${daysRemaining} days`;
        } else if (daysRemaining < 7) {
            dueDateClass = 'due-soon';
            dueCountdown = `Due in ${daysRemaining} days`;
        } else {
            dueDateClass = 'due-later';
            dueCountdown = `Due in ${daysRemaining} days`;
        }
    }
    
    // Get description preview
    const descriptionText = cleanHtmlDescription(assignment.description || '');
    const descriptionPreview = descriptionText.length > 100 
        ? descriptionText.substring(0, 100) + '...' 
        : descriptionText;
    
    // Get points
    const points = assignment.points ? `${assignment.points} pts` : 'No points';
    
    // Get course name
    const courseName = assignment.course || 'Unknown Course';
    
    // Create card HTML
    card.innerHTML = `
        <div class="assignment-card-header">
            <h3 class="assignment-title">${escapeHtml(assignment.name)}</h3>
            <span class="assignment-course">${escapeHtml(courseName)}</span>
        </div>
        <div class="assignment-card-body">
            ${descriptionPreview && descriptionPreview !== 'No description provided' ? `<p class="assignment-description-preview">${escapeHtml(descriptionPreview)}</p>` : ''}
            <div class="assignment-meta">
                <div class="meta-item due-date-section">
                    <div class="due-date-info">
                        <span class="due-countdown ${dueDateClass}">${dueCountdown || 'No due date'}</span>
                        ${assignment.due_date ? `<span class="due-date-full">${dueDate}</span>` : ''}
                    </div>
                </div>
                <div class="meta-item">
                    <span class="meta-text">${points}</span>
                </div>
            </div>
        </div>
        <div class="assignment-card-footer">
            <button class="btn-generate" onclick="event.stopPropagation(); openStudyPlanModal(appState.assignments[${index}])">
                Create Study Plan
            </button>
        </div>
    `;
    
    return card;
}

// Display Assignment Details in Modal
function displayAssignmentDetails(assignment) {
    // Format due date
    let dueDateHtml = '<span style="color: var(--text-tertiary);">No due date</span>';
    if (assignment.due_date) {
        const date = new Date(assignment.due_date);
        const formatted = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        
        const now = new Date();
        const daysUntilDue = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        
        let dueDateClass = 'normal';
        if (daysUntilDue < 0) dueDateClass = 'urgent';
        else if (daysUntilDue < 3) dueDateClass = 'urgent';
        else if (daysUntilDue < 7) dueDateClass = 'soon';
        
        dueDateHtml = `<span class="due-badge ${dueDateClass}" style="margin: 0;">${formatted}</span>`;
    }
    
    // Clean and format description for display
    const descriptionHtml = assignment.description || '<p style="color: var(--text-tertiary); font-style: italic;">No description provided</p>';
    
    const detailsHtml = `
        <div class="assignment-details-card" style="margin-bottom: var(--space-xl); padding: var(--space-lg); background: rgba(255, 255, 255, 0.05); border-radius: var(--radius-md); border: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="display: grid; gap: var(--space-md); margin-bottom: var(--space-lg);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 15px; font-weight: 600;">Course:</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${escapeHtml(assignment.course || 'Unknown')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 15px; font-weight: 600;">Due:</span>
                    ${dueDateHtml}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: var(--text-secondary); font-size: 15px; font-weight: 600;">Points:</span>
                    <span style="color: var(--text-primary); font-weight: 600;">${assignment.points || 'Not specified'}</span>
                </div>
            </div>
            <div style="margin-top: var(--space-lg); padding-top: var(--space-lg); border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <h4 style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin-bottom: var(--space-sm);">Assignment Description</h4>
                <div style="color: var(--text-secondary); font-size: 14px; line-height: 1.6; max-height: 200px; overflow-y: auto;">
                    ${descriptionHtml}
                </div>
            </div>
        </div>
    `;
    
    return detailsHtml;
}

// Open Study Plan Modal
async function openStudyPlanModal(assignment) {
    appState.currentAssignment = assignment;
    modalTitle.textContent = assignment.name;
    studyPlanModal.classList.remove('hidden');
    generatingState.classList.remove('hidden');
    studyPlanContent.classList.add('hidden');
    
    // Show assignment details
    const assignmentDetails = displayAssignmentDetails(assignment);
    
    // Check if it's a test or regular assignment
    const isTest = isTestOrQuiz(assignment.name, assignment.description || '');
    
    console.log('Opening modal for:', assignment.name);
    console.log('Is Test?', isTest);
    
    // Update generating state message
    generatingState.innerHTML = `
        ${assignmentDetails}
        <div style="display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-xl);">
            <div class="spinner" style="width: 40px; height: 40px; border-width: 3px;"></div>
            <p class="body" style="text-align: center; font-weight: 600;">Creating Your Personalized ${isTest ? 'Study' : 'Completion'} Plan...</p>
            <p class="footnote" style="text-align: center; color: var(--text-tertiary); font-weight: 500;">${isTest ? 'Analyzing requirements and finding related materials' : 'Breaking down steps to complete this assignment'}</p>
        </div>
    `;
    
    // Generate study plan
    try {
        const studyPlan = await generateStudyPlan(assignment);
        
        // Prepend assignment details to study plan
        studyPlanContent.innerHTML = assignmentDetails;
        displayStudyPlan(studyPlan);
    } catch (error) {
        console.error('Error generating study plan:', error);
        
        const errorMessage = error.message || 'Unknown error occurred';
        
        studyPlanContent.innerHTML = `
            ${assignmentDetails}
            <div style="text-align: center; padding: var(--space-xxl); background: rgba(255, 59, 48, 0.1); border-radius: var(--radius-md); border: 1px solid rgba(255, 59, 48, 0.2);">
                <p style="color: #FF6B6B; font-size: 17px; font-weight: 700; margin-bottom: var(--space-sm);">Failed to generate study plan</p>
                <p style="color: var(--text-secondary); font-size: 15px; margin-bottom: var(--space-lg);">${escapeHtml(errorMessage)}</p>
                
                <div style="background: rgba(52, 199, 89, 0.1); padding: var(--space-lg); border-radius: var(--radius-sm); margin-bottom: var(--space-lg); text-align: left; border: 1px solid rgba(52, 199, 89, 0.2);">
                    <h4 style="font-size: 15px; font-weight: 700; color: var(--ios-green); margin-bottom: var(--space-md);">This service is completely free!</h4>
                    <ul style="list-style: none; padding: 0; margin: 0;">
                        <li style="margin-bottom: var(--space-xs); color: var(--text-secondary); font-weight: 500;">No API key required</li>
                        <li style="margin-bottom: var(--space-xs); color: var(--text-secondary); font-weight: 500;">No signup needed</li>
                        <li style="margin-bottom: var(--space-xs); color: var(--text-secondary); font-weight: 500;">Unlimited study plans</li>
                        <li style="color: var(--text-secondary); font-weight: 500;">Powered by Pollinations.AI &amp; DeepInfra</li>
                    </ul>
                    <p style="color: var(--text-tertiary); font-size: 13px; margin-top: var(--space-md); margin-bottom: 0;">Just try again - it works instantly!</p>
                </div>
                
                <button onclick="openStudyPlanModal(appState.currentAssignment)" style="padding: 10px 20px; background: var(--ios-blue); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
        generatingState.classList.add('hidden');
        studyPlanContent.classList.remove('hidden');
    }
}

// Clean HTML from assignment descriptions
function cleanHtmlDescription(html) {
    if (!html || html.trim() === '') {
        console.log('No description provided');
        return 'No description provided';
    }
    
    console.log(`Cleaning description, length: ${html.length}`);
    
    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove script and style tags
    const scripts = tempDiv.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());
    
    // Get text content
    let text = tempDiv.textContent || tempDiv.innerText || '';
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    console.log(`Cleaned description length: ${text.length}`);
    console.log(`Cleaned description preview: ${text.substring(0, 200)}...`);
    
    return text.length > 0 ? text : 'No description provided';
}

// Escape HTML for safe display
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Generate specific advice based on actual assignment content
function generateSpecificAdvice(assignment, type, description) {
    const text = description.toLowerCase();
    const advice = [];
    
    // Analyze the actual content
    if (text.includes('duolingo')) {
        advice.push('Complete your Duolingo lessons systematically');
        advice.push('Focus on accuracy over speed for better retention');
    }
    
    if (text.includes('worksheet')) {
        advice.push('Work through each section carefully');
        advice.push('Check your answers as you go');
    }
    
    if (text.includes('vocabulary') || text.includes('vocab')) {
        advice.push('Create flashcards for new terms');
        advice.push('Practice pronunciation as you learn');
    }
    
    if (text.includes('conjugation') || text.includes('verb')) {
        advice.push('Write out verb tables by hand');
        advice.push('Practice with different subjects (je, tu, il/elle, etc.)');
    }
    
    if (text.includes('reading') && text.includes('questions')) {
        advice.push('Skim the questions first, then read');
        advice.push('Highlight key passages that answer questions');
    }
    
    if (text.includes('essay') || text.includes('write')) {
        advice.push('Start with an outline before writing');
        advice.push('Save time at the end for editing and proofreading');
    }
    
    if (text.includes('problem') || text.includes('solve') || text.includes('calculate')) {
        advice.push('Show all your work step-by-step');
        advice.push('Double-check calculations before moving on');
    }
    
    // If no specific advice, give type-based advice
    if (advice.length === 0) {
        if (type.includes('Reading')) {
            advice.push('Take notes while reading for better retention');
            advice.push('Break long readings into manageable sections');
        } else if (type.includes('Essay') || type.includes('Writing')) {
            advice.push('Draft your main ideas first, polish later');
            advice.push('Read your work aloud to catch errors');
        } else {
            advice.push('Start early to avoid last-minute stress');
            advice.push('Take short breaks to maintain focus');
        }
    }
    
    return advice;
}

// Smart Client-Side Study Plan Generator (ALWAYS WORKS - NO API NEEDED!)
function generateSmartStudyPlan(assignment) {
    const name = assignment.name || 'Assignment';
    const description = cleanHtmlDescription(assignment.description) || '';
    const dueDateInfo = formatDueDate(assignment.due_date);
    const points = assignment.points || 100;
    const course = assignment.course || 'Course';
    
    // Analyze assignment type and complexity
    const assignmentType = detectAssignmentType(name, description);
    const complexity = assessComplexity(description, points);
    const daysAvailable = dueDateInfo.daysRemaining || 7;
    
    // Generate comprehensive study plan
    let studyPlan = `# 📋 Assignment Analysis\n\n`;
    studyPlan += `**Assignment:** ${name}\n`;
    studyPlan += `**Course:** ${course}\n`;
    studyPlan += `**Type:** ${assignmentType}\n`;
    studyPlan += `**Due:** ${dueDateInfo.text}\n`;
    studyPlan += `**Points:** ${points}\n\n`;
    
    // Extract key requirements from description
    const requirements = extractRequirements(description);
    if (requirements.length > 0) {
        studyPlan += `**Key Requirements:**\n`;
        requirements.forEach(req => {
            studyPlan += `- ${req}\n`;
        });
        studyPlan += `\n`;
    }
    
    studyPlan += `**Complexity Level:** ${complexity.level}\n`;
    studyPlan += `${complexity.reasoning}\n\n`;
    
    // Time estimation
    studyPlan += `## Time Estimation\n\n`;
    const timeEstimate = calculateTimeEstimate(assignmentType, complexity.level, points, description);
    studyPlan += `**Total Estimated Time:** ${timeEstimate.timeString}\n\n`;
    studyPlan += `**Time Breakdown:**\n`;
    timeEstimate.breakdown.forEach(phase => {
        const phaseMinutes = Math.round(phase.hours * 60);
        const phaseTime = phaseMinutes < 60 ? `${phaseMinutes} min` : `${Math.round(phase.hours * 10) / 10} hours`;
        studyPlan += `- ${phase.name}: ${phaseTime}\n`;
    });
    studyPlan += `\n`;
    
    // Add specific advice based on assignment content
    const specificAdvice = generateSpecificAdvice(assignment, assignmentType, description);
    if (specificAdvice.length > 0) {
        studyPlan += `## 💡 Specific Tips for This Assignment\n\n`;
        specificAdvice.forEach(tip => {
            studyPlan += `- ${tip}\n`;
        });
        studyPlan += `\n`;
    }
    
    // Task breakdown
    studyPlan += `## Task Breakdown\n\n`;
    const tasks = generateTasks(assignmentType, description, complexity.level);
    studyPlan += `**Priority Tasks (in order):**\n\n`;
    tasks.forEach((task, i) => {
        studyPlan += `${i + 1}. **${task.title}**\n`;
        studyPlan += `   - ${task.description}\n`;
        studyPlan += `   - Estimated time: ${task.time}\n\n`;
    });
    
    // Day-by-day schedule
    studyPlan += `## Recommended Schedule\n\n`;
    const schedule = createSchedule(daysAvailable, timeEstimate.total, tasks);
    schedule.forEach(day => {
        studyPlan += `**${day.day}:**\n`;
        day.tasks.forEach(task => {
            studyPlan += `- ${task}\n`;
        });
        studyPlan += `\n`;
    });
    
    // Resources and tips
    studyPlan += `## Resources & Study Tips\n\n`;
    const tips = getStudyTips(assignmentType, complexity.level);
    studyPlan += `**Study Strategies:**\n`;
    tips.strategies.forEach(tip => {
        studyPlan += `- ${tip}\n`;
    });
    studyPlan += `\n**Recommended Resources:**\n`;
    tips.resources.forEach(resource => {
        studyPlan += `- ${resource}\n`;
    });
    studyPlan += `\n`;
    
    // Priority focus
    studyPlan += `## Priority Focus Areas\n\n`;
    const priorities = identifyPriorities(description, assignmentType);
    studyPlan += `**Focus on these first:**\n`;
    priorities.forEach((priority, i) => {
        studyPlan += `${i + 1}. **${priority.title}**\n`;
        studyPlan += `   ${priority.reason}\n\n`;
    });
    
    studyPlan += `**Common Pitfalls to Avoid:**\n`;
    const pitfalls = getCommonPitfalls(assignmentType);
    pitfalls.forEach(pitfall => {
        studyPlan += `- ${pitfall}\n`;
    });
    
    return studyPlan;
}

// Enhanced test/quiz/CFU/CFA detection
function isTestOrQuiz(name, description) {
    const nameLower = name.toLowerCase().trim();
    const descLower = (description || '').toLowerCase().trim();
    
    // Expanded keywords for all assessment types
    const assessmentKeywords = [
        'test', 'quiz', 'exam', 'midterm', 'final',
        'cfu', 'cfa', 'check for understanding', 'check for assessment',
        'assessment', 'unit test', 'chapter test', 'section quiz'
    ];
    
    // Check if name contains any assessment keyword
    const hasAssessmentInName = assessmentKeywords.some(keyword => {
        // Must be a whole word match
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(nameLower);
    });
    
    if (!hasAssessmentInName) {
        return false;
    }
    
    // Exclude false positives
    const excludeKeywords = [
        'study for test',
        'test prep',
        'test preparation',
        'practice for test',
        'review for test',
        'prepare for test',
        'quiz prep'
    ];
    
    const isFalsePositive = excludeKeywords.some(exclude => 
        nameLower.includes(exclude) || descLower.includes(exclude)
    );
    
    if (isFalsePositive) {
        return false;
    }
    
    return true;
}

// Helper: Detect assignment type from keywords with improved detection
function detectAssignmentType(name, description) {
    const text = (name + ' ' + description).toLowerCase();
    const nameLower = name.toLowerCase();
    
    // Check name first for most accurate type
    if (nameLower.match(/\b(test|quiz|exam|midterm|final|cfu)\b/)) {
        return 'Test/Quiz/Exam';
    }
    
    // Reading assignment detection
    if (text.match(/\b(read|reading|chapter|article|textbook|pages?|sections?)\b/)) {
        return 'Reading Assignment';
    }
    
    // Essay/Writing detection
    if (text.match(/\b(essay|paper|report|writing|composition|argument|thesis|write)\b/)) {
        return 'Written Report/Essay';
    }
    
    // Problem Set detection
    if (text.match(/\b(problem set|homework|practice|calculation|solve|problems?|exercises?|worksheet)\b/)) {
        return 'Problem Set';
    }
    
    // Presentation detection
    if (text.match(/\b(presentation|present|speak|slides|speech)\b/)) {
        return 'Presentation';
    }
    
    // Lab Report detection
    if (text.match(/\b(lab|experiment|laboratory|procedure|hypothesis)\b/)) {
        return 'Lab Report';
    }
    
    // Project detection
    if (text.match(/\b(project|build|create|develop|design|construct)\b/)) {
        return 'Project';
    }
    
    // Discussion detection
    if (text.match(/\b(discussion|forum|post|reply|respond|comment)\b/)) {
        return 'Discussion Post';
    }
    
    // Research detection
    if (text.match(/\b(research|investigate|analyze|study|explore)\b/)) {
        return 'Research Assignment';
    }
    
    return 'General Assignment';
}

// Helper: Assess complexity
function assessComplexity(description, points) {
    let score = 0;
    const text = description.toLowerCase();
    
    // Length-based complexity
    if (description.length > 1000) score += 3;
    else if (description.length > 500) score += 2;
    else if (description.length > 200) score += 1;
    
    // Points-based
    if (points > 100) score += 3;
    else if (points > 50) score += 2;
    else if (points > 20) score += 1;
    
    // Keyword-based
    if (text.match(/research|analyze|evaluate|critique|synthesize/)) score += 2;
    if (text.match(/multiple|several|various|numerous/)) score += 1;
    if (text.match(/minimum|at least|\d+ pages/)) score += 1;
    if (text.match(/cite|citation|reference|source/)) score += 1;
    
    let level, reasoning;
    if (score >= 7) {
        level = 'High';
        reasoning = 'This is a complex assignment requiring substantial time and effort.';
    } else if (score >= 4) {
        level = 'Medium';
        reasoning = 'This assignment has moderate complexity and will require focused work.';
    } else {
        level = 'Low';
        reasoning = 'This is a straightforward assignment that can be completed efficiently.';
    }
    
    return { level, reasoning, score };
}

// CRITICAL FIX: Calculate realistic time estimates
function calculateTimeEstimate(type, complexity, points, description) {
    let baseHours;
    const text = description.toLowerCase();
    
    // SPECIAL: Detect very short assignments
    const isVeryShort = 
        text.includes('quick') || 
        text.includes('short') ||
        text.includes('brief') ||
        text.includes('worksheet') ||
        text.includes('practice') ||
        text.includes('check-in') ||
        text.includes('warm-up') ||
        text.includes('duolingo') ||
        points < 10;
    
    if (isVeryShort) {
        baseHours = 0.25; // 15 minutes for short tasks
    }
    
    // LANGUAGE ASSIGNMENTS (French, Spanish, etc.)
    else if (type === 'Reading Assignment' && text.match(/french|spanish|german|language|vocab|conjugation/)) {
        // Language practice is usually quick
        if (points < 20) {
            baseHours = 0.33; // 20 minutes
        } else if (points < 50) {
            baseHours = 0.75; // 45 minutes
        } else {
            baseHours = 1.5; // 90 minutes for large assignments
        }
    }
    
    // READING ASSIGNMENTS
    else if (type === 'Reading Assignment') {
        const pageMatch = text.match(/(\d+)\s*pages?/);
        const chapterMatch = text.match(/(\d+)\s*chapters?/);
        
        if (pageMatch) {
            const pages = parseInt(pageMatch[1]);
            baseHours = (pages / 25) * 1.3; // 25 pages per hour + note time
        } else if (chapterMatch) {
            const chapters = parseInt(chapterMatch[1]);
            baseHours = chapters * 1.5;
        } else {
            baseHours = 1; // Default 1 hour
        }
    }
    
    // TEST/QUIZ PREPARATION
    else if (type === 'Test/Quiz/Exam') {
        baseHours = points / 10; // More study time per point
        if (complexity === 'High') baseHours *= 1.8;
    }
    
    // ESSAYS/PAPERS
    else if (type === 'Written Report/Essay') {
        if (points < 50) {
            baseHours = 2; // Short essay
        } else if (points < 100) {
            baseHours = 4; // Medium essay
        } else {
            baseHours = 6; // Long essay
        }
    }
    
    // PROBLEM SETS
    else if (type === 'Problem Set') {
        const problemCount = text.match(/(\d+)\s*problems?|(\d+)\s*questions?/);
        if (problemCount) {
            const count = parseInt(problemCount[1] || problemCount[2]);
            baseHours = (count * 5) / 60; // 5 minutes per problem
        } else {
            baseHours = points / 15; // ~4 minutes per point
        }
    }
    
    // DISCUSSION POSTS
    else if (type === 'Discussion Post') {
        baseHours = 0.5; // 30 minutes default
    }
    
    // GENERAL ASSIGNMENTS
    else {
        baseHours = points / 20; // Conservative estimate
    }
    
    // Complexity adjustment (smaller than before)
    if (complexity === 'High') baseHours *= 1.3;
    else if (complexity === 'Low') baseHours *= 0.8;
    
    // Minimum 10 minutes, round to nearest 15 minutes
    const totalMinutes = Math.max(10, Math.round(baseHours * 60));
    const roundedMinutes = Math.ceil(totalMinutes / 15) * 15;
    const finalHours = roundedMinutes / 60;
    
    // Create readable time string
    let timeString;
    if (roundedMinutes < 60) {
        timeString = `${roundedMinutes} minutes`;
    } else if (roundedMinutes === 60) {
        timeString = '1 hour';
    } else {
        const hours = Math.floor(roundedMinutes / 60);
        const mins = roundedMinutes % 60;
        if (mins === 0) {
            timeString = `${hours} hours`;
        } else {
            timeString = `${hours}h ${mins}m`;
        }
    }
    
    return {
        total: finalHours,
        totalMinutes: roundedMinutes,
        timeString: timeString,
        breakdown: generateTimeBreakdown(finalHours, type)
    };
}

function generateTimeBreakdown(totalHours, type) {
    if (totalHours < 0.5) {
        return [{ name: 'Complete assignment', hours: totalHours }];
    }
    
    if (type === 'Test/Quiz/Exam') {
        return [
            { name: 'Review material', hours: Math.ceil(totalHours * 0.4 * 4) / 4 },
            { name: 'Practice problems', hours: Math.ceil(totalHours * 0.35 * 4) / 4 },
            { name: 'Final review', hours: Math.ceil(totalHours * 0.25 * 4) / 4 }
        ];
    }
    
    return [
        { name: 'Understanding requirements', hours: Math.ceil(totalHours * 0.15 * 4) / 4 },
        { name: 'Main work', hours: Math.ceil(totalHours * 0.65 * 4) / 4 },
        { name: 'Review and finalize', hours: Math.ceil(totalHours * 0.20 * 4) / 4 }
    ];
}

// Helper: Generate specialized tasks based on assignment type
function generateTasks(type, description, complexity) {
    const text = description.toLowerCase();
    
    // SPECIALIZED TASKS FOR TESTS/QUIZZES
    if (type === 'Test/Quiz/Exam') {
        return [
            { title: 'Review all relevant material', description: 'Go through notes, textbook chapters, and previous assignments', time: '2-3 hours' },
            { title: 'Create study guide', description: 'Summarize key concepts, formulas, and definitions', time: '1-2 hours' },
            { title: 'Practice with sample problems', description: 'Do practice questions or past exam problems', time: '2-3 hours' },
            { title: 'Identify weak areas', description: 'Note topics you struggle with and focus extra time there', time: '1 hour' },
            { title: 'Active recall practice', description: 'Test yourself without notes using flashcards or practice tests', time: '2-3 hours' },
            { title: 'Group study session', description: 'Quiz each other and discuss difficult concepts', time: '1-2 hours' },
            { title: 'Final review', description: 'Quick review of study guide the day before', time: '1 hour' }
        ];
    }
    
    // SPECIALIZED TASKS FOR READING ASSIGNMENTS
    if (type === 'Reading Assignment') {
        // Estimate reading time based on pages/chapters mentioned
        let estimatedReadTime = '1-2 hours';
        const pageMatch = text.match(/(\d+)\s*pages?/);
        const chapterMatch = text.match(/(\d+)\s*chapters?/);
        
        if (pageMatch) {
            const pages = parseInt(pageMatch[1]);
            const readTimeHours = Math.ceil(pages / 20); // ~20 pages per hour
            estimatedReadTime = `${readTimeHours}-${readTimeHours + 1} hours`;
        } else if (chapterMatch) {
            const chapters = parseInt(chapterMatch[1]);
            const readTimeHours = chapters * 1.5;
            estimatedReadTime = `${Math.floor(readTimeHours)}-${Math.ceil(readTimeHours)} hours`;
        }
        
        return [
            { title: 'Preview the reading', description: 'Skim headings, introduction, and conclusion', time: '10-15 min' },
            { title: 'Active reading', description: 'Read carefully while taking notes on main ideas', time: estimatedReadTime },
            { title: 'Highlight/annotate key points', description: 'Mark important concepts, terms, and arguments', time: '30 min' },
            { title: 'Summarize each section', description: 'Write brief summaries in your own words', time: '30-45 min' },
            { title: 'Create study notes', description: 'Organize notes into key concepts and themes', time: '30 min' },
            { title: 'Review and self-quiz', description: 'Test your understanding of the material', time: '20 min' }
        ];
    }
    
    // SPECIALIZED TASKS FOR ESSAYS
    if (type === 'Written Report/Essay') {
        return [
            { title: 'Understand the prompt', description: 'Carefully analyze what the assignment is asking for', time: '20 min' },
            { title: 'Brainstorm and research', description: 'Gather ideas and find credible sources', time: '2-3 hours' },
            { title: 'Create thesis statement', description: 'Develop your main argument or position', time: '30 min' },
            { title: 'Outline your essay', description: 'Organize main points and supporting evidence', time: '45 min' },
            { title: 'Write first draft', description: 'Get all ideas down without worrying about perfection', time: '3-4 hours' },
            { title: 'Revise for content', description: 'Improve arguments, evidence, and logical flow', time: '1-2 hours' },
            { title: 'Edit for grammar and style', description: 'Fix errors and improve clarity', time: '1 hour' },
            { title: 'Format and cite sources', description: 'Apply required format and check all citations', time: '30 min' }
        ];
    }
    
    // SPECIALIZED TASKS FOR PROBLEM SETS
    if (type === 'Problem Set') {
        return [
            { title: 'Review relevant concepts', description: 'Go over lecture notes and textbook sections', time: '1 hour' },
            { title: 'Work through example problems', description: 'Practice with solved examples first', time: '1 hour' },
            { title: 'Attempt all problems independently', description: 'Try each problem without looking at solutions', time: '3-4 hours' },
            { title: 'Check your work', description: 'Verify answers and identify mistakes', time: '1 hour' },
            { title: 'Get help on difficult problems', description: 'Ask TA, professor, or study group for help', time: '1-2 hours' },
            { title: 'Redo problems you got wrong', description: 'Practice until you understand the process', time: '1-2 hours' }
        ];
    }
    
    // DEFAULT TASKS FOR GENERAL ASSIGNMENTS
    return [
        { title: 'Understand requirements', description: 'Read instructions carefully and note key requirements', time: '20 min' },
        { title: 'Plan your approach', description: 'Break down into manageable steps', time: '30 min' },
        { title: 'Gather materials/research', description: 'Collect everything you need to complete the work', time: '1-2 hours' },
        { title: 'Complete main work', description: 'Work through each component systematically', time: '3-4 hours' },
        { title: 'Review and refine', description: 'Check for completeness and quality', time: '1 hour' },
        { title: 'Proofread and finalize', description: 'Final check before submission', time: '30 min' }
    ];
}

// Helper: Create schedule
function createSchedule(daysAvailable, totalHours, tasks) {
    const schedule = [];
    const today = new Date();
    
    if (daysAvailable <= 0) {
        return [{ day: 'OVERDUE - Start immediately!', tasks: ['Complete all tasks as soon as possible'] }];
    }
    
    const hoursPerDay = Math.ceil(totalHours / Math.max(daysAvailable - 1, 1));
    
    for (let i = 0; i < Math.min(daysAvailable, 7); i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        
        const dayTasks = [];
        
        if (i === 0) {
            dayTasks.push('Review assignment requirements thoroughly');
            dayTasks.push('Gather all necessary materials and resources');
        } else if (i < daysAvailable - 1) {
            dayTasks.push(`Work on assignment for ${hoursPerDay} hours`);
            dayTasks.push(`Focus on: ${tasks[Math.min(i - 1, tasks.length - 1)]?.title || 'next task'}`);
        } else {
            dayTasks.push('Final review and quality check');
            dayTasks.push('Submit assignment before deadline');
        }
        
        schedule.push({ day: dayName, tasks: dayTasks });
    }
    
    return schedule;
}

// Helper: Get study tips with type-specific advice
function getStudyTips(type, complexity) {
    const tips = {
        strategies: [],
        resources: []
    };
    
    // SPECIALIZED TIPS FOR TESTS/QUIZZES
    if (type === 'Test/Quiz/Exam') {
        tips.strategies = [
            'Use active recall - test yourself without notes',
            'Create flashcards for key terms and concepts',
            'Practice with past exams or sample questions',
            'Study in short, focused sessions (Pomodoro technique)',
            'Teach the material to someone else to test understanding',
            'Get plenty of sleep the night before the test',
            'Review your notes within 24 hours of class for better retention'
        ];
        tips.resources = [
            'Course notes and lecture slides',
            'Textbook practice problems',
            'Professor\'s office hours for clarification',
            'Study group with classmates',
            'Online resources like Khan Academy or Quizlet',
            'Previous quizzes or homework assignments'
        ];
        return tips;
    }
    
    // SPECIALIZED TIPS FOR READING ASSIGNMENTS
    if (type === 'Reading Assignment') {
        tips.strategies = [
            'Use SQ3R method: Survey, Question, Read, Recite, Review',
            'Take notes while reading, don\'t just highlight',
            'Read in a quiet environment without distractions',
            'Break reading into chunks with short breaks between',
            'Summarize each section in your own words',
            'Connect new information to what you already know',
            'Ask questions while reading and seek answers'
        ];
        tips.resources = [
            'The actual reading material',
            'Study guides if provided by instructor',
            'Supplementary videos or articles on the topic',
            'Discussion with classmates about the reading',
            'Office hours to clarify confusing parts'
        ];
        return tips;
    }
    
    // DEFAULT TIPS
    tips.strategies = [
        'Break work into focused 45-minute sessions with 10-minute breaks',
        'Start with the most challenging parts when your mind is fresh',
        'Use active learning techniques like self-testing and summarizing',
        'Create a distraction-free environment for deep work',
        'Set specific, measurable goals for each study session'
    ];
    
    tips.resources = [
        'Course textbook and lecture notes',
        'Office hours with professor or TA',
        'Study group with classmates',
        'Online academic databases (Google Scholar, JSTOR)',
        'University writing center or tutoring services'
    ];
    
    if (complexity === 'High') {
        tips.strategies.unshift('Consider starting earlier than planned - this is complex work');
    }
    
    return tips;
}

// Helper: Identify priorities
function identifyPriorities(description, type) {
    return [
        { title: 'Understand the core requirements', reason: 'Make sure you know exactly what is expected before starting' },
        { title: 'Allocate sufficient time', reason: "Quality work requires adequate time - don't rush" },
        { title: 'Seek clarification if needed', reason: 'Ask questions early rather than making incorrect assumptions' }
    ];
}

// Helper: Get common pitfalls
function getCommonPitfalls(type) {
    return [
        'Starting too late and rushing the work',
        'Not reading the instructions carefully',
        'Failing to proofread before submission',
        'Not citing sources properly',
        'Skipping the planning phase'
    ];
}

// Helper: Extract requirements
function extractRequirements(description) {
    const requirements = [];
    const sentences = description.split(/[.!?]+/);
    
    sentences.forEach(sentence => {
        const lower = sentence.toLowerCase();
        if (lower.match(/must|required|need to|should|have to|ensure/)) {
            const cleaned = sentence.trim();
            if (cleaned.length > 20 && cleaned.length < 200) {
                requirements.push(cleaned);
            }
        }
    });
    
    return requirements.slice(0, 5); // Return up to 5 requirements
}

// Extract keywords from description for matching
function extractKeywords(text) {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'];
    
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 4 && !commonWords.includes(word));
    
    // Count frequency
    const freq = {};
    words.forEach(word => {
        freq[word] = (freq[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word);
}

// Find related past assignments for test preparation with improved relevance scoring
function findRelatedAssignments(currentAssignment, allAssignments) {
    const related = [];
    const currentName = currentAssignment.name.toLowerCase();
    const currentDesc = (currentAssignment.description || '').toLowerCase();
    const now = new Date();
    
    // Extract unit/chapter/section/week number
    const unitMatch = currentName.match(/unit\s*(\d+)|chapter\s*(\d+)|section\s*(\d+)|week\s*(\d+)/);
    const unitNumber = unitMatch ? (unitMatch[1] || unitMatch[2] || unitMatch[3] || unitMatch[4]) : null;
    
    console.log('Looking for past assignments related to:', currentName);
    console.log('Unit number found:', unitNumber);
    
    // Look through all assignments
    for (const assignment of allAssignments) {
        // Skip the current assignment
        if (assignment.id === currentAssignment.id) continue;
        
        // Skip other tests/quizzes
        if (isTestOrQuiz(assignment.name, assignment.description || '')) {
            console.log('Skipping test:', assignment.name);
            continue;
        }
        
        // CRITICAL: Only include PAST assignments
        if (assignment.due_date) {
            const dueDate = new Date(assignment.due_date);
            if (dueDate > now) {
                console.log('Skipping future assignment:', assignment.name);
                continue;
            }
        }
        
        const assignmentName = assignment.name.toLowerCase();
        const assignmentDesc = (assignment.description || '').toLowerCase();
        
        let relevanceScore = 0;
        let matchReason = [];
        
        // Same unit/chapter/section/week match (high priority)
        if (unitNumber) {
            const assignmentUnit = assignmentName.match(/unit\s*(\d+)|chapter\s*(\d+)|section\s*(\d+)|week\s*(\d+)/);
            const assignmentUnitNumber = assignmentUnit ? (assignmentUnit[1] || assignmentUnit[2] || assignmentUnit[3] || assignmentUnit[4]) : null;
            
            if (assignmentUnitNumber === unitNumber) {
                relevanceScore += 10;
                matchReason.push(`Same unit/chapter ${unitNumber}`);
                console.log('Unit match found:', assignment.name);
            }
        }
        
        // Course match (same course)
        if (assignment.course === currentAssignment.course) {
            relevanceScore += 2;
        }
        
        // Keyword matching from description
        const keywords = extractKeywords(currentDesc);
        let keywordMatches = 0;
        keywords.forEach(keyword => {
            if (assignmentDesc.includes(keyword) || assignmentName.includes(keyword)) {
                keywordMatches++;
            }
        });
        
        if (keywordMatches >= 2) {
            relevanceScore += keywordMatches;
            matchReason.push(`${keywordMatches} keyword matches`);
            console.log('Keyword matches:', assignment.name, keywordMatches);
        }
        
        // If relevant, add to list
        if (relevanceScore >= 3) {
            related.push({
                name: assignment.name,
                type: detectAssignmentType(assignment.name, assignmentDesc),
                description: cleanHtmlDescription(assignment.description || ''),
                dueDate: assignment.due_date,
                relevanceScore: relevanceScore,
                matchReason: matchReason.join(', ')
            });
        }
    }
    
    // Sort by relevance score (highest first)
    related.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
            return b.relevanceScore - a.relevanceScore;
        }
        // If same score, sort by most recent
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(b.dueDate) - new Date(a.dueDate);
    });
    
    console.log('Found', related.length, 'related past assignments');
    
    return related.slice(0, 8); // Return up to 8 most relevant
}

// Generate STUDY plan for tests with enhanced past assignment recommendations
function generateStudyPlanForTest(assignment, relatedAssignments) {
    const name = assignment.name || 'Test';
    const description = cleanHtmlDescription(assignment.description) || '';
    const dueDateInfo = formatDueDate(assignment.due_date);
    const points = assignment.points || 100;
    const course = assignment.course || 'Course';
    
    const complexity = assessComplexity(description, points);
    
    // FIX: Use dueDateInfo.daysRemaining, not a default value
    const daysAvailable = dueDateInfo.daysRemaining !== null ? dueDateInfo.daysRemaining : 7;
    
    // Handle overdue or due today
    let studyTimeText;
    if (daysAvailable < 0) {
        studyTimeText = `OVERDUE - Study immediately!`;
    } else if (daysAvailable === 0) {
        studyTimeText = `Due TODAY - Last minute review!`;
    } else if (daysAvailable === 1) {
        studyTimeText = `1 day (Due tomorrow)`;
    } else {
        studyTimeText = `${daysAvailable} days`;
    }
    
    let studyPlan = `# Test Overview\n\n`;
    studyPlan += `**Test:** ${name}\n`;
    studyPlan += `**Course:** ${course}\n`;
    studyPlan += `**Due:** ${dueDateInfo.text}\n`;
    studyPlan += `**Points:** ${points}\n`;
    studyPlan += `**Study Time Available:** ${studyTimeText}\n\n`;
    
    if (description.length > 20) {
        studyPlan += `**Test Description:**\n${description}\n\n`;
    }
    
    studyPlan += `---\n\n`;
    
    // Add prominent call-to-action if there are related assignments
    if (relatedAssignments.length > 0) {
        studyPlan += `## Review These First\n\n`;
        studyPlan += `Before studying anything else, go back and review these ${relatedAssignments.length} past assignment${relatedAssignments.length === 1 ? '' : 's'}:\n\n`;
        
        relatedAssignments.forEach((rel, i) => {
            studyPlan += `${i + 1}. **${rel.name}**\n`;
        });
        
        studyPlan += `\nThese will give you the foundation you need for this test!\n\n`;
        studyPlan += `---\n\n`;
    }
    
    // Detailed past assignment review section
    if (relatedAssignments.length > 0) {
        studyPlan += `## Review These Past Assignments\n\n`;
        studyPlan += `**These completed assignments will help you prepare:**\n\n`;
        
        relatedAssignments.forEach((rel, i) => {
            studyPlan += `### ${i + 1}. ${rel.name}\n\n`;
            
            // Show completion date
            if (rel.dueDate) {
                const dueDate = new Date(rel.dueDate);
                const formattedDate = dueDate.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                });
                studyPlan += `*Completed: ${formattedDate}*\n\n`;
            }
            
            // Show assignment type
            studyPlan += `*Type: ${rel.type}*\n\n`;
            
            // Show description preview
            if (rel.description && rel.description.length > 50) {
                const preview = rel.description.substring(0, 180);
                studyPlan += `**What it covered:**\n${preview}${rel.description.length > 180 ? '...' : ''}\n\n`;
            }
            
            // Why it's helpful
            studyPlan += `**Why review this:**\n`;
            if (rel.type.includes('Problem')) {
                studyPlan += `- Practice problems similar to what's on the test\n`;
                studyPlan += `- Review the concepts and methods used\n`;
            } else if (rel.type.includes('Reading')) {
                studyPlan += `- Key concepts and terms from readings\n`;
                studyPlan += `- Background knowledge needed for test\n`;
            } else if (rel.type.includes('Essay') || rel.type.includes('Report')) {
                studyPlan += `- Understanding of main themes and arguments\n`;
                studyPlan += `- Critical thinking about the topic\n`;
            } else {
                studyPlan += `- Core concepts from the same unit\n`;
                studyPlan += `- Foundation knowledge for test material\n`;
            }
            
            studyPlan += `\n**Action: Go back and review this assignment before the test!**\n\n`;
            studyPlan += `---\n\n`;
        });
        
        // Summary of all assignments to review
        studyPlan += `### Quick Review Checklist\n\n`;
        studyPlan += `Make sure to review all of these before the test:\n\n`;
        relatedAssignments.forEach((rel, i) => {
            studyPlan += `- [ ] ${rel.name}\n`;
        });
        studyPlan += `\n---\n\n`;
        
    } else {
        studyPlan += `## Past Assignments\n\n`;
        studyPlan += `No past assignments found from this unit. Focus on:\n`;
        studyPlan += `- Class notes and lecture slides\n`;
        studyPlan += `- Textbook sections covered\n`;
        studyPlan += `- Any handouts or study guides provided\n\n`;
        studyPlan += `---\n\n`;
    }
    
    // Time estimation
    studyPlan += `## ⏱️ Study Time Estimation\n\n`;
    const studyHours = Math.max(6, Math.ceil(points / 5));
    studyPlan += `**Recommended Study Time:** ${studyHours} hours total\n\n`;
    studyPlan += `**Time Breakdown:**\n`;
    studyPlan += `- Review notes and materials: ${Math.ceil(studyHours * 0.35)} hours\n`;
    studyPlan += `- Create study guide: ${Math.ceil(studyHours * 0.20)} hours\n`;
    studyPlan += `- Practice problems/questions: ${Math.ceil(studyHours * 0.30)} hours\n`;
    studyPlan += `- Final review: ${Math.ceil(studyHours * 0.15)} hours\n\n`;
    
    // Study strategy
    studyPlan += `## Study Strategy\n\n`;
    
    if (daysAvailable <= 0) {
        studyPlan += `**This test is due TODAY or OVERDUE!**\n\n`;
        studyPlan += `**Emergency Study Plan:**\n`;
        studyPlan += `1. Review your study guide and notes immediately\n`;
        studyPlan += `2. Focus on main concepts and formulas\n`;
        studyPlan += `3. Do a few practice problems if time allows\n`;
        studyPlan += `4. Take the test - do your best!\n\n`;
    } else if (daysAvailable === 1) {
        studyPlan += `**Tomorrow's Test - Focus Study Plan:**\n\n`;
        studyPlan += `**Today (day before test):**\n`;
        studyPlan += `- Create or review study guide (2-3 hours)\n`;
        studyPlan += `- Practice problems and active recall (2-3 hours)\n`;
        if (relatedAssignments.length > 0) {
            studyPlan += `- Quick review of: ${relatedAssignments[0].name}\n`;
        }
        studyPlan += `- Get good sleep tonight!\n\n`;
        studyPlan += `**Tomorrow (test day):**\n`;
        studyPlan += `- 30-minute review of study guide\n`;
        studyPlan += `- Eat well and stay calm\n\n`;
    } else {
        // Multi-day study plan
        studyPlan += `**Study Plan (${daysAvailable} days):**\n\n`;
        
        const dailyStudyHours = Math.max(1, Math.ceil(studyHours / Math.max(daysAvailable - 1, 1)));
        
        for (let i = 0; i < daysAvailable; i++) {
            const today = new Date();
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            
            let dayLabel;
            if (i === 0) dayLabel = 'Today';
            else if (i === 1) dayLabel = 'Tomorrow';
            else dayLabel = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            
            studyPlan += `**${dayLabel}:**\n`;
            
            if (i === 0) {
                studyPlan += `- Gather all materials and review test description\n`;
                studyPlan += `- Start creating study guide\n\n`;
            } else if (i === daysAvailable - 1) {
                studyPlan += `- Final review of study guide (1 hour)\n`;
                studyPlan += `- Light practice, no cramming\n`;
                studyPlan += `- Get good sleep!\n\n`;
            } else {
                studyPlan += `- Study ${dailyStudyHours} hours\n`;
                studyPlan += `- Review notes and practice problems\n`;
                if (relatedAssignments[i % relatedAssignments.length]) {
                    studyPlan += `- Review: ${relatedAssignments[i % relatedAssignments.length].name}\n`;
                }
                studyPlan += `\n`;
            }
        }
    }
    
    // Study tips
    studyPlan += `## Study Tips & Techniques\n\n`;
    studyPlan += `**Effective Study Methods:**\n`;
    studyPlan += `- **Active Recall:** Test yourself without looking at notes\n`;
    studyPlan += `- **Spaced Repetition:** Review material multiple times over several days\n`;
    studyPlan += `- **Teach Someone:** Explain concepts to a friend or family member\n`;
    studyPlan += `- **Practice Tests:** Do as many practice problems as possible\n`;
    studyPlan += `- **Flashcards:** Create flashcards for key terms and concepts\n\n`;
    
    studyPlan += `**What to Focus On:**\n`;
    studyPlan += `- Topics covered in recent lectures\n`;
    studyPlan += `- Concepts from past assignments (especially the ones listed above)\n`;
    studyPlan += `- Any practice problems or examples given in class\n`;
    studyPlan += `- Areas where you struggled before\n\n`;
    
    // Resources
    studyPlan += `## Study Resources\n\n`;
    studyPlan += `- Class notes and lecture slides\n`;
    studyPlan += `- Textbook sections covered\n`;
    if (relatedAssignments.length > 0) {
        studyPlan += `- Past assignments listed above\n`;
    }
    studyPlan += `- Office hours with professor/TA\n`;
    studyPlan += `- Study group with classmates\n`;
    studyPlan += `- Online resources (Khan Academy, Quizlet, YouTube)\n\n`;
    
    // Pitfalls
    studyPlan += `## ⚠️ Common Mistakes to Avoid\n\n`;
    studyPlan += `- Cramming the night before\n`;
    studyPlan += `- Only reading notes without testing yourself\n`;
    studyPlan += `- Skipping difficult topics\n`;
    studyPlan += `- Not getting enough sleep before the test\n`;
    studyPlan += `- Panicking during the test - stay calm!\n`;
    
    return studyPlan;
}

// Generate COMPLETION plan for regular assignments
function generateCompletionPlanForAssignment(assignment) {
    const name = assignment.name || 'Assignment';
    const description = cleanHtmlDescription(assignment.description) || '';
    const dueDateInfo = formatDueDate(assignment.due_date);
    const points = assignment.points || 100;
    const course = assignment.course || 'Course';
    
    const assignmentType = detectAssignmentType(name, description);
    const complexity = assessComplexity(description, points);
    const daysAvailable = dueDateInfo.daysRemaining || 7;
    
    let plan = `# Assignment Overview\n\n`;
    plan += `**Assignment:** ${name}\n`;
    plan += `**Course:** ${course}\n`;
    plan += `**Type:** ${assignmentType}\n`;
    plan += `**Due:** ${dueDateInfo.text}\n`;
    plan += `**Points:** ${points}\n\n`;
    
    // Extract requirements
    const requirements = extractRequirements(description);
    if (requirements.length > 0) {
        plan += `**Key Requirements:**\n`;
        requirements.forEach(req => {
            plan += `- ${req}\n`;
        });
        plan += `\n`;
    }
    
    plan += `**Complexity:** ${complexity.level} - ${complexity.reasoning}\n\n`;
    plan += `---\n\n`;
    
    // Time estimation
    plan += `## Time Needed\n\n`;
    const timeEstimate = calculateTimeEstimate(assignmentType, complexity.level, points, description);
    plan += `**Total Estimated Time:** ${timeEstimate.timeString}\n\n`;
    plan += `**Time Breakdown:**\n`;
    timeEstimate.breakdown.forEach(phase => {
        plan += `- ${phase.name}: ${phase.hours} hours\n`;
    });
    plan += `\n`;
    
    // Task breakdown
    plan += `## Steps to Complete\n\n`;
    const tasks = generateTasks(assignmentType, description, complexity.level);
    tasks.forEach((task, i) => {
        plan += `${i + 1}. **${task.title}**\n`;
        plan += `   - ${task.description}\n`;
        plan += `   - Time: ${task.time}\n\n`;
    });
    
    // Schedule
    plan += `## Completion Schedule\n\n`;
    const schedule = createSchedule(daysAvailable, timeEstimate.total, tasks);
    schedule.forEach(day => {
        plan += `**${day.day}:**\n`;
        day.tasks.forEach(task => {
            plan += `- ${task}\n`;
        });
        plan += `\n`;
    });
    
    // Tips
    plan += `## Tips for Success\n\n`;
    const tips = getStudyTips(assignmentType, complexity.level);
    plan += `**Study Strategies:**\n`;
    tips.strategies.forEach(tip => {
        plan += `- ${tip}\n`;
    });
    plan += `\n`;
    
    // Resources
    plan += `## Helpful Resources\n\n`;
    tips.resources.forEach(resource => {
        plan += `- ${resource}\n`;
    });
    plan += `\n`;
    
    // Pitfalls
    plan += `## Things to Watch Out For\n\n`;
    const pitfalls = getCommonPitfalls(assignmentType);
    pitfalls.forEach(pitfall => {
        plan += `- ${pitfall}\n`;
    });
    
    return plan;
}

// Main generation function - ALWAYS uses client-side (instant & reliable)
async function generateStudyPlan(assignment) {
    console.log('=== ASSIGNMENT ANALYSIS ===');
    console.log('Name:', assignment.name);
    console.log('Course:', assignment.course);
    console.log('Due:', assignment.due_date);
    
    const dueDateInfo = formatDueDate(assignment.due_date);
    console.log('Days remaining:', dueDateInfo.daysRemaining);
    
    const isTest = isTestOrQuiz(assignment.name, assignment.description || '');
    console.log('Is test/quiz/CFU?', isTest);
    
    if (isTest) {
        console.log('Creating STUDY PLAN with past assignment review');
    } else {
        console.log('Creating COMPLETION PLAN');
    }
    console.log('=========================');
    
    try {
        if (isTest) {
            // For tests: create study plan and find related assignments
            const relatedAssignments = findRelatedAssignments(assignment, appState.assignments);
            console.log(`Found ${relatedAssignments.length} PAST assignments to review`);
            if (relatedAssignments.length > 0) {
                console.log('Past assignments:', relatedAssignments.map(r => `${r.name} (Due: ${r.dueDate})`));
            }
            return generateStudyPlanForTest(assignment, relatedAssignments);
        } else {
            // For regular assignments: create completion plan
            return generateCompletionPlanForAssignment(assignment);
        }
        
    } catch (error) {
        console.error('Error generating study plan:', error);
        throw error;
    }
}

// REMOVED: External AI is no longer used - client-side generation is instant and always works!
// (Keeping function stub for potential future enhancement)
async function generateStudyPlanWithFreeAI_DEPRECATED(assignment) {
    const description = cleanHtmlDescription(assignment.description);
    
    // Format due date
    const dueDateInfo = formatDueDate(assignment.due_date);
    let dueDateText = 'No due date specified';
    if (assignment.due_date) {
        const date = new Date(assignment.due_date);
        dueDateText = date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
        dueDateText += ` (${dueDateInfo.text})`;
    }
    
    // Create comprehensive prompt
    const systemPrompt = 'You are an expert academic study planner who creates detailed, personalized study plans based on assignment requirements.';
    
    const userPrompt = `You are an expert study planner and academic advisor helping a college student prepare for their assignment.

**ASSIGNMENT DETAILS:**

Title: ${assignment.name}

Course: ${assignment.course || 'Not specified'}

Due Date: ${dueDateText}

Points Possible: ${assignment.points || 'Not specified'}

Full Assignment Description:
${description}

---

Based on the COMPLETE assignment details above (especially the description), create a comprehensive, actionable, and personalized study plan. The plan should be specifically tailored to what this assignment requires based on its description.

Your study plan MUST include these sections:

1. **📋 Assignment Analysis**
   - Break down exactly what the assignment is asking for based on the description
   - Identify key requirements, deliverables, and expectations
   - Highlight any specific instructions or guidelines mentioned

2. **⏱️ Time Estimation**
   - Estimate total hours needed based on the complexity described
   - Break down time for each phase (research, work, review, etc.)
   - Consider the due date and create a realistic timeline

3. **✅ Task Breakdown**
   - List specific, actionable tasks in order of importance
   - Base tasks on what the description explicitly requires
   - Include any research, reading, or preparation needed

4. **📅 Recommended Schedule**
   - Create a day-by-day plan from today until the due date
   - Assign specific tasks to specific days
   - Build in buffer time for unexpected issues

5. **📚 Resources & Study Tips**
   - Suggest resources relevant to the assignment type and topic
   - Provide study strategies specific to this assignment
   - Recommend tools or methods that would help

6. **🎯 Priority Focus Areas**
   - Highlight the most critical aspects to focus on first
   - Identify what will have the biggest impact on the grade
   - Point out any common pitfalls to avoid

Make the plan realistic, achievable, detailed, and specifically tailored to THIS assignment's unique requirements. Use markdown formatting with headers, bullet points, and bold text for emphasis.`;

    // Try Pollinations first, then DeepInfra as backup
    const providers = [
        {
            name: 'Pollinations.AI',
            endpoint: 'https://text.pollinations.ai/openai',
            apiKey: null, // No key needed
            model: 'openai'
        },
        {
            name: 'DeepInfra',
            endpoint: 'https://api.deepinfra.com/v1/openai/chat/completions',
            apiKey: '', // Empty string works for testing
            model: 'meta-llama/Meta-Llama-3.1-70B-Instruct'
        }
    ];
    
    for (const provider of providers) {
        try {
            console.log(`Trying ${provider.name}...`);
            
            const requestBody = {
                model: provider.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: userPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000,
                stream: false
            };
            
            const headers = {
                'Content-Type': 'application/json'
            };
            
            // Add auth header for DeepInfra (works with empty key)
            if (provider.apiKey !== null) {
                headers['Authorization'] = `Bearer ${provider.apiKey}`;
            }
            
            const response = await fetch(provider.endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                console.warn(`${provider.name} failed with status ${response.status}`);
                continue; // Try next provider
            }
            
            const data = await response.json();
            console.log(`${provider.name} response:`, data);
            
            // Extract text from OpenAI-format response
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const studyPlan = data.choices[0].message.content;
                console.log(`✓ Study plan generated successfully with ${provider.name}`);
                return studyPlan;
            }
            
            console.warn(`${provider.name} returned unexpected format`);
            continue; // Try next provider
            
        } catch (error) {
            console.error(`${provider.name} error:`, error);
            continue; // Try next provider
        }
    }
    
    // All providers failed
    throw new Error('Unable to generate study plan. All free AI services are currently unavailable. Please try again in a moment.');
}

// Display Study Plan - Convert markdown to HTML
function displayStudyPlan(planText) {
    // Strip emoji characters for a clean UI
    planText = planText.replace(/[\u{1F300}-\u{1F6FF}\u{2700}-\u{27BF}]/gu, '');
    // Convert markdown-like formatting to HTML
    let html = planText;
    
    // Convert headers (## Header -> <h2>Header</h2>)
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
    
    // Convert **bold**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Convert bullet points (- item or * item)
    const lines = html.split('\n');
    let inList = false;
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const bulletMatch = line.match(/^[\s]*[-*]\s+(.+)$/);
        const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)$/);
        
        if (bulletMatch) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(`<li>${bulletMatch[1]}</li>`);
        } else if (numberedMatch) {
            if (!inList) {
                processedLines.push('<ol>');
                inList = 'numbered';
            }
            processedLines.push(`<li>${numberedMatch[1]}</li>`);
        } else {
            if (inList) {
                processedLines.push(inList === 'numbered' ? '</ol>' : '</ul>');
                inList = false;
            }
            processedLines.push(line);
        }
    }
    
    if (inList) {
        processedLines.push(inList === 'numbered' ? '</ol>' : '</ul>');
    }
    
    html = processedLines.join('\n');
    
    // Convert double line breaks to paragraphs
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';
    
    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*<h/g, '<h');
    html = html.replace(/<\/h(\d)>\s*<\/p>/g, '</h$1>');
    html = html.replace(/<p>\s*<ul>/g, '<ul>');
    html = html.replace(/<\/ul>\s*<\/p>/g, '</ul>');
    html = html.replace(/<p>\s*<ol>/g, '<ol>');
    html = html.replace(/<\/ol>\s*<\/p>/g, '</ol>');
    
    studyPlanContent.innerHTML = `
        <div class="study-plan-generated">
            ${html}
        </div>
    `;
    
    generatingState.classList.add('hidden');
    studyPlanContent.classList.remove('hidden');
}

// Hide Modal
function hideModal() {
    studyPlanModal.classList.add('hidden');
    appState.currentAssignment = null;
}

// Handle Disconnect
function handleDisconnect() {
    // Clear app state
    appState.canvasUrl = null;
    appState.canvasToken = null;
    appState.assignments = [];
    appState.currentAssignment = null;
    
    // Reset form
    setupForm.reset();
    setupError.classList.add('hidden');
    
    // Show setup screen
    showScreen('setup');
}

// Show Screen
function showScreen(screenName) {
    console.log('=== Switching to screen:', screenName, '===');
    
    setupScreen.classList.remove('active');
    assignmentsScreen.classList.remove('active');
    
    if (screenName === 'setup') {
        setupScreen.classList.add('active');
        setupScreen.style.display = 'block';
        assignmentsScreen.style.display = 'none';
    } else if (screenName === 'assignments') {
        assignmentsScreen.classList.add('active');
        assignmentsScreen.style.display = 'block';
        setupScreen.style.display = 'none';
        
        // CRITICAL: Render assignments when showing assignments screen
        console.log('About to render', appState.assignments.length, 'assignments');
        renderAssignments(appState.assignments);
    }
}