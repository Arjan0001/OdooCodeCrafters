// Main application JavaScript for StackIt

class StackItApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 1;
        this.currentFilter = 'newest';
        this.searchQuery = '';
        this.questions = [];
        this.totalQuestions = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.loadQuestions();
        this.setupRichTextEditor();
        
        // Test API connection
        this.testApiConnection();
    }
    
    // Event Listeners Setup
    setupEventListeners() {
        // Header controls
        document.getElementById('searchInput').addEventListener('input', this.debounce(this.handleSearch.bind(this), CONFIG.DEBOUNCE_DELAY));
        document.getElementById('filterSelect').addEventListener('change', this.handleFilterChange.bind(this));
        document.getElementById('askQuestionBtn').addEventListener('click', this.showAskQuestionModal.bind(this));
        
        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', this.toggleMobileMenu.bind(this));
        
        // User menu
        document.getElementById('avatarBtn').addEventListener('click', this.toggleUserMenu.bind(this));
        document.getElementById('logoutLink').addEventListener('click', this.logout.bind(this));
        
        // Modals
        this.setupModalEventListeners();
        
        // Forms
        this.setupFormEventListeners();
        
        // Pagination
        document.getElementById('prevBtn').addEventListener('click', () => this.changePage(this.currentPage - 1));
        document.getElementById('nextBtn').addEventListener('click', () => this.changePage(this.currentPage + 1));
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', this.handleOutsideClick.bind(this));
    }
    
    setupModalEventListeners() {
        // Login modal
        document.getElementById('loginModalClose').addEventListener('click', () => this.hideModal('loginModal'));
        document.getElementById('showSignupLink').addEventListener('click', () => this.showModal('signupModal'));
        
        // Signup modal
        document.getElementById('signupModalClose').addEventListener('click', () => this.hideModal('signupModal'));
        document.getElementById('showLoginLink').addEventListener('click', () => this.showModal('loginModal'));
        
        // Ask question modal
        document.getElementById('askQuestionModalClose').addEventListener('click', () => this.hideModal('askQuestionModal'));
        document.getElementById('cancelQuestionBtn').addEventListener('click', () => this.hideModal('askQuestionModal'));
        
        // Question detail modal
        document.getElementById('questionDetailModalClose').addEventListener('click', () => this.hideModal('questionDetailModal'));
        document.getElementById('backToHome').addEventListener('click', () => this.hideModal('questionDetailModal'));
        
        // Mobile login
        document.getElementById('mobileLoginBtn').addEventListener('click', () => this.showModal('loginModal'));
    }
    
    setupFormEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
        
        // Signup form
        document.getElementById('signupForm').addEventListener('submit', this.handleSignup.bind(this));
        
        // Ask question form
        document.getElementById('askQuestionForm').addEventListener('submit', this.handleAskQuestion.bind(this));
    }
    
    // Authentication Methods
    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            // Try different field combinations that Django REST might expect
            const loginAttempts = [
                { email: email, password: password },
                { username: email, password: password },
                { username: email.split('@')[0], password: password },
                { email: email, password: password, username: email }
            ];
            
            let loginSuccess = false;
            let lastError = null;
            
            for (const loginData of loginAttempts) {
                try {
                    console.log('Trying login with:', loginData);
                    
                    const response = await apiRequest(CONFIG.ENDPOINTS.AUTH_LOGIN, {
                        method: 'POST',
                        body: JSON.stringify(loginData)
                    });
                    
                                this.setTokens(response.access, response.refresh);
            this.currentUser = response.user || { email };
            
            // Store user data including ID for question submission
            if (response.user) {
                this.currentUser.id = response.user.id;
                this.currentUser.username = response.user.username;
            } else {
                // If login response doesn't include user data, try to fetch it
                try {
                    const userResponse = await apiRequest(CONFIG.API_BASE_URL + '/api/auth/user/');
                    this.currentUser = {
                        ...this.currentUser,
                        id: userResponse.id,
                        username: userResponse.username,
                        email: userResponse.email
                    };
                } catch (userError) {
                    console.log('Could not fetch user data:', userError);
                    // Try to extract user ID from the JWT token
                    try {
                        const tokenPayload = JSON.parse(atob(response.access.split('.')[1]));
                        this.currentUser.id = tokenPayload.user_id;
                        console.log('Extracted user ID from token:', tokenPayload.user_id);
                    } catch (tokenError) {
                        console.log('Could not extract user ID from token:', tokenError);
                    }
                }
            }
            
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
                    this.hideModal('loginModal');
                    this.updateUIForAuth();
                    this.showToast('Login successful!', 'success');
                    this.loadQuestions();
                    loginSuccess = true;
                    break;
                    
                } catch (error) {
                    lastError = error;
                    console.log('Login attempt failed:', error.message);
                    
                    // If it's a validation error, stop trying
                    if (error.message.includes('This field is required') || 
                        error.message.includes('Invalid') ||
                        error.message.includes('Enter a valid')) {
                        break;
                    }
                    
                    continue;
                }
            }
            
            if (!loginSuccess) {
                console.error('All login attempts failed:', lastError);
                
                // Provide helpful error messages
                if (lastError.message.includes('No active account found')) {
                    this.showToast('No account found. Please sign up first or check your credentials.', 'error');
                    // Automatically show signup modal
                    setTimeout(() => {
                        this.hideModal('loginModal');
                        this.showModal('signupModal');
                    }, 2000);
                } else {
                    this.showToast('Login failed: ' + lastError.message, 'error');
                }
            }
            
        } catch (error) {
            console.error('Login error details:', error);
            this.showToast('Login failed: ' + error.message, 'error');
        }
    }
    
    async handleSignup(event) {
        event.preventDefault();
        
        const username = document.getElementById('signupUsername').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        // Validate input
        if (!username || !email || !password) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters long', 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Creating Account...';
            submitBtn.disabled = true;
            
            // Try different signup endpoints that might exist
            const signupEndpoints = [
                CONFIG.ENDPOINTS.AUTH_LOGIN.replace('/login/', '/register/'),
                CONFIG.ENDPOINTS.AUTH_LOGIN.replace('/login/', '/signup/'),
                CONFIG.ENDPOINTS.AUTH_LOGIN.replace('/login/', '/users/'),
                CONFIG.API_BASE_URL + '/api/auth/register/',
                CONFIG.API_BASE_URL + '/api/users/'
            ];
            
            let signupSuccess = false;
            let lastError = null;
            
            for (const endpoint of signupEndpoints) {
                try {
                    console.log(`Trying signup endpoint: ${endpoint}`);
                    
                    const signupData = {
                        username: username,
                        email: email,
                        password: password,
                        password1: password, // Some Django forms expect password1/password2
                        password2: password
                    };
                    
                    const response = await apiRequest(endpoint, {
                        method: 'POST',
                        body: JSON.stringify(signupData)
                    });
                    
                    console.log('Signup successful:', response);
                    this.showToast('Account created successfully! Please login.', 'success');
                    this.hideModal('signupModal');
                    this.showModal('loginModal');
                    signupSuccess = true;
                    break;
                    
                } catch (error) {
                    lastError = error;
                    console.log(`Signup endpoint ${endpoint} failed:`, error.message);
                    
                    // If it's a 404, try the next endpoint
                    if (error.message.includes('404') || error.message.includes('Not Found')) {
                        continue;
                    }
                    
                    // If it's a validation error, show the specific error
                    if (error.message.includes('username') || error.message.includes('email') || error.message.includes('password')) {
                        this.showToast('Signup failed: ' + error.message, 'error');
                        break;
                    }
                    
                    continue;
                }
            }
            
            if (!signupSuccess) {
                // If all signup endpoints fail, show a helpful message
                this.showToast('Signup failed: Registration endpoint not found. Please contact administrator.', 'error');
                console.error('All signup endpoints failed. Last error:', lastError);
                
                // Show alternative solutions
                this.showRegistrationAlternatives();
            }
            
        } catch (error) {
            this.showToast('Signup failed: ' + error.message, 'error');
        } finally {
            // Reset button state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Create Account';
            submitBtn.disabled = false;
        }
    }
    
    logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
        
        this.currentUser = null;
        this.updateUIForAuth();
        this.hideModal('questionDetailModal');
        this.showToast('Logged out successfully', 'success');
    }
    
    setTokens(accessToken, refreshToken) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    
    checkAuthStatus() {
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        if (token) {
            this.currentUser = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA) || '{}');
            this.updateUIForAuth();
        }
    }
    
    updateUIForAuth() {
        const isLoggedIn = !!this.currentUser;
        
        // Update avatar button
        const avatarBtn = document.getElementById('avatarBtn');
        if (isLoggedIn) {
            avatarBtn.innerHTML = '<i class="fas fa-user"></i>';
        } else {
            avatarBtn.innerHTML = '<i class="fas fa-user-circle"></i>';
        }
        
        // Update mobile login button
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        if (isLoggedIn) {
            mobileLoginBtn.textContent = 'Logout';
            mobileLoginBtn.onclick = this.logout.bind(this);
        } else {
            mobileLoginBtn.textContent = 'Login';
            mobileLoginBtn.onclick = () => this.showModal('loginModal');
        }
    }
    
    // Questions Methods
    async loadQuestions() {
        this.showLoading();
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                page_size: CONFIG.ITEMS_PER_PAGE,
                ordering: this.currentFilter === 'newest' ? '-created_at' : 
                         this.currentFilter === 'popular' ? '-votes' : '-created_at',
                search: this.searchQuery
            });
            
            console.log('Loading questions with params:', params.toString());
            
            const response = await apiRequest(`${CONFIG.ENDPOINTS.QUESTIONS}?${params}`);
            console.log('Questions response:', response);
            
            // Handle different response formats
            if (Array.isArray(response)) {
                this.questions = response;
                this.totalQuestions = response.length;
            } else if (response.results) {
                this.questions = response.results;
                this.totalQuestions = response.count || response.results.length;
            } else {
                this.questions = [response]; // Single question
                this.totalQuestions = 1;
            }
            
            console.log(`Loaded ${this.questions.length} questions, total: ${this.totalQuestions}`);
            
            this.renderQuestions();
            this.updatePagination();
            this.updateQuestionCount();
            
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showEmptyState();
        }
    }
    
    renderQuestions() {
        const container = document.getElementById('questionsContainer');
        
        console.log('Rendering questions:', this.questions);
        
        if (!this.questions || this.questions.length === 0) {
            this.showEmptyState();
            return;
        }
        
        this.hideEmptyState();
        
        container.innerHTML = this.questions.map(question => {
            console.log('Rendering question:', question);
            
            // Handle different content field names
            const content = question.content || question.description || question.body || '';
            const preview = content.length > 200 ? content.substring(0, 200) + '...' : content;
            
            // Handle different tags formats
            let tags = [];
            if (Array.isArray(question.tags)) {
                tags = question.tags;
            } else if (typeof question.tags === 'string') {
                tags = question.tags.split(',').map(tag => tag.trim());
            }
            
            return `
                <div class="question-card" onclick="app.showQuestionDetail(${question.id})">
                    <div class="question-title">${this.escapeHtml(question.title)}</div>
                    <div class="question-preview">${this.escapeHtml(preview)}</div>
                    <div class="question-meta">
                        <div class="question-tags">
                            ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                        </div>
                        <div class="question-info">
                            <div class="question-author">
                                <i class="fas fa-user"></i>
                                <span>${this.escapeHtml(question.author?.username || question.author?.email || 'Anonymous')}</span>
                            </div>
                            <div class="question-stats">
                                <div class="stat">
                                    <i class="fas fa-calendar"></i>
                                    <span>${this.formatDate(question.created_at)}</span>
                                </div>
                                <div class="stat">
                                    <i class="fas fa-eye"></i>
                                    <span>${question.views || 0}</span>
                                </div>
                                <div class="stat">
                                    <i class="fas fa-comment"></i>
                                    <span>${question.answers_count || 0}</span>
                                </div>
                                <div class="stat">
                                    <i class="fas fa-thumbs-up"></i>
                                    <span>${question.votes || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async showQuestionDetail(questionId) {
        try {
            const response = await apiRequest(`${CONFIG.ENDPOINTS.QUESTIONS}${questionId}/`);
            this.renderQuestionDetail(response);
            this.showModal('questionDetailModal');
        } catch (error) {
            this.showToast('Error loading question details', 'error');
        }
    }
    
    renderQuestionDetail(question) {
        const content = document.getElementById('questionDetailContent');
        
        content.innerHTML = `
            <div class="question-detail-header">
                <h1 class="question-detail-title">${this.escapeHtml(question.title)}</h1>
                <div class="question-detail-meta">
                    <div class="question-detail-tags">
                        ${(question.tags || []).map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}
                    </div>
                    <div class="question-detail-info">
                        <div class="question-author">
                            <i class="fas fa-user"></i>
                            <span>${this.escapeHtml(question.author?.username || 'Anonymous')}</span>
                        </div>
                        <div class="question-stats">
                            <span>${this.formatDate(question.created_at)}</span>
                            <span>${question.views || 0} views</span>
                            <span>${question.answers_count || 0} answers</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="voting-section">
                <div class="vote-buttons">
                    <button class="vote-btn" onclick="app.voteQuestion(${question.id}, 'up')">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <div class="vote-count">${question.votes || 0}</div>
                    <button class="vote-btn" onclick="app.voteQuestion(${question.id}, 'down')">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="question-detail-content-text">
                    ${this.formatContent(question.content)}
                </div>
            </div>
            
            <div class="answers-section">
                <div class="answers-header">
                    <h3>Answers (${question.answers_count || 0})</h3>
                    ${this.currentUser ? `<button class="btn-primary" onclick="app.showAnswerForm(${question.id})">Add Answer</button>` : ''}
                </div>
                <div id="answersContainer">
                    ${this.renderAnswers(question.answers || [])}
                </div>
            </div>
            
            ${this.currentUser ? `
                <div class="submit-answer-section">
                    <h3>Your Answer</h3>
                    <form id="answerForm" onsubmit="app.handleSubmitAnswer(event, ${question.id})">
                        <div class="form-group">
                            <div class="rich-text-toolbar">
                                <button type="button" class="toolbar-btn" data-command="bold">
                                    <i class="fas fa-bold"></i>
                                </button>
                                <button type="button" class="toolbar-btn" data-command="italic">
                                    <i class="fas fa-italic"></i>
                                </button>
                                <button type="button" class="toolbar-btn" data-command="insertUnorderedList">
                                    <i class="fas fa-list-ul"></i>
                                </button>
                            </div>
                            <div class="rich-text-editor" id="answerContent" contenteditable="true" placeholder="Write your answer..."></div>
                        </div>
                        <button type="submit" class="btn-primary">Submit Answer</button>
                    </form>
                </div>
            ` : ''}
        `;
        
        document.getElementById('questionBreadcrumb').textContent = question.title;
    }
    
    renderAnswers(answers) {
        if (answers.length === 0) {
            return '<p>No answers yet. Be the first to answer!</p>';
        }
        
        return answers.map(answer => `
            <div class="answer-card">
                <div class="answer-content">
                    ${this.formatContent(answer.content)}
                </div>
                <div class="answer-meta">
                    <div class="answer-author">
                        <i class="fas fa-user"></i>
                        <span>${this.escapeHtml(answer.author?.username || 'Anonymous')}</span>
                    </div>
                    <div class="answer-voting">
                        <button class="vote-btn" onclick="app.voteAnswer(${answer.id}, 'up')">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <span>${answer.votes || 0}</span>
                        <button class="vote-btn" onclick="app.voteAnswer(${answer.id}, 'down')">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Voting Methods
    async voteQuestion(questionId, voteType) {
        if (!this.currentUser) {
            this.showToast('Please login to vote', 'error');
            return;
        }
        
        try {
            await apiRequest(CONFIG.ENDPOINTS.VOTES, {
                method: 'POST',
                body: JSON.stringify({
                    question: questionId,
                    vote_type: voteType
                })
            });
            
            this.showToast('Vote recorded!', 'success');
            this.showQuestionDetail(questionId); // Refresh the question
            
        } catch (error) {
            this.showToast('Error recording vote', 'error');
        }
    }
    
    async voteAnswer(answerId, voteType) {
        if (!this.currentUser) {
            this.showToast('Please login to vote', 'error');
            return;
        }
        
        try {
            await apiRequest(CONFIG.ENDPOINTS.VOTES, {
                method: 'POST',
                body: JSON.stringify({
                    answer: answerId,
                    vote_type: voteType
                })
            });
            
            this.showToast('Vote recorded!', 'success');
            
        } catch (error) {
            this.showToast('Error recording vote', 'error');
        }
    }
    
    // Question Creation
    async handleAskQuestion(event) {
        event.preventDefault();
        
        if (!this.currentUser) {
            this.showToast('Please login to ask a question', 'error');
            return;
        }
        
        const title = document.getElementById('questionTitle').value;
        const content = document.getElementById('questionDescription').innerHTML;
        const tags = document.getElementById('questionTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
        
        console.log('Form data extracted:', { title, content, tags });
        
        // Validate input
        if (!title.trim()) {
            this.showToast('Please enter a question title', 'error');
            return;
        }
        
        if (!content.trim() || content === '<br>' || content === '') {
            this.showToast('Please enter question content', 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            
            // Based on debug output, backend expects: description, tags (string), author (pk)
            const questionData = {
                title: title,
                description: content, // Backend expects 'description' field
                tags: tags.join(', '), // Backend expects tags as string, not array
                author: this.currentUser.id || 1 // Use user ID or fallback to 1
            };
            
            console.log('Constructed question data:', questionData);
            
            console.log('Submitting question with data:', questionData);
            
            // Log the exact request being made
            console.log('Request URL:', CONFIG.ENDPOINTS.QUESTIONS);
            console.log('Request headers:', getAuthHeaders());
            console.log('Request body:', JSON.stringify(questionData));
            
            // Log current user state
            console.log('Current user state:', this.currentUser);
            console.log('User ID available:', !!this.currentUser.id);
            
            const response = await apiRequest(CONFIG.ENDPOINTS.QUESTIONS, {
                method: 'POST',
                body: JSON.stringify(questionData)
            });
            
            console.log('Question submission response:', response);
            
            this.hideModal('askQuestionModal');
            this.showToast('Question submitted successfully!', 'success');
            
            // Force refresh the questions list
            this.currentPage = 1; // Reset to first page
            await this.loadQuestions();
            this.resetAskQuestionForm();
            
            // Also try to load the specific question that was just created
            if (response && response.id) {
                console.log('New question created with ID:', response.id);
                // Optionally show the new question detail
                setTimeout(() => {
                    this.showQuestionDetail(response.id);
                }, 1000);
            }
            
        } catch (error) {
            console.error('Question submission error details:', error);
            
            // Provide specific error messages
            if (error.message.includes('title')) {
                this.showToast('Error: Please check your question title', 'error');
            } else if (error.message.includes('content') || error.message.includes('body')) {
                this.showToast('Error: Please check your question content', 'error');
            } else if (error.message.includes('tags')) {
                this.showToast('Error: Please check your question tags', 'error');
            } else if (error.message.includes('author') || error.message.includes('user')) {
                this.showToast('Error: Authentication issue. Please login again.', 'error');
            } else {
                this.showToast('Error submitting question: ' + error.message, 'error');
            }
        } finally {
            // Reset button state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Submit Question';
            submitBtn.disabled = false;
        }
    }
    
    async handleSubmitAnswer(event, questionId) {
        event.preventDefault();
        
        if (!this.currentUser) {
            this.showToast('Please login to submit an answer', 'error');
            return;
        }
        
        const content = document.getElementById('answerContent').innerHTML;
        
        // Validate input
        if (!content.trim() || content === '<br>' || content === '') {
            this.showToast('Please enter answer content', 'error');
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            
            // Since the endpoint is working (200 status), let's try the most common Django formats
            const answerAttempts = [
                {
                    question: questionId,
                    content: content,
                    author: this.currentUser.id || 1
                },
                {
                    question: questionId,
                    content: content
                },
                {
                    question: questionId,
                    description: content,
                    author: this.currentUser.id || 1
                },
                {
                    question: questionId,
                    body: content,
                    author: this.currentUser.id || 1
                },
                {
                    question: questionId,
                    text: content,
                    author: this.currentUser.id || 1
                }
            ];
            
            let answerSuccess = false;
            let lastError = null;
            
            for (const answerData of answerAttempts) {
                try {
                    console.log('Trying answer submission with:', answerData);
                    
                    const response = await apiRequest(CONFIG.ENDPOINTS.ANSWERS, {
                        method: 'POST',
                        body: JSON.stringify(answerData)
                    });
                    
                    console.log('Answer submission successful:', response);
                    this.showToast('Answer submitted successfully!', 'success');
                    
                    // Clear the answer form
                    document.getElementById('answerContent').innerHTML = '';
                    
                    // Refresh the question detail to show the new answer
                    this.showQuestionDetail(questionId);
                    
                    answerSuccess = true;
                    break;
                    
                } catch (error) {
                    lastError = error;
                    console.log('Answer submission attempt failed:', error.message);
                    
                    // If it's a validation error, try the next format
                    if (error.message.includes('This field is required') || 
                        error.message.includes('Invalid') ||
                        error.message.includes('Enter a valid')) {
                        continue;
                    }
                    
                    // If it's a 400 error, try the next format
                    if (error.message.includes('400')) {
                        continue;
                    }
                    
                    // For other errors, stop trying
                    break;
                }
            }
            
            if (!answerSuccess) {
                console.error('All answer submission attempts failed:', lastError);
                this.showToast('Error submitting answer: ' + lastError.message, 'error');
            }
            
        } catch (error) {
            console.error('Answer submission error details:', error);
            this.showToast('Error submitting answer: ' + error.message, 'error');
        } finally {
            // Reset button state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Submit Answer';
            submitBtn.disabled = false;
        }
    }
    
    // Search and Filter
    handleSearch(event) {
        this.searchQuery = event.target.value;
        this.currentPage = 1;
        this.loadQuestions();
    }
    
    handleFilterChange(event) {
        this.currentFilter = event.target.value;
        this.currentPage = 1;
        this.loadQuestions();
    }
    
    // Pagination
    changePage(page) {
        if (page < 1 || page > this.getTotalPages()) return;
        
        this.currentPage = page;
        this.loadQuestions();
    }
    
    updatePagination() {
        const totalPages = this.getTotalPages();
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const paginationNumbers = document.getElementById('paginationNumbers');
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;
        
        // Generate page numbers
        let pageNumbers = '';
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                pageNumbers += `<button class="page-number ${i === this.currentPage ? 'active' : ''}" onclick="app.changePage(${i})">${i}</button>`;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                pageNumbers += '<span>...</span>';
            }
        }
        
        paginationNumbers.innerHTML = pageNumbers;
    }
    
    getTotalPages() {
        return Math.ceil(this.totalQuestions / CONFIG.ITEMS_PER_PAGE);
    }
    
    // UI Methods
    showModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }
    
    showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('questionsContainer').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
    }
    
    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('questionsContainer').style.display = 'block';
    }
    
    showEmptyState() {
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('questionsContainer').style.display = 'none';
    }
    
    hideEmptyState() {
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('questionsContainer').style.display = 'block';
    }
    
    updateQuestionCount() {
        document.getElementById('questionCount').textContent = `${this.totalQuestions} questions`;
    }
    
    toggleMobileMenu() {
        document.getElementById('mobileMenu').classList.toggle('show');
    }
    
    toggleUserMenu() {
        document.getElementById('dropdownMenu').classList.toggle('show');
    }
    
    handleOutsideClick(event) {
        if (!event.target.closest('.user-menu')) {
            document.getElementById('dropdownMenu').classList.remove('show');
        }
    }
    
    showAskQuestionModal() {
        if (!this.currentUser) {
            this.showToast('Please login to ask a question', 'error');
            this.showModal('loginModal');
            return;
        }
        this.showModal('askQuestionModal');
    }
    
    resetAskQuestionForm() {
        document.getElementById('questionTitle').value = '';
        document.getElementById('questionDescription').innerHTML = '';
        document.getElementById('questionTags').value = '';
    }
    
    // Rich Text Editor
    setupRichTextEditor() {
        const toolbar = document.querySelector('.rich-text-toolbar');
        if (toolbar) {
            toolbar.addEventListener('click', (e) => {
                if (e.target.closest('.toolbar-btn')) {
                    e.preventDefault();
                    const button = e.target.closest('.toolbar-btn');
                    const command = button.dataset.command;
                    const editor = document.getElementById('questionDescription');
                    
                    if (command === 'createLink') {
                        const url = prompt('Enter URL:');
                        if (url) document.execCommand(command, false, url);
                    } else if (command === 'insertImage') {
                        const url = prompt('Enter image URL:');
                        if (url) document.execCommand(command, false, url);
                    } else {
                        document.execCommand(command, false, null);
                    }
                    
                    editor.focus();
                }
            });
        }
    }
    
    // Test API Connection
    async testApiConnection() {
        try {
            console.log('Testing API connection...');
            const response = await fetch(CONFIG.ENDPOINTS.QUESTIONS);
            console.log('API connection test result:', response.status, response.statusText);
            
            if (response.ok) {
                console.log('✅ API connection successful');
            } else {
                console.log('❌ API connection failed:', response.status);
            }
        } catch (error) {
            console.error('❌ API connection error:', error);
        }
    }
    
    // Debug test methods
    async testLogin() {
        this.logDebug('Testing login with different field combinations...');
        
        const testCredentials = [
            { email: 'test@example.com', password: 'testpass123' },
            { username: 'test@example.com', password: 'testpass123' },
            { username: 'test', password: 'testpass123' },
            { email: 'test@example.com', password: 'testpass123', username: 'test@example.com' }
        ];
        
        for (let i = 0; i < testCredentials.length; i++) {
            const credentials = testCredentials[i];
            try {
                this.logDebug(`Attempt ${i + 1}: ${JSON.stringify(credentials)}`);
                
                const response = await fetch(CONFIG.ENDPOINTS.AUTH_LOGIN, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                const data = await response.json();
                this.logDebug(`Response ${i + 1}: ${response.status} - ${JSON.stringify(data)}`);
                
                if (response.ok) {
                    this.logDebug('✅ Login test successful!');
                    break;
                }
            } catch (error) {
                this.logDebug(`Error ${i + 1}: ${error.message}`);
            }
        }
    }
    
    async testSignup() {
        this.logDebug('Testing signup...');
        try {
            const response = await fetch(CONFIG.ENDPOINTS.AUTH_LOGIN.replace('/login/', '/register/'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: 'testuser', 
                    email: 'test@example.com', 
                    password: 'testpass123' 
                })
            });
            const data = await response.json();
            this.logDebug(`Signup test: ${response.status} - ${JSON.stringify(data)}`);
        } catch (error) {
            this.logDebug(`Signup test error: ${error.message}`);
        }
    }
    
    async testQuestions() {
        this.logDebug('Testing questions endpoint...');
        try {
            const response = await fetch(CONFIG.ENDPOINTS.QUESTIONS);
            const data = await response.json();
            this.logDebug(`Questions test: ${response.status} - Found ${data.results?.length || data.length || 0} questions`);
        } catch (error) {
            this.logDebug(`Questions test error: ${error.message}`);
        }
    }
    
    async testQuestionSubmission() {
        this.logDebug('Testing question submission with different payloads...');
        
        if (!this.currentUser) {
            this.logDebug('❌ Not logged in. Please login first.');
            return;
        }
        
        const testQuestion = {
            title: 'Test Question',
            content: 'This is a test question content.',
            description: 'This is a test question description.',
            body: 'This is a test question body.',
            text: 'This is a test question text.',
            tags: ['test', 'debug'],
            tag_list: ['test', 'debug'],
            category: 'test',
            author: this.currentUser.username || this.currentUser.email
        };
        
        const testPayloads = [
            // Based on debug output, try the correct format
            { title: testQuestion.title, description: testQuestion.description, tags: 'test, debug', author: 1 },
            { title: testQuestion.title, description: testQuestion.description, tags: 'test, debug' },
            { title: testQuestion.title, description: testQuestion.description, author: 1 },
            { title: testQuestion.title, description: testQuestion.description }
        ];
        
        for (let i = 0; i < testPayloads.length; i++) {
            const payload = testPayloads[i];
            try {
                this.logDebug(`Test ${i + 1}: ${JSON.stringify(payload)}`);
                
                const response = await fetch(CONFIG.ENDPOINTS.QUESTIONS, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
                
                const data = await response.json();
                this.logDebug(`Response ${i + 1}: ${response.status} - ${JSON.stringify(data)}`);
                
                if (response.ok) {
                    this.logDebug(`✅ SUCCESS! Payload ${i + 1} worked!`);
                    break;
                } else if (response.status === 400) {
                    this.logDebug(`❌ 400 error details: ${JSON.stringify(data)}`);
                }
            } catch (error) {
                this.logDebug(`❌ Error ${i + 1}: ${error.message}`);
            }
        }
        
        this.logDebug('Question submission test completed.');
    }
    
    checkUserData() {
        this.logDebug('=== CURRENT USER DATA ===');
        this.logDebug(`Logged in: ${!!this.currentUser}`);
        if (this.currentUser) {
            this.logDebug(`User ID: ${this.currentUser.id || 'Not available'}`);
            this.logDebug(`Username: ${this.currentUser.username || 'Not available'}`);
            this.logDebug(`Email: ${this.currentUser.email || 'Not available'}`);
            this.logDebug(`Full user object: ${JSON.stringify(this.currentUser)}`);
        } else {
            this.logDebug('❌ No user data available');
        }
        
        // Check localStorage
        const storedUser = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
        this.logDebug(`Stored user data: ${storedUser || 'None'}`);
        
        // Check auth token
        const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        this.logDebug(`Auth token available: ${!!token}`);
    }
    
    async testUISubmission() {
        this.logDebug('Testing UI question submission...');
        
        if (!this.currentUser) {
            this.logDebug('❌ Not logged in. Please login first.');
            return;
        }
        
        // Simulate filling the form
        const titleInput = document.getElementById('questionTitle');
        const descriptionInput = document.getElementById('questionDescription');
        const tagsInput = document.getElementById('questionTags');
        
        if (titleInput && descriptionInput && tagsInput) {
            titleInput.value = 'UI Test Question';
            descriptionInput.innerHTML = 'This is a test question from the UI.';
            tagsInput.value = 'test, ui, debug';
            
            this.logDebug('✅ Form filled with test data');
            this.logDebug('Now try submitting the question through the UI...');
            
            // Also show what the form submission will send
            const formData = {
                title: titleInput.value,
                description: descriptionInput.innerHTML,
                tags: tagsInput.value.split(',').map(tag => tag.trim()).join(', '),
                author: this.currentUser.id || 'Not available'
            };
            
            this.logDebug('Form elements found:');
            this.logDebug(`- Title input: ${!!titleInput}`);
            this.logDebug(`- Description input: ${!!descriptionInput}`);
            this.logDebug(`- Tags input: ${!!tagsInput}`);
            this.logDebug('Form will send:', JSON.stringify(formData));
        } else {
            this.logDebug('❌ Could not find form elements');
        }
    }
    
    async refreshToken() {
        this.logDebug('Attempting to refresh token...');
        
        try {
            const refreshToken = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
            if (!refreshToken) {
                this.logDebug('❌ No refresh token available');
                return;
            }
            
            this.logDebug('Sending refresh request...');
            
            const response = await fetch(CONFIG.ENDPOINTS.AUTH_REFRESH, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    refresh: refreshToken
                })
            });
            
            const data = await response.json();
            this.logDebug(`Refresh response: ${response.status} - ${JSON.stringify(data)}`);
            
            if (response.ok) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, data.access);
                this.logDebug('✅ Token refreshed successfully!');
                
                // Extract user ID from the new token
                try {
                    const tokenPayload = JSON.parse(atob(data.access.split('.')[1]));
                    this.currentUser.id = tokenPayload.user_id;
                    this.logDebug(`✅ Extracted user ID from token: ${tokenPayload.user_id}`);
                    localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
                } catch (tokenError) {
                    this.logDebug(`❌ Could not extract user ID from token: ${tokenError.message}`);
                }
                
                this.logDebug('You can now try submitting questions again.');
            } else {
                this.logDebug('❌ Token refresh failed');
                this.logDebug('You may need to login again.');
                
                // Clear invalid tokens
                localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
                localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
                localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
                this.currentUser = null;
                this.updateUIForAuth();
            }
        } catch (error) {
            this.logDebug(`❌ Token refresh error: ${error.message}`);
        }
    }
    
    extractUserFromToken() {
        this.logDebug('Extracting user data from current token...');
        
        try {
            const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
            if (!token) {
                this.logDebug('❌ No access token available');
                return;
            }
            
            // Decode the JWT token
            const tokenParts = token.split('.');
            if (tokenParts.length !== 3) {
                this.logDebug('❌ Invalid token format');
                return;
            }
            
            const payload = JSON.parse(atob(tokenParts[1]));
            this.logDebug('Token payload:', payload);
            
            // Extract user information
            if (payload.user_id) {
                this.currentUser.id = payload.user_id;
                this.logDebug(`✅ Extracted user ID: ${payload.user_id}`);
            }
            
            if (payload.username) {
                this.currentUser.username = payload.username;
                this.logDebug(`✅ Extracted username: ${payload.username}`);
            }
            
            if (payload.email) {
                this.currentUser.email = payload.email;
                this.logDebug(`✅ Extracted email: ${payload.email}`);
            }
            
            // Update stored user data
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(this.currentUser));
            this.logDebug('✅ User data updated in localStorage');
            
            // Check if we now have the required data
            if (this.currentUser.id) {
                this.logDebug('✅ You now have user ID. Try submitting a question!');
            } else {
                this.logDebug('❌ Still missing user ID. You may need to login again.');
            }
            
        } catch (error) {
            this.logDebug(`❌ Error extracting user data: ${error.message}`);
        }
    }
    
    async testExactPayload() {
        this.logDebug('Testing the exact payload that worked in debug...');
        
        if (!this.currentUser) {
            this.logDebug('❌ Not logged in. Please login first.');
            return;
        }
        
        // Use the exact payload that worked in the debug test
        const exactPayload = {
            title: "Test Question",
            description: "This is a test question description.",
            tags: "test, debug",
            author: 1
        };
        
        this.logDebug(`Testing payload: ${JSON.stringify(exactPayload)}`);
        
        try {
            const response = await fetch(CONFIG.ENDPOINTS.QUESTIONS, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(exactPayload)
            });
            
            const data = await response.json();
            this.logDebug(`Response: ${response.status} - ${JSON.stringify(data)}`);
            
            if (response.ok) {
                this.logDebug('✅ Exact payload worked!');
                this.logDebug('The issue is with the form data or user ID extraction.');
            } else {
                this.logDebug(`❌ Exact payload failed: ${response.status}`);
                this.logDebug(`Error details: ${JSON.stringify(data)}`);
            }
        } catch (error) {
            this.logDebug(`❌ Error testing exact payload: ${error.message}`);
        }
    }
    
    async refreshQuestions() {
        this.logDebug('Manually refreshing questions list...');
        
        try {
            this.currentPage = 1; // Reset to first page
            await this.loadQuestions();
            this.logDebug('✅ Questions refreshed successfully');
        } catch (error) {
            this.logDebug(`❌ Error refreshing questions: ${error.message}`);
        }
    }
    
    async testAnswerSubmission() {
        this.logDebug('Testing answer submission with different payloads...');
        
        if (!this.currentUser) {
            this.logDebug('❌ Not logged in. Please login first.');
            return;
        }
        
        // First, test if the answers endpoint exists
        this.logDebug('Testing answers endpoint availability...');
        try {
            const response = await fetch(CONFIG.ENDPOINTS.ANSWERS, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            
            this.logDebug(`Answers endpoint test: ${response.status} ${response.statusText}`);
            
            if (response.status === 404) {
                this.logDebug('❌ Answers endpoint not found (404)');
                this.logDebug('Your backend might not have answers functionality enabled.');
                return;
            }
            
            // Try to get response text to see what's returned
            const responseText = await response.text();
            this.logDebug(`Response text: ${responseText.substring(0, 200)}...`);
            
        } catch (error) {
            this.logDebug(`❌ Error testing answers endpoint: ${error.message}`);
        }
        
        // Test with a sample question ID (you might need to adjust this)
        const testQuestionId = 1; // Use the first question ID
        
        const testAnswer = {
            content: 'This is a test answer content.',
            description: 'This is a test answer description.',
            body: 'This is a test answer body.',
            text: 'This is a test answer text.'
        };
        
        const testPayloads = [
            { question: testQuestionId, content: testAnswer.content },
            { question: testQuestionId, description: testAnswer.description },
            { question: testQuestionId, body: testAnswer.body },
            { question: testQuestionId, text: testAnswer.text },
            { question: testQuestionId, content: testAnswer.content, author: this.currentUser.id || 1 },
            { question: testQuestionId, description: testAnswer.description, author: this.currentUser.id || 1 }
        ];
        
        for (let i = 0; i < testPayloads.length; i++) {
            const payload = testPayloads[i];
            try {
                this.logDebug(`Test ${i + 1}: ${JSON.stringify(payload)}`);
                
                const response = await fetch(CONFIG.ENDPOINTS.ANSWERS, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
                
                // Try to get response as text first to handle HTML errors
                const responseText = await response.text();
                this.logDebug(`Response ${i + 1}: ${response.status} - ${responseText.substring(0, 200)}`);
                
                if (response.ok) {
                    try {
                        const data = JSON.parse(responseText);
                        this.logDebug(`✅ SUCCESS! Payload ${i + 1} worked!`);
                        this.logDebug(`Response data: ${JSON.stringify(data)}`);
                        break;
                    } catch (parseError) {
                        this.logDebug(`✅ Response OK but not JSON: ${responseText}`);
                        break;
                    }
                } else if (response.status === 400) {
                    try {
                        const data = JSON.parse(responseText);
                        this.logDebug(`❌ 400 error details: ${JSON.stringify(data)}`);
                    } catch (parseError) {
                        this.logDebug(`❌ 400 error (not JSON): ${responseText}`);
                    }
                } else if (response.status === 404) {
                    this.logDebug(`❌ 404 - Answers endpoint not found`);
                    break;
                } else {
                    this.logDebug(`❌ ${response.status} error: ${responseText}`);
                }
            } catch (error) {
                this.logDebug(`❌ Error ${i + 1}: ${error.message}`);
            }
        }
        
        this.logDebug('Answer submission test completed.');
    }
    
    async testAnswerEndpoints() {
        this.logDebug('Testing different answer endpoint variations...');
        
        const answerEndpoints = [
            CONFIG.ENDPOINTS.ANSWERS,
            CONFIG.ENDPOINTS.ANSWERS.replace('/answers/', '/answer/'),
            CONFIG.ENDPOINTS.ANSWERS.replace('/answers/', '/replies/'),
            CONFIG.ENDPOINTS.ANSWERS.replace('/answers/', '/comments/'),
            CONFIG.API_BASE_URL + '/api/answer/',
            CONFIG.API_BASE_URL + '/api/replies/',
            CONFIG.API_BASE_URL + '/api/comments/'
        ];
        
        for (let i = 0; i < answerEndpoints.length; i++) {
            const endpoint = answerEndpoints[i];
            try {
                this.logDebug(`Testing endpoint ${i + 1}: ${endpoint}`);
                
                const response = await fetch(endpoint, {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                
                this.logDebug(`Response ${i + 1}: ${response.status} ${response.statusText}`);
                
                if (response.status === 200) {
                    this.logDebug(`✅ Found working endpoint: ${endpoint}`);
                    break;
                } else if (response.status === 404) {
                    this.logDebug(`❌ Endpoint not found: ${endpoint}`);
                } else {
                    this.logDebug(`⚠️ Endpoint exists but returned ${response.status}: ${endpoint}`);
                }
            } catch (error) {
                this.logDebug(`❌ Error testing ${endpoint}: ${error.message}`);
            }
        }
        
        this.logDebug('Answer endpoints test completed.');
    }
    
    async quickAnswerTest() {
        this.logDebug('=== QUICK ANSWER SUBMISSION TEST ===');
        
        if (!this.currentUser) {
            this.logDebug('❌ Not logged in. Please login first.');
            return;
        }
        
        try {
            // Simple test with minimal payload
            const testPayload = {
                question: 1,
                content: 'Quick test answer'
            };
            
            this.logDebug(`Testing with payload: ${JSON.stringify(testPayload)}`);
            
            const response = await fetch(CONFIG.ENDPOINTS.ANSWERS, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(testPayload)
            });
            
            const responseText = await response.text();
            this.logDebug(`Response: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                this.logDebug('✅ SUCCESS! Answer submission is now working!');
                try {
                    const data = JSON.parse(responseText);
                    this.logDebug(`Response data: ${JSON.stringify(data)}`);
                } catch (parseError) {
                    this.logDebug(`Response text: ${responseText}`);
                }
            } else if (response.status === 500) {
                this.logDebug('❌ Still getting 500 error - Backend serializer issue persists');
                this.logDebug('The backend needs to fix the AnswerSerializer configuration');
            } else {
                this.logDebug(`❌ ${response.status} error: ${responseText}`);
            }
            
        } catch (error) {
            this.logDebug(`❌ Error: ${error.message}`);
        }
        
        this.logDebug('Quick test completed.');
    }
    
    async testAnswerSubmissionWithWorkingEndpoint() {
        this.logDebug('Testing answer submission with the working endpoint...');
        
        if (!this.currentUser) {
            this.logDebug('❌ Not logged in. Please login first.');
            return;
        }
        
        // Since we know the endpoint works, let's test with a real question ID
        // First, get a list of questions to find a valid question ID
        try {
            const questionsResponse = await fetch(CONFIG.ENDPOINTS.QUESTIONS);
            const questionsData = await questionsResponse.json();
            
            let questionId = 1; // Default fallback
            
            if (questionsData.results && questionsData.results.length > 0) {
                questionId = questionsData.results[0].id;
                this.logDebug(`Using question ID: ${questionId}`);
            } else if (Array.isArray(questionsData) && questionsData.length > 0) {
                questionId = questionsData[0].id;
                this.logDebug(`Using question ID: ${questionId}`);
            } else {
                this.logDebug(`No questions found, using default ID: ${questionId}`);
            }
            
            // Test different answer payloads
            const testAnswer = {
                content: 'This is a test answer from the debug panel.',
                description: 'This is a test answer description.',
                body: 'This is a test answer body.',
                text: 'This is a test answer text.'
            };
            
            const testPayloads = [
                { question: questionId, content: testAnswer.content },
                { question: questionId, content: testAnswer.content, author: this.currentUser.id || 1 },
                { question: questionId, description: testAnswer.description, author: this.currentUser.id || 1 },
                { question: questionId, body: testAnswer.body, author: this.currentUser.id || 1 },
                { question: questionId, text: testAnswer.text, author: this.currentUser.id || 1 }
            ];
            
            for (let i = 0; i < testPayloads.length; i++) {
                const payload = testPayloads[i];
                try {
                    this.logDebug(`Test ${i + 1}: ${JSON.stringify(payload)}`);
                    
                    const response = await fetch(CONFIG.ENDPOINTS.ANSWERS, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(payload)
                    });
                    
                    const responseText = await response.text();
                    this.logDebug(`Response ${i + 1}: ${response.status} - ${responseText.substring(0, 200)}`);
                    
                    if (response.ok) {
                        try {
                            const data = JSON.parse(responseText);
                            this.logDebug(`✅ SUCCESS! Payload ${i + 1} worked!`);
                            this.logDebug(`Response data: ${JSON.stringify(data)}`);
                            break;
                        } catch (parseError) {
                            this.logDebug(`✅ Response OK but not JSON: ${responseText}`);
                            break;
                        }
                    } else if (response.status === 400) {
                        try {
                            const data = JSON.parse(responseText);
                            this.logDebug(`❌ 400 error details: ${JSON.stringify(data)}`);
                        } catch (parseError) {
                            this.logDebug(`❌ 400 error (not JSON): ${responseText}`);
                        }
                    } else if (response.status === 500) {
                        this.logDebug(`❌ 500 error - Backend serializer configuration issue`);
                        this.logDebug(`This is a backend problem that needs to be fixed on the server`);
                        break;
                    } else {
                        this.logDebug(`❌ ${response.status} error: ${responseText}`);
                    }
                } catch (error) {
                    this.logDebug(`❌ Error ${i + 1}: ${error.message}`);
                }
            }
            
        } catch (error) {
            this.logDebug(`❌ Error getting questions: ${error.message}`);
        }
        
        this.logDebug('Answer submission test completed.');
    }
    
    async createDemoUser() {
        this.logDebug('Creating demo user...');
        try {
            const demoUser = {
                username: 'demo_user',
                email: 'demo@example.com',
                password: 'demo123456',
                password1: 'demo123456',
                password2: 'demo123456'
            };
            
            // Try multiple signup endpoints
            const signupEndpoints = [
                CONFIG.ENDPOINTS.AUTH_LOGIN.replace('/login/', '/register/'),
                CONFIG.ENDPOINTS.AUTH_LOGIN.replace('/login/', '/signup/'),
                CONFIG.ENDPOINTS.AUTH_LOGIN.replace('/login/', '/users/'),
                CONFIG.API_BASE_URL + '/api/auth/register/',
                CONFIG.API_BASE_URL + '/api/users/',
                CONFIG.API_BASE_URL + '/api/register/'
            ];
            
            let success = false;
            
            for (const endpoint of signupEndpoints) {
                try {
                    this.logDebug(`Trying endpoint: ${endpoint}`);
                    
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(demoUser)
                    });
                    
                    const data = await response.json();
                    this.logDebug(`Response from ${endpoint}: ${response.status} - ${JSON.stringify(data)}`);
                    
                    if (response.ok) {
                        this.logDebug('✅ Demo user created successfully!');
                        this.logDebug('You can now login with: demo@example.com / demo123456');
                        success = true;
                        break;
                    } else if (response.status === 404) {
                        this.logDebug(`❌ Endpoint ${endpoint} not found`);
                        continue;
                    } else {
                        this.logDebug(`❌ Failed with status ${response.status}: ${data.message || data.detail || 'Unknown error'}`);
                        break;
                    }
                } catch (error) {
                    this.logDebug(`❌ Error with ${endpoint}: ${error.message}`);
                    continue;
                }
            }
            
            if (!success) {
                this.logDebug('❌ All signup endpoints failed. You may need to create a user manually in your Django admin.');
                this.logDebug('Try accessing your Django admin panel and create a user there.');
            }
            
        } catch (error) {
            this.logDebug(`Demo user creation error: ${error.message}`);
        }
    }
    
    async tryDemoCredentials() {
        this.logDebug('Trying common demo credentials...');
        
        const demoCredentials = [
            { username: 'admin', password: 'admin' },
            { username: 'admin', password: 'admin123' },
            { username: 'demo', password: 'demo' },
            { username: 'demo', password: 'demo123' },
            { username: 'test', password: 'test' },
            { username: 'test', password: 'test123' },
            { username: 'user', password: 'user' },
            { username: 'user', password: 'user123' },
            { email: 'admin@example.com', password: 'admin' },
            { email: 'demo@example.com', password: 'demo' },
            { email: 'test@example.com', password: 'test' }
        ];
        
        for (let i = 0; i < demoCredentials.length; i++) {
            const credentials = demoCredentials[i];
            try {
                this.logDebug(`Trying credentials ${i + 1}: ${JSON.stringify(credentials)}`);
                
                const response = await fetch(CONFIG.ENDPOINTS.AUTH_LOGIN, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(credentials)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.logDebug(`✅ SUCCESS! Credentials ${i + 1} worked: ${JSON.stringify(credentials)}`);
                    this.logDebug('You can now use these credentials to login!');
                    break;
                } else {
                    this.logDebug(`❌ Failed ${i + 1}: ${response.status} - ${data.detail || data.message || 'No message'}`);
                }
            } catch (error) {
                this.logDebug(`❌ Error ${i + 1}: ${error.message}`);
            }
        }
        
        this.logDebug('Demo credentials test completed.');
    }
    
    logDebug(message) {
        const debugOutput = document.getElementById('debugOutput');
        if (debugOutput) {
            debugOutput.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`;
            debugOutput.scrollTop = debugOutput.scrollHeight;
        }
        console.log(message);
    }
    
    showRegistrationAlternatives() {
        this.logDebug('=== REGISTRATION ALTERNATIVES ===');
        this.logDebug('Your backend does not have user registration enabled.');
        this.logDebug('Here are your options:');
        this.logDebug('');
        this.logDebug('1. ACCESS DJANGO ADMIN PANEL:');
        this.logDebug(`   Go to: ${CONFIG.API_BASE_URL}/admin/`);
        this.logDebug('   Create a user manually through the admin interface');
        this.logDebug('');
        this.logDebug('2. ENABLE REGISTRATION IN YOUR BACKEND:');
        this.logDebug('   Add registration endpoints to your Django URLs');
        this.logDebug('   Or enable user registration in your Django settings');
        this.logDebug('');
        this.logDebug('3. CREATE USER VIA DJANGO SHELL:');
        this.logDebug('   Access your server and run: python manage.py createsuperuser');
        this.logDebug('');
        this.logDebug('4. USE DEMO CREDENTIALS (if available):');
        this.logDebug('   Try common demo accounts like: admin/admin, demo/demo, etc.');
    }
    
    async showBackendInfo() {
        this.logDebug('=== BACKEND INFORMATION ===');
        this.logDebug(`Base URL: ${CONFIG.API_BASE_URL}`);
        this.logDebug(`Login endpoint: ${CONFIG.ENDPOINTS.AUTH_LOGIN}`);
        this.logDebug(`Questions endpoint: ${CONFIG.ENDPOINTS.QUESTIONS}`);
        
        // Test if backend is accessible
        try {
            const response = await fetch(CONFIG.API_BASE_URL);
            this.logDebug(`Backend accessible: ${response.status} ${response.statusText}`);
        } catch (error) {
            this.logDebug(`Backend not accessible: ${error.message}`);
        }
        
        // Test login endpoint with different field combinations
        this.logDebug('=== TESTING LOGIN ENDPOINT ===');
        const testPayloads = [
            { email: 'test@test.com', password: 'test' },
            { username: 'test@test.com', password: 'test' },
            { username: 'test', password: 'test' },
            { email: 'test@test.com', password: 'test', username: 'test@test.com' }
        ];
        
        for (let i = 0; i < testPayloads.length; i++) {
            const payload = testPayloads[i];
            try {
                this.logDebug(`Test ${i + 1}: ${JSON.stringify(payload)}`);
                
                const response = await fetch(CONFIG.ENDPOINTS.AUTH_LOGIN, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();
                this.logDebug(`Response ${i + 1}: ${response.status} - ${JSON.stringify(data)}`);
                
                if (response.status === 400) {
                    // This might give us clues about what fields are expected
                    this.logDebug(`400 error details: ${JSON.stringify(data)}`);
                }
            } catch (error) {
                this.logDebug(`Error ${i + 1}: ${error.message}`);
            }
        }
        
        this.logDebug('=== SOLUTIONS ===');
        this.logDebug('1. Click "Create Demo User" to try automatic user creation');
        this.logDebug('2. Try manual signup through the UI');
        this.logDebug('3. Access your Django admin panel to create a user manually');
        this.logDebug('4. Check if your backend has user registration enabled');
        this.logDebug('5. Try the "Test Login" button to see detailed login attempts');
    }
    
    // Utility Methods
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${Math.floor(diffInHours)} hours ago`;
        } else if (diffInHours < 168) {
            return `${Math.floor(diffInHours / 24)} days ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    formatContent(content) {
        // Simple content formatting - you might want to use a proper markdown parser
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }
    
    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 5px;
            z-index: 3000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Remove after duration
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, CONFIG.TOAST_DURATION);
    }
}

// Initialize the application
const app = new StackItApp();

// Add CSS animations for toast
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style); 