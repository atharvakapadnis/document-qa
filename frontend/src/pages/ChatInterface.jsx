import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    Box, Flex, VStack, Input, Button, Text, Heading, Spinner,
    useToast, Tag, Avatar, IconButton, Badge, useColorMode,
    Drawer, DrawerOverlay, DrawerContent, DrawerHeader,
    DrawerBody, DrawerCloseButton, useDisclosure, Tooltip, AlertDialog,
    AlertDialogBody, AlertDialogFooter, AlertDialogHeader, AlertDialogContent,
    AlertDialogOverlay, InputGroup, InputRightElement, Icon, HStack
} from '@chakra-ui/react';
import { FiSend, FiFile, FiMessageSquare, FiMenu, FiSave, FiPlus, FiEdit, FiChevronRight } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import { fetchDocuments } from '../api/documents';
import { sendQuery } from '../api/queries';
import {
    fetchChats, fetchChat, createChat, updateChat,
    deleteChat, addMessage, getChatCount
} from '../api/chats';
import QueryVisualizer from '../components/QueryVisualizer';
import ChatHistory from '../components/ChatHistory';

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
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const messagesEndRef = useRef(null);
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState([]);
    const [isQuerying, setIsQuerying] = useState(false);
    const [selectedDocs, setSelectedDocs] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [chatTitle, setChatTitle] = useState('New Chat');
    const [unsavedChanges, setUnsavedChanges] = useState(false);
    const { colorMode } = useColorMode();
    const {
        isOpen: isHistoryOpen,
        onOpen: onHistoryOpen,
        onClose: onHistoryClose
    } = useDisclosure();
    const {
        isOpen: isNewChatAlertOpen,
        onOpen: onNewChatAlertOpen,
        onClose: onNewChatAlertClose
    } = useDisclosure();
    const cancelRef = React.useRef();

    // Fetch documents from URL params or dashboard selection
    useEffect(() => {
        // Get selected documents from localStorage if available
        const savedDocs = localStorage.getItem('selectedDocuments');
        if (savedDocs) {
            try {
                const parsedDocs = JSON.parse(savedDocs);
                if (Array.isArray(parsedDocs) && parsedDocs.length > 0) {
                    setSelectedDocs(parsedDocs);
                }
            } catch (error) {
                console.error("Error parsing saved documents:", error);
            }
        }

        // Check URL params for document selection
        const docId = searchParams.get('doc');
        if (docId && !selectedDocs.includes(docId)) {
            setSelectedDocs(prev => [...prev, docId]);
        }

        // Check if a chat ID is specified in the URL
        const chatId = searchParams.get('chat');
        if (chatId) {
            setActiveChat(chatId);
        }
    }, [searchParams]);

    // Fetch user's documents
    const { data: documents, isLoading: isLoadingDocs } = useQuery(
        'documents',
        fetchDocuments
    );

    // Fetch chat count
    const { data: chatCountData } = useQuery(
        'chatCount',
        getChatCount
    );

    // Fetch chat data if we have an active chat
    const {
        data: chatData,
        isLoading: isLoadingChat,
        refetch: refetchChat
    } = useQuery(
        ['chat', activeChat],
        () => fetchChat(activeChat),
        {
            enabled: !!activeChat,
            onSuccess: (data) => {
                // Update messages state with fetched messages
                if (data.messages && Array.isArray(data.messages)) {
                    setMessages(data.messages);
                }

                // Update chat title
                setChatTitle(data.title || 'Unnamed Chat');

                // Update selected documents
                if (data.document_ids && Array.isArray(data.document_ids)) {
                    setSelectedDocs(data.document_ids);
                }

                setUnsavedChanges(false);
            },
            onError: (error) => {
                console.error("Error fetching chat:", error);
                toast({
                    title: 'Error loading chat',
                    description: error.message || 'Failed to load chat data',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    );

    // Create chat mutation
    const createChatMutation = useMutation(createChat, {
        onSuccess: (data) => {
            // Set the active chat to the newly created chat
            setActiveChat(data.chat_id);

            // Update the chat title
            setChatTitle(data.title || 'Unnamed Chat');

            // Update UI state
            setUnsavedChanges(false);

            // Invalidate relevant queries
            queryClient.invalidateQueries('chats');
            queryClient.invalidateQueries('chatCount');

            toast({
                title: 'Chat created',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        },
        onError: (error) => {
            console.error("Error creating chat:", error);
            toast({
                title: 'Error creating chat',
                description: error.message || 'Failed to create new chat',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    });

    // Update chat mutation
    const updateChatMutation = useMutation(
        (data) => updateChat(activeChat, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['chat', activeChat]);
                queryClient.invalidateQueries('chats');
                setUnsavedChanges(false);
                toast({
                    title: 'Chat updated',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            },
            onError: (error) => {
                console.error("Error updating chat:", error);
                toast({
                    title: 'Error updating chat',
                    description: error.message || 'Failed to update chat',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    );

    // Add message mutation
    const addMessageMutation = useMutation(
        ({ chatId, message }) => addMessage(chatId, message),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['chat', activeChat]);
            },
            onError: (error) => {
                console.error("Error adding message:", error);
                toast({
                    title: 'Error saving message',
                    description: error.message || 'Failed to save message',
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                });
            }
        }
    );

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Mark changes as unsaved when messages are updated
    useEffect(() => {
        if (activeChat && messages.length > 0) {
            setUnsavedChanges(true);
        }
    }, [messages, activeChat]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Get document name by ID
    const getDocumentNameById = (docId) => {
        const doc = documents?.find(d => d.doc_id === docId);
        return doc ? doc.filename : docId;
    };

    // Send a query to the backend
    const handleSendQuery = async (e) => {
        e.preventDefault();

        if (!query.trim()) return;

        // Add user message
        const userMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: query,
            timestamp: new Date().toISOString(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);

        // Clear input
        setQuery('');
        setIsQuerying(true);

        try {
            // If we don't have an active chat, create one
            if (!activeChat) {
                // Use the first few words of the query as the chat title
                const defaultTitle = query.split(' ').slice(0, 4).join(' ') + '...';

                const chatData = await createChatMutation.mutateAsync({
                    title: defaultTitle,
                    document_ids: selectedDocs,
                    messages: [userMessage]  // Include the first message
                });

                // Chat is now created, update activeChat
                const newChatId = chatData.chat_id;

                // System response will be added to this chat
                const response = await sendQuery({
                    query: userMessage.text,
                    document_ids: selectedDocs.length > 0 ? selectedDocs : undefined
                });

                // Add system message with response
                const systemMessage = {
                    id: (Date.now() + 1).toString(),
                    sender: 'system',
                    text: response.answer,
                    sources: response.sources,
                    confidence: response.confidence,
                    query_time_seconds: response.query_time_seconds,
                    timestamp: new Date().toISOString(),
                };

                // Add system message to the new chat
                await addMessageMutation.mutateAsync({
                    chatId: newChatId,
                    message: systemMessage
                });

                // Update local messages state
                setMessages([...newMessages, systemMessage]);

            } else {
                // We have an active chat, add the user message to it
                await addMessageMutation.mutateAsync({
                    chatId: activeChat,
                    message: userMessage
                });

                // Get system response
                const response = await sendQuery({
                    query: userMessage.text,
                    document_ids: selectedDocs.length > 0 ? selectedDocs : undefined
                });

                // Add system message with response
                const systemMessage = {
                    id: (Date.now() + 1).toString(),
                    sender: 'system',
                    text: response.answer,
                    sources: response.sources,
                    confidence: response.confidence,
                    query_time_seconds: response.query_time_seconds,
                    timestamp: new Date().toISOString(),
                };

                // Add system message to the active chat
                await addMessageMutation.mutateAsync({
                    chatId: activeChat,
                    message: systemMessage
                });

                // Update local messages state
                setMessages([...newMessages, systemMessage]);
            }

        } catch (error) {
            console.error("Error sending query:", error);

            // Add error message
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'system',
                text: 'Sorry, there was an error processing your query. Please try again.',
                error: true,
                timestamp: new Date().toISOString(),
            };

            setMessages([...newMessages, errorMessage]);

            if (activeChat) {
                addMessageMutation.mutate({
                    chatId: activeChat,
                    message: errorMessage
                });
            }

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

    // Create a new chat
    const handleCreateChat = async () => {
        const willExceedLimit = (chatCountData?.total || 0) >= 5;

        if (willExceedLimit) {
            onNewChatAlertOpen();
            return;
        }

        await createNewChat();
    };

    // Create new chat helper
    const createNewChat = async (title = "New Chat") => {
        try {
            await createChatMutation.mutateAsync({
                title,
                document_ids: selectedDocs,
                messages: []
            });

            // Clear messages for the new chat
            setMessages([]);
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to create new chat',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Handle new chat after limit warning
    const handleProceedWithNewChat = () => {
        onNewChatAlertClose();
        createNewChat();
    };

    // Save current chat
    const handleSaveChat = async () => {
        if (!activeChat) {
            // Create new chat if none exists
            handleCreateChat();
            return;
        }

        try {
            await updateChatMutation.mutateAsync({
                title: chatTitle,
                document_ids: selectedDocs
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to save chat',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    };

    // Select a chat from history
    const handleSelectChat = (chatId) => {
        // Check for unsaved changes
        if (unsavedChanges && messages.length > 0) {
            if (window.confirm('You have unsaved changes. Do you want to save them before switching chats?')) {
                handleSaveChat();
            }
        }

        setActiveChat(chatId);
        onHistoryClose();
    };

    // Start a new chat
    const handleNewChat = () => {
        // Check for unsaved changes
        if (unsavedChanges && messages.length > 0) {
            if (window.confirm('You have unsaved changes. Do you want to save them before creating a new chat?')) {
                handleSaveChat();
            }
        }

        setActiveChat(null);
        setMessages([]);
        setChatTitle('New Chat');
        setUnsavedChanges(false);
        onHistoryClose();
    };

    // Handle title editing
    const handleTitleChange = (e) => {
        setChatTitle(e.target.value);
        setUnsavedChanges(true);
    };

    const startTitleEdit = () => {
        setIsEditingTitle(true);
    };

    const finishTitleEdit = () => {
        setIsEditingTitle(false);
        handleSaveChat();
    };

    // Handle title edit on Enter key
    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            finishTitleEdit();
        }
    };

    // Return to dashboard
    const handleBackToDashboard = () => {
        navigate('/');
    };

    return (
        <Box h="calc(100vh - 80px)" display="flex" flexDirection="column">
            {/* Header with chat title and controls */}
            <Flex
                p={4}
                bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                borderBottomWidth={1}
                borderBottomColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                justify="space-between"
                align="center"
            >
                <Flex align="center">
                    <IconButton
                        icon={<Icon as={FiMenu} />}
                        aria-label="Chat History"
                        mr={3}
                        onClick={onHistoryOpen}
                        variant="ghost"
                    />

                    {isEditingTitle ? (
                        <InputGroup size="md" width="auto" maxW="300px">
                            <Input
                                value={chatTitle}
                                onChange={handleTitleChange}
                                onBlur={finishTitleEdit}
                                onKeyDown={handleTitleKeyDown}
                                autoFocus
                                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.300'}
                                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                            />
                            <InputRightElement>
                                <IconButton
                                    size="sm"
                                    icon={<Icon as={FiSave} />}
                                    onClick={finishTitleEdit}
                                    variant="ghost"
                                />
                            </InputRightElement>
                        </InputGroup>
                    ) : (
                        <Heading
                            size="md"
                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                            onClick={startTitleEdit}
                            cursor="pointer"
                            display="flex"
                            alignItems="center"
                        >
                            {activeChat ? chatTitle : 'New Chat'}
                            {activeChat && (
                                <IconButton
                                    icon={<Icon as={FiEdit} />}
                                    size="sm"
                                    aria-label="Edit title"
                                    variant="ghost"
                                    ml={2}
                                    onClick={startTitleEdit}
                                />
                            )}
                        </Heading>
                    )}

                    {unsavedChanges && (
                        <Badge ml={2} colorScheme="yellow">Unsaved</Badge>
                    )}
                </Flex>

                <Flex>
                    <Tooltip label="Back to Dashboard">
                        <Button
                            variant="ghost"
                            mr={2}
                            onClick={handleBackToDashboard}
                        >
                            Dashboard
                        </Button>
                    </Tooltip>
                    <Tooltip label="New Chat">
                        <IconButton
                            icon={<Icon as={FiPlus} />}
                            aria-label="New Chat"
                            mr={2}
                            onClick={handleNewChat}
                            variant="ghost"
                        />
                    </Tooltip>
                    <Tooltip label="Save Chat">
                        <IconButton
                            icon={<Icon as={FiSave} />}
                            aria-label="Save Chat"
                            mr={2}
                            onClick={handleSaveChat}
                            variant="ghost"
                            isDisabled={!unsavedChanges && activeChat}
                        />
                    </Tooltip>
                </Flex>
            </Flex>

            {/* Document selection summary */}
            <Box
                p={4}
                bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                borderBottomWidth={1}
                borderBottomColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            >
                <Flex justify="space-between" align="center">
                    <Heading
                        size="sm"
                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                    >
                        Documents Being Queried
                    </Heading>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBackToDashboard}
                        colorScheme="blue"
                    >
                        Change Selection
                    </Button>
                </Flex>

                <Flex wrap="wrap" gap={2} mt={3}>
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
                            </Tag>
                        ))
                    )}
                </Flex>
            </Box>

            {/* Chat history drawer */}
            <Drawer
                isOpen={isHistoryOpen}
                placement="left"
                onClose={onHistoryClose}
            >
                <DrawerOverlay />
                <DrawerContent bg={colorMode === 'dark' ? 'gray.800' : 'white'}>
                    <DrawerCloseButton />
                    <DrawerHeader borderBottomWidth="1px">
                        Chat History
                    </DrawerHeader>
                    <DrawerBody p={4}>
                        <ChatHistory onSelectChat={handleSelectChat} />
                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            {/* Chat messages */}
            <VStack
                flex="1"
                overflowY="auto"
                spacing={4}
                p={4}
                align="stretch"
                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
            >
                {isLoadingChat ? (
                    <Flex justify="center" align="center" h="100%">
                        <Spinner size="xl" />
                    </Flex>
                ) : messages.length === 0 ? (
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
                            leftIcon={<Icon as={FiSend} />}
                            disabled={!query.trim()}
                        >
                            Send
                        </Button>
                    </Flex>
                </form>
            </Box>

            {/* Max chats alert dialog */}
            <AlertDialog
                isOpen={isNewChatAlertOpen}
                leastDestructiveRef={cancelRef}
                onClose={onNewChatAlertClose}
            >
                <AlertDialogOverlay>
                    <AlertDialogContent bg={colorMode === 'dark' ? 'gray.800' : 'white'}>
                        <AlertDialogHeader fontSize="lg" fontWeight="bold" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                            Chat Limit Reached
                        </AlertDialogHeader>

                        <AlertDialogBody color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>
                            You have reached the maximum limit of 5 chats. Creating a new chat will delete your oldest chat.
                            Do you want to continue?
                        </AlertDialogBody>

                        <AlertDialogFooter>
                            <Button ref={cancelRef} onClick={onNewChatAlertClose}>
                                Cancel
                            </Button>
                            <Button colorScheme="red" onClick={handleProceedWithNewChat} ml={3}>
                                Delete Oldest & Continue
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialogOverlay>
            </AlertDialog>
        </Box>
    );
}

export default ChatInterface;