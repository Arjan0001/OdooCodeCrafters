// StackIt Q&A Platform - Main Application
class StackItApp {
    constructor() {
        this.currentUser = null;
        this.questions = [];
        this.currentPage = 1;
        this.questionsPerPage = 10;
        this.currentFilter = 'newest';
        this.searchQuery = '';
        
        this.init();
    }

    init() {
        this.loadUserFromStorage();
        this.setupEventListeners();
        this.loadQuestions();
        this.updateUI();
    }

    // Authentication Methods
    loadUserFromStorage() {
        const userData = localStorage.getItem('stackit_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    saveUserToStorage(user) {
        localStorage.setItem('stackit_user', JSON.stringify(user));
    }

    login(email, password) {
        // TODO: Add login API here
        console.log('Login attempt:', { email, password });
        
        // Simulate login for demo
        const user = {
            id: Date.now(),
            email: email,
            username: email.split('@')[0],
            avatar: null
        };
        
        this.currentUser = user;
        this.saveUserToStorage(user);
        this.updateUI();
        this.closeModal('loginModal');
        
        // Show success message
        this.showNotification('Login successful!', 'success');
    }

    signup(username, email, password) {
        // TODO: Add signup API here
        console.log('Signup attempt:', { username, email, password });
        
        // Simulate signup for demo
        const user = {
            id: Date.now(),
            username: username,
            email: email,
            avatar: null
        };
        
        this.currentUser = user;
        this.saveUserToStorage(user);
        this.updateUI();
        this.closeModal('signupModal');
        
        // Show success message
        this.showNotification('Account created successfully!', 'success');
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('stackit_user');
        this.updateUI();
        this.showNotification('Logged out successfully!', 'info');
    }

    // Question Management
    loadQuestions() {
        // Simulate loading questions
        this.questions = this.getMockQuestions();
        this.renderQuestions();
    }

    getMockQuestions() {
        return [
            {
                id: 1,
                title: "How to implement responsive design with CSS Grid?",
                content: "I'm trying to create a responsive layout using CSS Grid. What are the best practices for making it work well on all screen sizes?",
                author: "john_doe",
                authorId: 1,
                tags: ["css", "responsive-design", "css-grid"],
                votes: 15,
                answers: 3,
                createdAt: new Date(Date.now() - 86400000), // 1 day ago
                isAnswered: true
            },
            {
                id: 2,
                title: "React hooks vs class components performance comparison",
                content: "I'm debating whether to refactor my class components to use hooks. Has anyone done performance testing to compare the two approaches?",
                author: "react_dev",
                authorId: 2,
                tags: ["react", "javascript", "performance"],
                votes: 8,
                answers: 1,
                createdAt: new Date(Date.now() - 172800000), // 2 days ago
                isAnswered: false
            },
            {
                id: 3,
                title: "Best practices for API error handling in JavaScript",
                content: "What are the recommended patterns for handling API errors in JavaScript applications? I'm looking for both frontend and backend approaches.",
                author: "api_guru",
                authorId: 3,
                tags: ["javascript", "api", "error-handling"],
                votes: 22,
                answers: 5,
                createdAt: new Date(Date.now() - 259200000), // 3 days ago
                isAnswered: true
            },
            {
                id: 4,
                title: "How to optimize images for web performance?",
                content: "My website is loading slowly due to large images. What are the best tools and techniques for optimizing images for web use?",
                author: "web_optimizer",
                authorId: 4,
                tags: ["performance", "images", "web-optimization"],
                votes: 12,
                answers: 2,
                createdAt: new Date(Date.now() - 345600000), // 4 days ago
                isAnswered: false
            },
            {
                id: 5,
                title: "TypeScript vs JavaScript for large projects",
                content: "I'm starting a new large-scale project and considering TypeScript. What are the pros and cons for enterprise applications?",
                author: "ts_advocate",
                authorId: 5,
                tags: ["typescript", "javascript", "enterprise"],
                votes: 18,
                answers: 4,
                createdAt: new Date(Date.now() - 432000000), // 5 days ago
                isAnswered: true
            }
        ];
    }

    renderQuestions() {
        const container = document.getElementById('questionsContainer');
        const loadingState = document.getElementById('loadingState');
        const emptyState = document.getElementById('emptyState');
        
        // Hide loading state
        loadingState.style.display = 'none';
        
        let filteredQuestions = this.filterQuestions();
        
        if (filteredQuestions.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }
        
        emptyState.style.display = 'none';
        
        const startIndex = (this.currentPage - 1) * this.questionsPerPage;
        const endIndex = startIndex + this.questionsPerPage;
        const pageQuestions = filteredQuestions.slice(startIndex, endIndex);
        
        container.innerHTML = pageQuestions.map(question => this.renderQuestionCard(question)).join('');
        
        this.updatePagination(filteredQuestions.length);
        this.updateQuestionCount(filteredQuestions.length);
    }

    renderQuestionCard(question) {
        const timeAgo = this.getTimeAgo(question.createdAt);
        const tags = question.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        
        return `
            <div class="question-card" data-question-id="${question.id}">
                <div class="question-title">${question.title}</div>
                <div class="question-preview">${this.truncateText(question.content, 150)}</div>
                <div class="question-meta">
                    <div class="question-tags">${tags}</div>
                    <div class="question-info">
                        <div class="question-author">
                            <i class="fas fa-user"></i>
                            ${question.author}
                        </div>
                        <div class="question-stats">
                            <div class="stat">
                                <i class="fas fa-thumbs-up"></i>
                                ${question.votes}
                            </div>
                            <div class="stat">
                                <i class="fas fa-comments"></i>
                                ${question.answers}
                            </div>
                            <div class="stat">
                                <i class="fas fa-clock"></i>
                                ${timeAgo}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    filterQuestions() {
        let filtered = [...this.questions];
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(q => 
                q.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                q.content.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                q.tags.some(tag => tag.toLowerCase().includes(this.searchQuery.toLowerCase()))
            );
        }
        
        // Apply filter
        switch (this.currentFilter) {
            case 'newest':
                filtered.sort((a, b) => b.createdAt - a.createdAt);
                break;
            case 'unanswered':
                filtered = filtered.filter(q => !q.isAnswered);
                break;
            case 'popular':
                filtered.sort((a, b) => b.votes - a.votes);
                break;
        }
        
        return filtered;
    }

    // Question Detail Methods
    loadQuestionDetail(questionId) {
        const question = this.questions.find(q => q.id == questionId);
        if (!question) return;
        
        const content = document.getElementById('questionDetailContent');
        content.innerHTML = this.renderQuestionDetail(question);
        
        this.openModal('questionDetailModal');
        document.getElementById('questionBreadcrumb').textContent = question.title;
    }

    renderQuestionDetail(question) {
        const timeAgo = this.getTimeAgo(question.createdAt);
        const tags = question.tags.map(tag => `<span class="tag">${tag}</span>`).join('');
        
        return `
            <div class="question-detail-header">
                <div class="question-detail-title">${question.title}</div>
                <div class="question-detail-meta">
                    <div class="question-detail-tags">${tags}</div>
                    <div class="question-detail-info">
                        <div class="question-author">
                            <i class="fas fa-user"></i>
                            ${question.author}
                        </div>
                        <div class="stat">
                            <i class="fas fa-clock"></i>
                            ${timeAgo}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="voting-section">
                <div class="vote-buttons">
                    <button class="vote-btn" onclick="app.voteQuestion(${question.id}, 1)">
                        <i class="fas fa-chevron-up"></i>
                    </button>
                    <div class="vote-count">${question.votes}</div>
                    <button class="vote-btn" onclick="app.voteQuestion(${question.id}, -1)">
                        <i class="fas fa-chevron-down"></i>
                    </button>
                </div>
                <div class="question-detail-content-text">
                    ${this.formatContent(question.content)}
                </div>
            </div>
            
            <div class="answers-section">
                <div class="answers-header">
                    <h3>Answers (${question.answers})</h3>
                    <button class="btn-primary" onclick="app.showAnswerForm()">
                        <i class="fas fa-plus"></i> Submit Answer
                    </button>
                </div>
                <div class="answers-list">
                    ${this.renderAnswers(question.id)}
                </div>
            </div>
        `;
    }

    renderAnswers(questionId) {
        // Mock answers
        const answers = [
            {
                id: 1,
                content: "Here's a comprehensive guide to implementing responsive design with CSS Grid...",
                author: "css_expert",
                votes: 8,
                createdAt: new Date(Date.now() - 43200000)
            },
            {
                id: 2,
                content: "I recommend using CSS Grid with media queries for the best responsive experience...",
                author: "frontend_dev",
                votes: 5,
                createdAt: new Date(Date.now() - 86400000)
            }
        ];
        
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
                        ${answer.author}
                    </div>
                    <div class="answer-voting">
                        <button class="vote-btn" onclick="app.voteAnswer(${answer.id}, 1)">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <span class="vote-count">${answer.votes}</span>
                        <button class="vote-btn" onclick="app.voteAnswer(${answer.id}, -1)">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Voting Methods
    voteQuestion(questionId, voteValue) {
        if (!this.currentUser) {
            this.showLoginPrompt();
            return;
        }
        
        // TODO: Add vote API here
        console.log('Voting on question:', questionId, voteValue);
        
        const question = this.questions.find(q => q.id == questionId);
        if (question) {
            question.votes += voteValue;
            this.renderQuestions();
            this.showNotification('Vote recorded!', 'success');
        }
    }

    voteAnswer(answerId, voteValue) {
        if (!this.currentUser) {
            this.showLoginPrompt();
            return;
        }
        
        // TODO: Add vote API here
        console.log('Voting on answer:', answerId, voteValue);
        this.showNotification('Vote recorded!', 'success');
    }

    // Question Creation
    createQuestion(title, content, tags) {
        if (!this.currentUser) {
            this.showLoginPrompt();
            return;
        }
        
        // TODO: Add create question API call here
        console.log('Creating question:', { title, content, tags });
        
        const newQuestion = {
            id: Date.now(),
            title: title,
            content: content,
            author: this.currentUser.username,
            authorId: this.currentUser.id,
            tags: tags.split(',').map(tag => tag.trim()),
            votes: 0,
            answers: 0,
            createdAt: new Date(),
            isAnswered: false
        };
        
        this.questions.unshift(newQuestion);
        this.renderQuestions();
        this.closeModal('askQuestionModal');
        this.showNotification('Question submitted successfully!', 'success');
    }

    // Utility Methods
    getTimeAgo(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }

    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    formatContent(content) {
        // Simple content formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>');
    }

    updateUI() {
        const userMenu = document.getElementById('userMenu');
        const avatarBtn = document.getElementById('avatarBtn');
        const mobileLoginBtn = document.getElementById('mobileLoginBtn');
        
        if (this.currentUser) {
            userMenu.style.display = 'block';
            mobileLoginBtn.textContent = this.currentUser.username;
            mobileLoginBtn.href = '#';
        } else {
            userMenu.style.display = 'none';
            mobileLoginBtn.textContent = 'Login';
            mobileLoginBtn.href = '#';
        }
    }

    updateQuestionCount(count) {
        document.getElementById('questionCount').textContent = `${count} questions`;
    }

    updatePagination(totalQuestions) {
        const totalPages = Math.ceil(totalQuestions / this.questionsPerPage);
        const paginationNumbers = document.getElementById('paginationNumbers');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        
        prevBtn.disabled = this.currentPage === 1;
        nextBtn.disabled = this.currentPage === totalPages;
        
        let paginationHTML = '';
        for (let i = 1; i <= totalPages; i++) {
            const isActive = i === this.currentPage;
            paginationHTML += `<div class="page-number ${isActive ? 'active' : ''}" onclick="app.goToPage(${i})">${i}</div>`;
        }
        
        paginationNumbers.innerHTML = paginationHTML;
    }

    goToPage(page) {
        this.currentPage = page;
        this.renderQuestions();
    }

    // Modal Management
    openModal(modalId) {
        document.getElementById(modalId).classList.add('show');
    }

    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
    }

    showLoginPrompt() {
        this.openModal('loginModal');
        this.showNotification('Please login to perform this action', 'info');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#007bff'};
            color: white;
            padding: 1rem;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 3000;
            max-width: 300px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
        
        // Close button functionality
        notification.querySelector('.notification-close').onclick = () => {
            notification.parentNode.removeChild(notification);
        };
    }

    // Rich Text Editor
    setupRichTextEditor() {
        const toolbar = document.querySelector('.rich-text-toolbar');
        const editor = document.getElementById('questionDescription');
        
        toolbar.addEventListener('click', (e) => {
            if (e.target.classList.contains('toolbar-btn')) {
                e.preventDefault();
                const command = e.target.dataset.command;
                
                if (command === 'createLink') {
                    const url = prompt('Enter URL:');
                    if (url) document.execCommand(command, false, url);
                } else if (command === 'insertImage') {
                    const url = prompt('Enter image URL:');
                    if (url) document.execCommand(command, false, url);
                } else {
                    document.execCommand(command, false, null);
                }
                
                e.target.classList.toggle('active');
            }
        });
    }

    // Event Listeners
    setupEventListeners() {
        // Header interactions
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            document.getElementById('mobileMenu').classList.toggle('show');
        });

        document.getElementById('avatarBtn').addEventListener('click', () => {
            document.getElementById('dropdownMenu').classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.user-menu')) {
                document.getElementById('dropdownMenu').classList.remove('show');
            }
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.currentPage = 1;
            this.renderQuestions();
        });

        // Filter functionality
        document.getElementById('filterSelect').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.currentPage = 1;
            this.renderQuestions();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.closeModal(modal.id);
            });
        });

        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            this.login(email, password);
        });

        // Signup form
        document.getElementById('signupForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('signupUsername').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            this.signup(username, email, password);
        });

        // Ask question form
        document.getElementById('askQuestionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('questionTitle').value;
            const content = document.getElementById('questionDescription').innerHTML;
            const tags = document.getElementById('questionTags').value;
            this.createQuestion(title, content, tags);
        });

        // Modal navigation
        document.getElementById('showSignupLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal('loginModal');
            this.openModal('signupModal');
        });

        document.getElementById('showLoginLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal('signupModal');
            this.openModal('loginModal');
        });

        // Ask question button
        document.getElementById('askQuestionBtn').addEventListener('click', () => {
            if (!this.currentUser) {
                this.showLoginPrompt();
                return;
            }
            this.openModal('askQuestionModal');
        });

        // Question card clicks
        document.addEventListener('click', (e) => {
            const questionCard = e.target.closest('.question-card');
            if (questionCard) {
                const questionId = questionCard.dataset.questionId;
                this.loadQuestionDetail(questionId);
            }
        });

        // Logout
        document.getElementById('logoutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Back to home
        document.getElementById('backToHome').addEventListener('click', (e) => {
            e.preventDefault();
            this.closeModal('questionDetailModal');
        });

        // Mobile login button
        document.getElementById('mobileLoginBtn').addEventListener('click', (e) => {
            e.preventDefault();
            if (!this.currentUser) {
                this.openModal('loginModal');
            }
        });

        // Setup rich text editor
        this.setupRichTextEditor();
    }
}

// Initialize the app
const app = new StackItApp(); 