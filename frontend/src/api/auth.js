import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

// Login user
export const login = async (credentials) => {
    try {
        // First, get the token
        const tokenResponse = await axios.post(`${API_URL}${API_PREFIX}/auth/token`,
            new URLSearchParams({
                username: credentials.username,
                password: credentials.password
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // Store token in localStorage
        localStorage.setItem('token', tokenResponse.data.access_token);

        // Get user info
        const userResponse = await axios.get(`${API_URL}${API_PREFIX}/auth/me`, {
            headers: {
                Authorization: `Bearer ${tokenResponse.data.access_token}`
            }
        });

        return userResponse.data;
    } catch (error) {
        console.error('Login error:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Invalid username or password'
        );
    }
};

// Register user
export const register = async (userData) => {
    try {
        const response = await axios.post(`${API_URL}${API_PREFIX}/auth/register`, userData);
        return response.data;
    } catch (error) {
        console.error('Registration error:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Registration failed'
        );
    }
};

// Logout user
export const logout = () => {
    localStorage.removeItem('token');
};