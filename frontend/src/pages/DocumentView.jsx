import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    Box, Heading, Text, Flex, Button, Spinner, Tag, Badge,
    VStack, HStack, Divider, IconButton, useToast, Input
} from '@chakra-ui/react';
import { FiArrowLeft, FiMessageSquare, FiTrash2, FiPlus, FiX } from 'react-icons/fi';
import { getDocumentDetails, deleteDocument, updateDocument } from '../api/documents';

function DocumentView() {
    const { documentId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [newTag, setNewTag] = React.useState('');

    // Fetch document details
    const { data: document, isLoading, isError } = useQuery(
        ['document', documentId],
        () => getDocumentDetails(documentId)
    );

    // Delete document mutation
    const deleteMutation = useMutation(deleteDocument, {
        onSuccess: () => {
            toast({
                title: 'Document deleted',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
            navigate('/');
        }
    });

    // Update document mutation
    const updateMutation = useMutation(
        // Using a function that takes two parameters
        (data) => updateDocument(documentId, data),
        {
            onSuccess: () => {
                queryClient.invalidateQueries(['document', documentId]);
                toast({
                    title: 'Document updated',
                    status: 'success',
                    duration: 3000,
                    isClosable: true,
                });
            }
        }
    );

    // Handle document deletion
    const handleDelete = () => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            deleteMutation.mutate(documentId);
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
            return new Date(dateString).toLocaleString();
        } catch (e) {
            return 'Invalid date';
        }
    };

    // Add tag
    const handleAddTag = () => {
        if (newTag && document) {
            const currentTags = document.tags || [];
            if (currentTags.includes(newTag)) {
                toast({
                    title: 'Tag already exists',
                    status: 'warning',
                    duration: 2000,
                    isClosable: true,
                });
                return;
            }

            const updatedTags = [...currentTags, newTag];
            updateMutation.mutate(documentId, { tags: updatedTags });
            setNewTag('');
        }
    };

    // Remove tag
    const handleRemoveTag = (tagToRemove) => {
        if (document) {
            const updatedTags = (document.tags || []).filter(tag => tag !== tagToRemove);
            updateMutation.mutate(documentId, { tags: updatedTags });
        }
    };

    // Handle key press in tag input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleAddTag();
        }
    };

    if (isLoading) {
        return (
            <Flex justify="center" align="center" h="100%" p={10}>
                <Spinner size="xl" />
            </Flex>
        );
    }

    if (isError || !document) {
        return (
            <Box p={6}>
                <Button leftIcon={<FiArrowLeft />} onClick={() => navigate('/')} mb={6}>
                    Back to Documents
                </Button>
                <Heading size="md" color="red.500">Error loading document</Heading>
                <Text mt={2}>The document could not be found or has been deleted.</Text>
            </Box>
        );
    }

    return (
        <Box p={6}>
            <Button leftIcon={<FiArrowLeft />} onClick={() => navigate('/')} mb={6}>
                Back to Documents
            </Button>

            <Flex justify="space-between" align="start" mb={6}>
                <Heading size="lg">{document.filename}</Heading>
                <HStack>
                    <Button
                        colorScheme="blue"
                        leftIcon={<FiMessageSquare />}
                        onClick={() => navigate(`/chat?doc=${documentId}`)}
                    >
                        Ask Questions
                    </Button>
                    <Button
                        colorScheme="red"
                        variant="outline"
                        leftIcon={<FiTrash2 />}
                        onClick={handleDelete}
                        isLoading={deleteMutation.isLoading}
                    >
                        Delete
                    </Button>
                </HStack>
            </Flex>

            <Flex
                p={5}
                borderWidth={1}
                borderRadius="lg"
                direction="column"
                bg="white"
                boxShadow="sm"
            >
                <Flex justify="space-between" mb={4}>
                    <Badge colorScheme={getStatusColor(document.status)}>
                        {document.status}
                    </Badge>
                    <Text fontSize="sm">
                        Uploaded: {formatDate(document.upload_date)}
                    </Text>
                </Flex>

                <VStack align="stretch" spacing={3}>
                    <Flex justify="space-between">
                        <Text fontWeight="bold">File Type:</Text>
                        <Text>{document.file_type.toUpperCase()}</Text>
                    </Flex>

                    <Flex justify="space-between">
                        <Text fontWeight="bold">Size:</Text>
                        <Text>{formatFileSize(document.size_bytes)}</Text>
                    </Flex>

                    {document.num_pages && (
                        <Flex justify="space-between">
                            <Text fontWeight="bold">Pages:</Text>
                            <Text>{document.num_pages}</Text>
                        </Flex>
                    )}
                </VStack>

                <Divider my={4} />

                <Box>
                    <Heading size="sm" mb={3}>Tags</Heading>
                    <Flex mb={3}>
                        <Input
                            placeholder="Add a tag"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={handleKeyPress}
                            mr={2}
                        />
                        <IconButton
                            icon={<FiPlus />}
                            onClick={handleAddTag}
                            aria-label="Add tag"
                            isLoading={updateMutation.isLoading}
                        />
                    </Flex>

                    <Flex wrap="wrap" gap={2}>
                        {document.tags && document.tags.length > 0 ? (
                            document.tags.map((tag) => (
                                <Tag key={tag} size="md" borderRadius="full" mb={2}>
                                    {tag}
                                    <IconButton
                                        size="xs"
                                        ml={1}
                                        icon={<FiX />}
                                        variant="ghost"
                                        onClick={() => handleRemoveTag(tag)}
                                        aria-label={`Remove ${tag}`}
                                        isLoading={updateMutation.isLoading}
                                    />
                                </Tag>
                            ))
                        ) : (
                            <Text color="gray.500">No tags yet</Text>
                        )}
                    </Flex>
                </Box>

                {document.error && (
                    <Box mt={4} p={3} bg="red.50" borderRadius="md">
                        <Heading size="sm" color="red.500" mb={2}>Error</Heading>
                        <Text>{document.error}</Text>
                    </Box>
                )}
            </Flex>
        </Box>
    );
}

export default DocumentView;