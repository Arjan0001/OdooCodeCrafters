# StackIt - Q&A Platform

A modern Q&A platform built with HTML, CSS, and JavaScript that connects to a Django REST API backend.

## Features

### 🔐 Authentication
- User registration and login
- JWT token-based authentication
- Secure token storage in localStorage
- Automatic session management

### 📝 Questions & Answers
- Browse and search questions
- Ask new questions with rich text editor
- View question details with answers
- Filter questions by newest, popular, or unanswered
- Pagination support

### 👍 Voting System
- Vote on questions and answers
- Real-time vote count updates
- Authentication required for voting

### 🎨 Rich Text Editor
- Bold, italic, and list formatting
- Link and image insertion
- Content formatting for questions and answers

### 📱 Responsive Design
- Mobile-friendly interface
- Collapsible mobile menu
- Touch-friendly controls

### 🔔 Notifications
- Toast notifications for user feedback
- Success, error, and info message types

## API Endpoints

The application connects to the following API endpoints:

- **Questions**: `https://odoocodecrafters.onrender.com/api/questions/`
- **Answers**: `https://odoocodecrafters.onrender.com/api/answers/`
- **Votes**: `https://odoocodecrafters.onrender.com/api/votes/`
- **Notifications**: `https://odoocodecrafters.onrender.com/api/notifications/`
- **Authentication**: `https://odoocodecrafters.onrender.com/api/auth/login/`

## How to Use

1. **Open the application**: Simply open `index.html` in your web browser
2. **Browse questions**: View the latest questions on the homepage
3. **Search and filter**: Use the search bar and filter dropdown to find specific questions
4. **Login/Register**: Click the user icon to access authentication modals
5. **Ask a question**: Click "Ask Question" button (requires login)
6. **View details**: Click on any question card to see full details and answers
7. **Vote**: Use the voting buttons on questions and answers (requires login)
8. **Add answers**: Submit answers to questions (requires login)

## File Structure

```
├── index.html          # Main HTML file
├── styles.css          # CSS styles and responsive design
├── config.js           # Configuration and API utilities
├── app.js             # Main application logic
└── README.md          # This file
```

## Key Features Implementation

### Authentication Flow
- JWT tokens stored in localStorage
- Automatic token refresh handling
- Protected routes and actions

### Question Management
- CRUD operations for questions
- Rich text content support
- Tag system for categorization

### Voting System
- Upvote/downvote functionality
- Real-time vote count updates
- User authentication required

### Responsive UI
- Mobile-first design approach
- Collapsible navigation
- Touch-friendly interactions

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development Notes

- The application uses modern JavaScript (ES6+) features
- No external dependencies required
- Font Awesome icons for UI elements
- Local storage for session management

## API Integration

The application expects the backend API to support:

1. **Authentication endpoints** with JWT tokens
2. **Questions endpoint** with pagination and filtering
3. **Answers endpoint** for question responses
4. **Votes endpoint** for voting functionality
5. **Proper CORS headers** for cross-origin requests

All API requests include proper authentication headers and error handling. 