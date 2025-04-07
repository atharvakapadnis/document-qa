import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

// Setup axios instance with auth header
const api = axios.create({
    baseURL: `${API_URL}${API_PREFIX}`,
});

// Add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Send a query to the backend
export const sendQuery = async (queryData) => {
    try {
        const response = await api.post('/queries', queryData);
        return response.data;
    } catch (error) {
        console.error('Error sending query:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to process query'
        );
    }
};