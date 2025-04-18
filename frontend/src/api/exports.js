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

// Export chat to Excel
export const exportChatToExcel = async (chatId, options = {}) => {
    try {
        const { includeConfidence = true, includeSources = true } = options;

        // Create URL with query parameters
        const url = `/exports/chat/${chatId}/excel?include_confidence=${includeConfidence}&include_sources=${includeSources}`;

        // Use axios to get the file as a blob
        const response = await api.get(url, {
            responseType: 'blob',
        });

        // Create a download link and trigger it
        const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = downloadUrl;

        // Try to get filename from response headers
        const contentDisposition = response.headers['content-disposition'];
        let filename = 'chat_export.xlsx';

        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch && filenameMatch.length === 2) {
                filename = filenameMatch[1];
            }
        }

        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);

        return true;
    } catch (error) {
        console.error('Error exporting chat:', error);
        throw new Error(
            error.response?.data?.detail ||
            'Failed to export chat to Excel'
        );
    }
};