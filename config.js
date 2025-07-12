// Configuration file for StackIt application
const CONFIG = {
    // API Base URLs
    API_BASE_URL: 'https://odoocodecrafters.onrender.com',
    
    // API Endpoints
    ENDPOINTS: {
        QUESTIONS: 'https://odoocodecrafters.onrender.com/api/questions/',
        ANSWERS: 'https://odoocodecrafters.onrender.com/api/answers/',
        VOTES: 'https://odoocodecrafters.onrender.com/api/votes/',
        NOTIFICATIONS: 'https://odoocodecrafters.onrender.com/api/notifications/',
        AUTH_LOGIN: 'https://odoocodecrafters.onrender.com/api/auth/login/',
        AUTH_REFRESH: 'https://odoocodecrafters.onrender.com/api/auth/refresh/'
    },
    
    // Local Storage Keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'stackit_access_token',
        REFRESH_TOKEN: 'stackit_refresh_token',
        USER_DATA: 'stackit_user_data'
    },
    
    // Pagination
    ITEMS_PER_PAGE: 10,
    
    // UI Settings
    DEBOUNCE_DELAY: 300,
    TOAST_DURATION: 3000,
    
    // Default Headers
    DEFAULT_HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Utility function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
    return {
        ...CONFIG.DEFAULT_HEADERS,
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Utility function to handle API responses
async function handleApiResponse(response) {
    if (!response.ok) {
        let errorData = {};
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { message: `HTTP error! status: ${response.status}` };
        }
        
        // Log detailed error information for debugging
        console.error('API Error Response:', {
            status: response.status,
            statusText: response.statusText,
            url: response.url,
            errorData: errorData
        });
        
        // Handle different error response formats
        const errorMessage = errorData.message || 
                           errorData.detail || 
                           errorData.error || 
                           errorData.non_field_errors?.[0] ||
                           `HTTP error! status: ${response.status}`;
        
        throw new Error(errorMessage);
    }
    return response.json();
}

// Utility function to make API requests
async function apiRequest(url, options = {}) {
    const config = {
        headers: getAuthHeaders(),
        ...options
    };
    
    try {
        const response = await fetch(url, config);
        
        // If we get a 401 (Unauthorized), try to refresh the token
        if (response.status === 401) {
            console.log('Token expired, attempting to refresh...');
            const refreshed = await refreshToken();
            if (refreshed) {
                // Retry the request with the new token
                config.headers = getAuthHeaders();
                const retryResponse = await fetch(url, config);
                return await handleApiResponse(retryResponse);
            } else {
                // If refresh failed, redirect to login
                console.log('Token refresh failed, redirecting to login...');
                window.location.reload(); // This will clear tokens and show login
                throw new Error('Authentication failed. Please login again.');
            }
        }
        
        return await handleApiResponse(response);
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// Function to refresh the access token
async function refreshToken() {
    try {
        const refreshToken = localStorage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        if (!refreshToken) {
            return false;
        }
        
        const response = await fetch(CONFIG.ENDPOINTS.AUTH_REFRESH, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                refresh: refreshToken
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, data.access);
            console.log('Token refreshed successfully');
            return true;
        } else {
            console.log('Token refresh failed');
            // Clear invalid tokens
            localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
            return false;
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
} 