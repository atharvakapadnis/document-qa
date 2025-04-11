import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    Box, Heading, Flex, Text, IconButton, Tooltip, Badge,
    Menu, MenuButton, MenuList, MenuItem, Button, useToast,
    useDisclosure, Modal, ModalOverlay, ModalContent,
    ModalHeader, ModalBody, ModalFooter, ModalCloseButton,
    FormControl, FormLabel, Input, Spinner, useColorMode
} from '@chakra-ui/react';
import { FiMoreVertical, FiTrash2, FiEdit2, FiPlus, FiMessageSquare } from 'react-icons/fi';
import { fetchChats, createChat, deleteChat, updateChat, getChatCount } from '../api/chats';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';

const ChatHistory = ({ onSelectChat }) => {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { colorMode } = useColorMode();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [isEditing, setIsEditing] = useState(false);
    const [currentChat, setCurrentChat] = useState(null);
    const [chatTitle, setChatTitle] = useState('');

    // Fetch chats
    const { data: chats, isLoading: isLoadingChats } = useQuery(
        'chats',
        fetchChats
    );

    // Fetch chat count
    const { data: chatCountData } = useQuery(
        'chatCount',
        getChatCount
    );

    // Create chat mutation
    const createChatMutation = useMutation(createChat, {
        onSuccess: () => {
            queryClient.invalidateQueries('chats');
            queryClient.invalidateQueries('chatCount');
            onClose();
            toast({
                title: 'Chat created',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        }
    });

    // Delete chat mutation
    const deleteChatMutation = useMutation(deleteChat, {
        onSuccess: () => {
            queryClient.invalidateQueries('chats');
            queryClient.invalidateQueries('chatCount');
            toast({
                title: 'Chat deleted',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        }
    });

    // Update chat mutation
    const updateChatMutation = useMutation(
        ({ chatId, data }) => updateChat(chatId, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('chats');
                onClose();
                toast({
                    title: 'Chat updated',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            }
        }
    );

    // Handle create/edit chat
    const handleSaveChat = () => {
        if (!chatTitle.trim()) {
            toast({
                title: 'Title required',
                description: 'Please enter a title for the chat',
                status: 'error',
                duration: 3000,
                isClosable: true,
            });
            return;
        }

        if (isEditing && currentChat) {
            updateChatMutation.mutate({
                chatId: currentChat.chat_id,
                data: { title: chatTitle }
            });
        } else {
            const willDeleteOldest = (chatCountData?.total || 0) >= 5;

            if (willDeleteOldest) {
                if (!window.confirm(
                    'You have reached the maximum limit of 5 chats. Creating a new chat will delete your oldest chat. Do you want to continue?'
                )) {
                    return;
                }
            }

            createChatMutation.mutate({ title: chatTitle });
        }
    };

    // Handle edit chat
    const handleEditChat = (chat) => {
        setIsEditing(true);
        setCurrentChat(chat);
        setChatTitle(chat.title);
        onOpen();
    };

    // Handle delete chat
    const handleDeleteChat = (chatId) => {
        if (window.confirm('Are you sure you want to delete this chat?')) {
            deleteChatMutation.mutate(chatId);
        }
    };

    // Handle new chat
    const handleNewChat = () => {
        setIsEditing(false);
        setCurrentChat(null);
        setChatTitle('');
        onOpen();
    };

    // Format date
    const formatDate = (dateString) => {
        try {
            const date = parseISO(dateString);
            return format(date, 'MMM d, yyyy h:mm a');
        } catch (e) {
            return 'Unknown date';
        }
    };

    // Count messages in a chat
    const getMessageCount = (chat) => {
        return chat.messages ? chat.messages.length : 0;
    };

    return (
        <Box>
            <Flex justify="space-between" align="center" mb={4}>
                <Heading size="md" color={colorMode === 'dark' ? 'white' : 'gray.700'}>
                    Chat History
                </Heading>
                <Tooltip label="New Chat">
                    <Button
                        leftIcon={<FiPlus />}
                        colorScheme="blue"
                        size="sm"
                        onClick={handleNewChat}
                    >
                        New Chat
                    </Button>
                </Tooltip>
            </Flex>

            {chatCountData && (
                <Text
                    fontSize="sm"
                    mb={4}
                    color={colorMode === 'dark' ? 'gray.400' : 'gray.600'}
                >
                    {chatCountData.total} of {chatCountData.max_allowed} chats used
                    {chatCountData.total >= chatCountData.max_allowed && (
                        <Badge ml={2} colorScheme="red">
                            Limit reached
                        </Badge>
                    )}
                </Text>
            )}

            {isLoadingChats ? (
                <Flex justify="center" p={4}>
                    <Spinner />
                </Flex>
            ) : (
                <Box>
                    {chats && chats.length > 0 ? (
                        chats.map((chat) => (
                            <Box
                                key={chat.chat_id}
                                p={3}
                                mb={3}
                                borderWidth={1}
                                borderRadius="md"
                                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                                _hover={{
                                    borderColor: 'blue.400',
                                    boxShadow: 'sm'
                                }}
                                cursor="pointer"
                                onClick={() => onSelectChat(chat.chat_id)}
                            >
                                <Flex justify="space-between" align="center">
                                    <Flex direction="column">
                                        <Text
                                            fontWeight="medium"
                                            color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                        >
                                            {chat.title}
                                        </Text>
                                        <Text
                                            fontSize="sm"
                                            color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}
                                        >
                                            {formatDate(chat.updated_at)}
                                        </Text>
                                    </Flex>
                                    <Flex align="center">
                                        <Badge
                                            mr={3}
                                            colorScheme="blue"
                                            display="flex"
                                            alignItems="center"
                                        >
                                            <FiMessageSquare style={{ marginRight: '4px' }} />
                                            {getMessageCount(chat)}
                                        </Badge>
                                        <Menu>
                                            <MenuButton
                                                as={IconButton}
                                                icon={<FiMoreVertical />}
                                                variant="ghost"
                                                size="sm"
                                                aria-label="Options"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <MenuList>
                                                <MenuItem
                                                    icon={<FiEdit2 />}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditChat(chat);
                                                    }}
                                                >
                                                    Rename
                                                </MenuItem>
                                                <MenuItem
                                                    icon={<FiTrash2 />}
                                                    color="red.500"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteChat(chat.chat_id);
                                                    }}
                                                >
                                                    Delete
                                                </MenuItem>
                                            </MenuList>
                                        </Menu>
                                    </Flex>
                                </Flex>
                            </Box>
                        ))
                    ) : (
                        <Box
                            textAlign="center"
                            p={6}
                            borderWidth={1}
                            borderRadius="md"
                            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                        >
                            <FiMessageSquare size={24} style={{ margin: '0 auto 16px' }} />
                            <Text mb={4}>No chat history found</Text>
                            <Button
                                colorScheme="blue"
                                size="sm"
                                onClick={handleNewChat}
                            >
                                Start a New Chat
                            </Button>
                        </Box>
                    )}
                </Box>
            )}

            {/* Create/Edit Chat Modal */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent bg={colorMode === 'dark' ? 'gray.800' : 'white'}>
                    <ModalHeader color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                        {isEditing ? 'Rename Chat' : 'New Chat'}
                    </ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <FormControl>
                            <FormLabel color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>
                                Chat Title
                            </FormLabel>
                            <Input
                                value={chatTitle}
                                onChange={(e) => setChatTitle(e.target.value)}
                                placeholder="Enter a title for your chat"
                                bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                                color={colorMode === 'dark' ? 'white' : 'black'}
                            />
                        </FormControl>
                    </ModalBody>

                    <ModalFooter>
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            colorScheme="blue"
                            onClick={handleSaveChat}
                            isLoading={createChatMutation.isLoading || updateChatMutation.isLoading}
                        >
                            {isEditing ? 'Save' : 'Create'}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
};

export default ChatHistory;