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

// Fetch all documents
export const fetchDocuments = async () => {
    try {
        const response = await api.get('/documents');
        return response.data;
    } catch (error) {
        console.error('Error fetching documents:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to fetch documents'
        );
    }
};

// Upload a document
export const uploadDocument = async (formData) => {
    try {
        const response = await api.post('/documents/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading document:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to upload document'
        );
    }
};

// Delete a document
export const deleteDocument = async (documentId) => {
    try {
        const response = await api.delete(`/documents/${documentId}`);
        return response.data;
    } catch (error) {
        console.error('Error deleting document:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to delete document'
        );
    }
};

// Get document details
export const getDocumentDetails = async (documentId) => {
    try {
        const response = await api.get(`/documents/${documentId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching document details:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to fetch document details'
        );
    }
};

// Update document
export const updateDocument = async (documentId, data) => {
    try {
        const response = await api.put(`/documents/${documentId}`, data);
        return response.data;
    } catch (error) {
        console.error('Error updating document:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to update document'
        );
    }
};
