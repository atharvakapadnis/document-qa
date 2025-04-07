import React from 'react';
import { Link } from 'react-router-dom';
import {
    Box, Heading, Text, Flex, Tag, Badge, IconButton,
    Menu, MenuButton, MenuList, MenuItem, Icon
} from '@chakra-ui/react';
import { FiMoreVertical, FiEye, FiMessageSquare, FiTrash2, FiFileText } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

function DocumentCard({ document, onDelete }) {
    // Helper to get file icon based on type
    const getFileIcon = (fileType) => {
        switch (fileType.toLowerCase()) {
            case 'pdf':
                return 'FiFileText';
            case 'docx':
                return 'FiFileText';
            case 'csv':
                return 'FiFileText';
            default:
                return 'FiFile';
        }
    };

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
            return formatDistanceToNow(new Date(dateString), { addSuffix: true });
        } catch (e) {
            return 'Invalid date';
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
        >
            <Flex
                p={4}
                bg="gray.50"
                align="center"
                borderBottomWidth={1}
            >
                <Icon
                    as={FiFileText}
                    boxSize={6}
                    color="blue.500"
                    mr={3}
                />
                <Box flex="1">
                    <Heading size="sm" noOfLines={1} title={document.filename}>
                        {document.filename}
                    </Heading>
                    <Text fontSize="xs" color="gray.500">
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
                    />
                    <MenuList>
                        <MenuItem
                            as={Link}
                            to={`/documents/${document.doc_id}`}
                            icon={<Icon as={FiEye} />}
                        >
                            View Details
                        </MenuItem>
                        <MenuItem
                            as={Link}
                            to={`/chat?doc=${document.doc_id}`}
                            icon={<Icon as={FiMessageSquare} />}
                        >
                            Ask Questions
                        </MenuItem>
                        <MenuItem
                            icon={<Icon as={FiTrash2} />}
                            color="red.500"
                            onClick={() => onDelete(document.doc_id)}
                        >
                            Delete
                        </MenuItem>
                    </MenuList>
                </Menu>
            </Flex>

            <Box p={4}>
                <Flex justify="space-between" mb={3}>
                    <Badge colorScheme={getStatusColor(document.status || 'processing')}>
                        {document.status || 'Processing'}
                    </Badge>
                    {document.num_pages && (
                        <Text fontSize="xs" color="gray.500">
                            {document.num_pages} {document.num_pages === 1 ? 'page' : 'pages'}
                        </Text>
                    )}
                </Flex>

                {document.tags && document.tags.length > 0 && (
                    <Flex mt={2} flexWrap="wrap" gap={1}>
                        {document.tags.map((tag, index) => (
                            <Tag key={index} size="sm" colorScheme="blue" variant="subtle">
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