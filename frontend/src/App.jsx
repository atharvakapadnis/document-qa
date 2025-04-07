import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from 'react-query';

// Pages
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import DocumentView from './pages/DocumentView';
import ChatInterface from './pages/ChatInterface';

// Components
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Context
import { AuthProvider } from './context/AuthContext';

// Create a client for React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

function App() {
    return (
        <ChakraProvider>
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <Router>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />

                            <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
                                <Route index element={<Dashboard />} />
                                <Route path="documents/:documentId" element={<DocumentView />} />
                                <Route path="chat" element={<ChatInterface />} />
                            </Route>
                        </Routes>
                    </Router>
                </AuthProvider>
            </QueryClientProvider>
        </ChakraProvider>
    );
}

export default App;