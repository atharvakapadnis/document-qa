import React from 'react';
import { Link } from 'react-router-dom';
import {
    Box, Heading, Text, Flex, Tag, Badge, IconButton,
    Menu, MenuButton, MenuList, MenuItem, Icon, useColorMode,
    Checkbox
} from '@chakra-ui/react';
import { FiMoreVertical, FiEye, FiMessageSquare, FiTrash2, FiFileText } from 'react-icons/fi';
import { formatDistanceToNow, parseISO } from 'date-fns';

function DocumentCard({ document, onDelete, isSelected, onToggleSelect }) {
    // Get the current color mode
    const { colorMode } = useColorMode();

    // Get status color
    const getStatusColor = (status) => {
        switch (status) {
            case 'processed':
                return 'green';
            case 'processing':
                return 'blue';
            case 'error':
                return 'red';
            default:
                return 'gray';
        }
    };

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Format date
    const formatDate = (dateString) => {
        try {
            // Parse the ISO string properly
            const date = parseISO(dateString);

            // Check if the date is valid
            if (isNaN(date.getTime())) {
                return 'Invalid date';
            }

            // Get more specific time representation
            const now = new Date();
            const diffInMinutes = Math.floor((now - date) / (1000 * 60));

            if (diffInMinutes < 1) {
                return 'Just now';
            } else if (diffInMinutes < 60) {
                return `${diffInMinutes} minute${diffInMinutes === 1 ? '' : 's'} ago`;
            } else if (diffInMinutes < 24 * 60) {
                const hours = Math.floor(diffInMinutes / 60);
                return `${hours} hour${hours === 1 ? '' : 's'} ago`;
            } else {
                // For anything over 24 hours, use the formatDistanceToNow but make it more accurate
                return formatDistanceToNow(date, { addSuffix: true });
            }
        } catch (e) {
            console.error("Date formatting error:", e);
            return 'Unknown date';
        }
    };

    return (
        <Box
            borderWidth={1}
            borderRadius="lg"
            overflow="hidden"
            boxShadow="sm"
            transition="all 0.2s"
            _hover={{ boxShadow: 'md' }}
            borderColor={isSelected
                ? 'blue.500'
                : (colorMode === 'dark' ? 'gray.700' : 'gray.200')}
            bg={isSelected
                ? (colorMode === 'dark' ? 'blue.900' : 'blue.50')
                : (colorMode === 'dark' ? 'gray.700' : 'white')}
            onClick={onToggleSelect}
            cursor="pointer"
            position="relative"
        >
            <Flex
                p={4}
                bg={isSelected
                    ? (colorMode === 'dark' ? 'blue.800' : 'blue.100')
                    : (colorMode === 'dark' ? 'gray.700' : 'gray.50')}
                align="center"
                borderBottomWidth={1}
                borderBottomColor={isSelected
                    ? 'blue.500'
                    : (colorMode === 'dark' ? 'gray.600' : 'gray.200')}
            >
                <Checkbox
                    isChecked={isSelected}
                    colorScheme="blue"
                    mr={3}
                    size="lg"
                    onClick={(e) => e.stopPropagation()}
                    onChange={onToggleSelect}
                />
                <Icon
                    as={FiFileText}
                    boxSize={6}
                    color={isSelected ? "blue.500" : "blue.400"}
                    mr={3}
                />
                <Box flex="1">
                    <Heading
                        size="sm"
                        noOfLines={1}
                        title={document.filename}
                        color={isSelected
                            ? (colorMode === 'dark' ? 'blue.200' : 'blue.700')
                            : (colorMode === 'dark' ? 'white' : 'gray.800')}
                    >
                        {document.filename}
                    </Heading>
                    <Text
                        fontSize="xs"
                        color={colorMode === 'dark' ? 'gray.300' : 'gray.500'}
                    >
                        {formatFileSize(document.size_bytes)} • {formatDate(document.upload_date)}
                    </Text>
                </Box>
                <Menu>
                    <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                        aria-label="Options"
                        color={colorMode === 'dark' ? 'gray.200' : 'gray.800'}
                        onClick={(e) => e.stopPropagation()}
                    />
                    <MenuList
                        bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <MenuItem
                            as={Link}
                            to={`/documents/${document.doc_id}`}
                            icon={<Icon as={FiEye} />}
                            _hover={{ bg: colorMode === 'dark' ? 'gray.600' : 'gray.100' }}
                            color={colorMode === 'dark' ? 'white' : 'inherit'}
                        >
                            View Details
                        </MenuItem>
                        <MenuItem
                            as={Link}
                            to={`/chat?doc=${document.doc_id}`}
                            icon={<Icon as={FiMessageSquare} />}
                            _hover={{ bg: colorMode === 'dark' ? 'gray.600' : 'gray.100' }}
                            color={colorMode === 'dark' ? 'white' : 'inherit'}
                        >
                            Ask Questions
                        </MenuItem>
                        <MenuItem
                            icon={<Icon as={FiTrash2} />}
                            color="red.500"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(document.doc_id);
                            }}
                            _hover={{ bg: colorMode === 'dark' ? 'gray.600' : 'gray.100' }}
                        >
                            Delete
                        </MenuItem>
                    </MenuList>
                </Menu>
            </Flex>

            <Box
                p={4}
                bg={isSelected
                    ? (colorMode === 'dark' ? 'blue.900' : 'blue.50')
                    : (colorMode === 'dark' ? 'gray.700' : 'white')}
            >
                <Flex justify="space-between" mb={3}>
                    <Badge colorScheme={getStatusColor(document.status || 'processing')}>
                        {document.status || 'Processing'}
                    </Badge>
                    {document.num_pages && (
                        <Text
                            fontSize="xs"
                            color={colorMode === 'dark' ? 'gray.300' : 'gray.500'}
                        >
                            {document.num_pages} {document.num_pages === 1 ? 'page' : 'pages'}
                        </Text>
                    )}
                </Flex>

                {document.tags && document.tags.length > 0 && (
                    <Flex mt={2} flexWrap="wrap" gap={1}>
                        {document.tags.map((tag, index) => (
                            <Tag
                                key={index}
                                size="sm"
                                colorScheme={isSelected ? "blue" : "gray"}
                                variant="subtle"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {tag}
                            </Tag>
                        ))}
                    </Flex>
                )}

                {document.error && (
                    <Text color="red.500" fontSize="sm" mt={2}>
                        Error: {document.error}
                    </Text>
                )}
            </Box>
        </Box>
    );
}

export default DocumentCard;