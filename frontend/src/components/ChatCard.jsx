import React from 'react';
import {
    Box, Text, Flex, Badge, IconButton, Avatar,
    Menu, MenuButton, MenuList, MenuItem, Icon, useColorMode
} from '@chakra-ui/react';
import { FiMoreVertical, FiMessageSquare, FiTrash2, FiEdit2, FiChevronRight } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';

const ChatCard = ({ chat, onClick, onDelete, onRename }) => {
    const { colorMode } = useColorMode();

    // Format date
    const formatDate = (dateString) => {
        try {
            const date = parseISO(dateString);
            return format(date, 'MMM d, yyyy h:mm a');
        } catch (e) {
            return 'Unknown date';
        }
    };

    // Count messages in chat
    const getMessageCount = () => {
        return chat.messages ? chat.messages.length : 0;
    };

    // Get last message
    const getLastMessage = () => {
        if (!chat.messages || chat.messages.length === 0) {
            return 'No messages yet';
        }
        return chat.messages[chat.messages.length - 1].text;
    };

    return (
        <Box
            p={4}
            borderWidth={1}
            borderRadius="lg"
            cursor="pointer"
            onClick={onClick}
            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
            _hover={{
                borderColor: 'blue.400',
                boxShadow: 'sm'
            }}
            transition="all 0.2s"
        >
            <Flex justify="space-between" align="center" mb={2}>
                <Text
                    fontWeight="medium"
                    noOfLines={1}
                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                >
                    {chat.title}
                </Text>
                <Flex align="center">
                    <Badge
                        mr={2}
                        colorScheme="blue"
                        display="flex"
                        alignItems="center"
                    >
                        <Icon as={FiMessageSquare} mr={1} boxSize={3} />
                        {getMessageCount()}
                    </Badge>
                    <Menu placement="bottom-end" isLazy>
                        <MenuButton
                            as={IconButton}
                            icon={<FiMoreVertical />}
                            variant="ghost"
                            size="sm"
                            aria-label="Options"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <MenuList
                            onClick={(e) => e.stopPropagation()}
                            zIndex={10}
                            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                        >
                            {onRename && (
                                <MenuItem
                                    icon={<FiEdit2 />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRename(chat.chat_id);
                                    }}
                                    _hover={{ bg: colorMode === 'dark' ? 'gray.600' : 'gray.100' }}
                                    color={colorMode === 'dark' ? 'white' : 'inherit'}
                                >
                                    Rename
                                </MenuItem>
                            )}
                            <MenuItem
                                icon={<FiTrash2 />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(chat.chat_id);
                                }}
                                _hover={{ bg: colorMode === 'dark' ? 'gray.600' : 'gray.100' }}
                                color="red.500"
                            >
                                Delete
                            </MenuItem>
                        </MenuList>
                    </Menu>
                </Flex>
            </Flex>

            <Text
                fontSize="sm"
                color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}
                mb={3}
                noOfLines={2}
            >
                {getLastMessage()}
            </Text>

            <Flex justify="space-between" align="center">
                <Flex align="center">
                    <Avatar size="xs" name="AI" bg="blue.500" mr={2} />
                    <Text
                        fontSize="xs"
                        color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}
                    >
                        {formatDate(chat.updated_at || chat.created_at)}
                    </Text>
                </Flex>
                <Icon as={FiChevronRight} color={colorMode === 'dark' ? 'gray.400' : 'gray.500'} />
            </Flex>
        </Box>
    );
};

export default ChatCard;