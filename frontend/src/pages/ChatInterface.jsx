import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import {
    Box, Flex, VStack, Input, Button, Text, Heading, Spinner,
    useToast, Tag, Avatar, IconButton, Divider, Select, Card, CardBody,
    useColorMode
} from '@chakra-ui/react';
import { FiSend, FiFile } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { fetchDocuments } from '../api/documents';
import { sendQuery } from '../api/queries';
import QueryVisualizer from '../components/QueryVisualizer';

// CSS for the markdown content to properly style bullets and lists
const markdownStyles = {
    light: {
        color: 'black',
        '& ul, & ol': {
            paddingLeft: '2rem',
            marginBottom: '1rem',
        },
        '& li': {
            marginBottom: '0.5rem',
            color: 'gray.800',
        },
        '& p': {
            marginBottom: '0.5rem',
            color: 'gray.800',
        },
        '& strong': {
            fontWeight: 'bold',
            color: 'gray.900',
        },
        '& a': {
            color: 'blue.500',
            textDecoration: 'underline',
        },
        '& blockquote': {
            borderLeftWidth: '4px',
            borderLeftColor: 'gray.200',
            paddingLeft: '1rem',
            fontStyle: 'italic',
            color: 'gray.700',
        },
        '& code': {
            backgroundColor: 'gray.100',
            padding: '0.2rem',
            borderRadius: '0.2rem',
            fontFamily: 'monospace',
            color: 'gray.800',
        },
    },
    dark: {
        color: 'white',
        '& ul, & ol': {
            paddingLeft: '2rem',
            marginBottom: '1rem',
        },
        '& li': {
            marginBottom: '0.5rem',
            color: 'gray.200',
        },
        '& p': {
            marginBottom: '0.5rem',
            color: 'gray.200',
        },
        '& strong': {
            fontWeight: 'bold',
            color: 'white',
        },
        '& a': {
            color: 'blue.300',
            textDecoration: 'underline',
        },
        '& blockquote': {
            borderLeftWidth: '4px',
            borderLeftColor: 'gray.600',
            paddingLeft: '1rem',
            fontStyle: 'italic',
            color: 'gray.300',
        },
        '& code': {
            backgroundColor: 'gray.700',
            padding: '0.2rem',
            borderRadius: '0.2rem',
            fontFamily: 'monospace',
            color: 'gray.200',
        },
    },
};

function ChatInterface() {
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const messagesEndRef = useRef(null);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [isQuerying, setIsQuerying] = useState(false);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const { colorMode } = useColorMode();

    // Fetch user's documents
    const { data: documents, isLoading: isLoadingDocs } = useQuery(
        'documents',
        fetchDocuments
    );

    // Check if a document ID is specified in the URL
    useEffect(() => {
        const docId = searchParams.get('doc');
        if (docId) {
            setSelectedDocs([docId]);
        }
    }, [searchParams]);

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Handle document selection
    const handleDocumentSelect = (e) => {
        const value = e.target.value;
        if (value && !selectedDocs.includes(value)) {
            setSelectedDocs([...selectedDocs, value]);
        }
    };

    // Remove a document from selection
    const handleRemoveDocument = (docId) => {
        setSelectedDocs(selectedDocs.filter(id => id !== docId));
    };

    // Send a query to the backend
    const handleSendQuery = async (e) => {
        e.preventDefault();

        if (!query.trim()) return;

        // Add user message
        const userMessage = {
            id: Date.now(),
            sender: 'user',
            text: query,
            timestamp: new Date().toISOString(),
        };
        setMessages(prevMessages => [...prevMessages, userMessage]);

        // Clear input
        setQuery('');
        setIsQuerying(true);

        try {
            const response = await sendQuery({
                query: userMessage.text,
                document_ids: selectedDocs.length > 0 ? selectedDocs : undefined
            });

            // Add system message with response
            const systemMessage = {
                id: Date.now() + 1,
                sender: 'system',
                text: response.answer,
                sources: response.sources,
                confidence: response.confidence,
                query_time_seconds: response.query_time_seconds,
                timestamp: new Date().toISOString(),
            };

            setMessages(prevMessages => [...prevMessages, systemMessage]);
        } catch (error) {
            console.error("Error sending query:", error);

            // Add error message
            const errorMessage = {
                id: Date.now() + 1,
                sender: 'system',
                text: 'Sorry, there was an error processing your query. Please try again.',
                error: true,
                timestamp: new Date().toISOString(),
            };

            setMessages(prevMessages => [...prevMessages, errorMessage]);

            toast({
                title: 'Error',
                description: error.message || 'Failed to get an answer. Please try again.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsQuerying(false);
        }
    };

    // Get document name by ID
    const getDocumentNameById = (docId) => {
        const doc = documents?.find(d => d.doc_id === docId);
        return doc ? doc.filename : docId;
    };

    return (
        <Box h="calc(100vh - 80px)" display="flex" flexDirection="column">
            {/* Document selection */}
            <Box
                p={4}
                bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                borderBottomWidth={1}
                borderBottomColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
                <Heading
                    size="sm"
                    mb={2}
                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                >
                    Active Documents
                </Heading>
                <Flex alignItems="center" mb={2}>
                    <Select
                        placeholder="Select documents to query"
                        onChange={handleDocumentSelect}
                        disabled={isLoadingDocs}
                        flex="1"
                        mr={2}
                        bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                        _hover={{
                            borderColor: colorMode === 'dark' ? 'blue.300' : 'blue.500'
                        }}
                    >
                        {documents?.map(doc => (
                            <option key={doc.doc_id} value={doc.doc_id}>
                                {doc.filename}
                            </option>
                        ))}
                    </Select>
                </Flex>

                <Flex wrap="wrap" gap={2}>
                    {selectedDocs.length === 0 ? (
                        <Text
                            fontSize="sm"
                            color={colorMode === 'dark' ? 'gray.300' : 'gray.500'}
                        >
                            No documents selected. All documents will be queried.
                        </Text>
                    ) : (
                        selectedDocs.map(docId => (
                            <Tag
                                key={docId}
                                size="md"
                                colorScheme="blue"
                                borderRadius="full"
                            >
                                {getDocumentNameById(docId)}
                                <Button
                                    size="xs"
                                    ml={1}
                                    onClick={() => handleRemoveDocument(docId)}
                                    variant="ghost"
                                >
                                    ×
                                </Button>
                            </Tag>
                        ))
                    )}
                </Flex>
            </Box>

            {/* Chat messages */}
            <VStack
                flex="1"
                overflowY="auto"
                spacing={4}
                p={4}
                align="stretch"
                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
            >
                {messages.length === 0 ? (
                    <Flex
                        direction="column"
                        justify="center"
                        align="center"
                        h="100%"
                        textAlign="center"
                    >
                        <Heading
                            size="md"
                            mb={2}
                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                        >
                            Ask questions about your documents
                        </Heading>
                        <Text color={colorMode === 'dark' ? 'gray.300' : 'gray.500'}>
                            Start by typing a question about your uploaded documents.
                        </Text>
                    </Flex>
                ) : (
                    messages.map((message) => (
                        <Flex
                            key={message.id}
                            justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                        >
                            <Box
                                maxW="80%"
                                bg={message.sender === 'user' ? 'blue.500' : (colorMode === 'dark' ? 'gray.700' : 'white')}
                                color={message.sender === 'user' ? 'white' : (colorMode === 'dark' ? 'white' : 'black')}
                                p={3}
                                borderRadius="lg"
                                boxShadow="md"
                                borderWidth={message.sender === 'user' ? 0 : 1}
                                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                            >
                                <Flex align="center" mb={2}>
                                    <Avatar
                                        size="xs"
                                        name={message.sender === 'user' ? 'User' : 'AI Assistant'}
                                        mr={2}
                                        bg={message.sender === 'user' ? 'blue.700' : 'gray.300'}
                                    />
                                    <Text fontWeight="bold">
                                        {message.sender === 'user' ? 'You' : 'AI Assistant'}
                                    </Text>
                                    {message.confidence !== undefined && (
                                        <Tag
                                            size="sm"
                                            ml={2}
                                            colorScheme={message.confidence > 0.7 ? 'green' : 'yellow'}
                                        >
                                            {(message.confidence * 100).toFixed(0)}% confident
                                        </Tag>
                                    )}
                                </Flex>

                                <Box
                                    className="message-content"
                                    sx={colorMode === 'dark' ? markdownStyles.dark : markdownStyles.light}
                                >
                                    <ReactMarkdown>
                                        {message.text}
                                    </ReactMarkdown>
                                </Box>

                                {message.sources && message.sources.length > 0 && (
                                    <Box
                                        mt={3}
                                        pt={2}
                                        borderTopWidth={1}
                                        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                    >
                                        <Text fontSize="xs" fontWeight="bold" mb={1} color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                            Sources:
                                        </Text>
                                        {message.sources.map((source, index) => (
                                            <Text
                                                key={index}
                                                fontSize="xs"
                                                color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                                            >
                                                {source.filename}
                                                {source.page && ` - Page ${source.page}`}
                                            </Text>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Flex>
                    ))
                )}
                {messages.length > 0 &&
                    messages[messages.length - 1].sender === 'system' &&
                    !messages[messages.length - 1].error && (
                        <QueryVisualizer
                            sources={messages[messages.length - 1].sources || []}
                            confidence={messages[messages.length - 1].confidence || 0}
                            queryTime={messages[messages.length - 1].query_time_seconds || 0}
                        />
                    )}
                <div ref={messagesEndRef} />
            </VStack>

            {/* Input area */}
            <Box
                p={4}
                borderTopWidth={1}
                borderTopColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
            >
                <form onSubmit={handleSendQuery}>
                    <Flex>
                        <Input
                            placeholder="Ask a question about your documents..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            mr={2}
                            disabled={isQuerying}
                            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                            color={colorMode === 'dark' ? 'white' : 'black'}
                            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                            _hover={{
                                borderColor: colorMode === 'dark' ? 'blue.300' : 'blue.500'
                            }}
                            _focus={{
                                borderColor: 'blue.500',
                                boxShadow: colorMode === 'dark'
                                    ? '0 0 0 1px var(--chakra-colors-blue-500)'
                                    : '0 0 0 1px var(--chakra-colors-blue-500)'
                            }}
                        />
                        <Button
                            colorScheme="blue"
                            type="submit"
                            isLoading={isQuerying}
                            leftIcon={<FiSend />}
                            disabled={!query.trim()}
                        >
                            Send
                        </Button>
                    </Flex>
                </form>
            </Box>
        </Box>
    );
}

export default ChatInterface;