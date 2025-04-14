import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { mode } from '@chakra-ui/theme-tools'

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
import { ColorModeProvider } from './context/ColorModeContext';

// Create a custom theme with color mode support
const theme = extendTheme({
    config: {
        initialColorMode: 'dark',
        useSystemColorMode: false,
    },
    styles: {
        global: (props) => ({
            body: {
                bg: mode('white', 'gray.800')(props),
                color: mode('gray.800', 'whiteAlpha.900')(props),
            },
        }),
    },
    components: {
        Card: {
            baseStyle: (props) => ({
                container: {
                    bg: mode('white', 'gray.700')(props),
                },
            }),
        },
        Modal: {
            baseStyle: (props) => ({
                dialog: {
                    bg: mode('white', 'gray.800')(props),
                },
            }),
        },
    },
});

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
        <ChakraProvider theme={theme}>
            <ColorModeProvider>
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
                                    <Route path="chat/:chatId" element={<ChatInterface />} />
                                </Route>

                                {/* Redirect any other routes to dashboard */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Router>
                    </AuthProvider>
                </QueryClientProvider>
            </ColorModeProvider>
        </ChakraProvider>
    );
}

export default App;