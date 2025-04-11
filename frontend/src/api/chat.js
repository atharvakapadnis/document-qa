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

// Fetch all chats
export const fetchChats = async () => {
    try {
        const response = await api.get('/chats');
        return response.data;
    } catch (error) {
        console.error('Error fetching chats:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to fetch chats'
        );
    }
};

// Fetch a specific chat
export const fetchChat = async (chatId) => {
    try {
        const response = await api.get(`/chats/${chatId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching chat:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to fetch chat'
        );
    }
};

// Create a new chat
export const createChat = async (chatData) => {
    try {
        const response = await api.post('/chats', chatData);
        return response.data;
    } catch (error) {
        console.error('Error creating chat:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to create chat'
        );
    }
};

// Update a chat
export const updateChat = async (chatId, chatData) => {
    try {
        const response = await api.put(`/chats/${chatId}`, chatData);
        return response.data;
    } catch (error) {
        console.error('Error updating chat:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to update chat'
        );
    }
};

// Delete a chat
export const deleteChat = async (chatId) => {
    try {
        const response = await api.delete(`/chats/${chatId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting chat:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to delete chat'
        );
    }
};

// Add a message to a chat
export const addMessage = async (chatId, message) => {
    try {
        const response = await api.post(`/chats/${chatId}/messages`, message);
        return response.data;
    } catch (error) {
        console.error('Error adding message:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to add message'
        );
    }
};

// Delete a message from a chat
export const deleteMessage = async (chatId, messageId) => {
    try {
        const response = await api.delete(`/chats/${chatId}/messages/${messageId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting message:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to delete message'
        );
    }
};

// Get chat count
export const getChatCount = async () => {
    try {
        const response = await api.get('/chats/count');
        return response.data;
    } catch (error) {
        console.error('Error getting chat count:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to get chat count'
        );
    }
};