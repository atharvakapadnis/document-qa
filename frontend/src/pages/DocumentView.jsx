import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    Box, Heading, Text, Flex, Button, Tag, Badge,
    useToast, Input, InputGroup, InputRightElement, Icon,
    Grid, GridItem, useColorMode
} from '@chakra-ui/react';
import { FiArrowLeft, FiMessageSquare, FiTrash2, FiPlus } from 'react-icons/fi';
import { getDocumentDetails, deleteDocument, updateDocument } from '../api/documents';

function DocumentView() {
    const { documentId } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const queryClient = useQueryClient();
    const [newTag, setNewTag] = useState('');
    const { colorMode } = useColorMode();

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

    // Format date
    const formatDate = (dateString) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString();
        } catch (e) {
            return 'Invalid date';
        }
    };

    // Handle adding a tag
    const handleAddTag = () => {
        if (!newTag.trim()) return;

        if (document) {
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
            updateMutation.mutate({ tags: updatedTags });
            setNewTag('');
        }
    };

    // Handle keypress in tag input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleAddTag();
        }
    };

    // Go back to documents
    const handleBackToDocs = () => {
        navigate('/');
    };

    // Navigate to chat with this document
    const handleGoToChat = () => {
        // Save this document to selectedDocuments in localStorage
        const selectedDocs = [documentId];
        localStorage.setItem('selectedDocuments', JSON.stringify(selectedDocs));
        navigate(`/chat?doc=${documentId}`);
    };

    if (isLoading) {
        return (
            <Box p={5}>
                <Button
                    leftIcon={<Icon as={FiArrowLeft} />}
                    onClick={handleBackToDocs}
                    mb={4}
                    variant="ghost"
                >
                    Back to Documents
                </Button>
                <Box
                    textAlign="center"
                    p={10}
                    borderWidth={1}
                    borderRadius="lg"
                    borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                >
                    <Text>Loading document details...</Text>
                </Box>
            </Box>
        );
    }

    if (isError || !document) {
        return (
            <Box p={5}>
                <Button
                    leftIcon={<Icon as={FiArrowLeft} />}
                    onClick={handleBackToDocs}
                    mb={4}
                    variant="ghost"
                >
                    Back to Documents
                </Button>
                <Box
                    textAlign="center"
                    p={10}
                    borderWidth={1}
                    borderRadius="lg"
                    borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                >
                    <Heading size="md" color="red.500" mb={2}>Error loading document</Heading>
                    <Text>The document could not be found or has been deleted.</Text>
                </Box>
            </Box>
        );
    }

    return (
        <Box p={5}>
            {/* Back button */}
            <Button
                leftIcon={<Icon as={FiArrowLeft} />}
                onClick={handleBackToDocs}
                mb={6}
                size="md"
                variant="outline"
                borderRadius="md"
                bg={colorMode === 'dark' ? 'gray.800' : 'gray.100'}
                _hover={{
                    bg: colorMode === 'dark' ? 'gray.700' : 'gray.200',
                }}
            >
                Back to Documents
            </Button>

            {/* Document header */}
            <Flex justify="space-between" align="center" mb={6} flexWrap="wrap">
                <Heading
                    size="lg"
                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                    wordBreak="break-all"
                >
                    {document.filename}
                </Heading>
                <Flex mt={{ base: 4, md: 0 }} gap={2}>
                    <Button
                        colorScheme="blue"
                        leftIcon={<Icon as={FiMessageSquare} />}
                        onClick={handleGoToChat}
                    >
                        Ask Questions
                    </Button>
                    <Button
                        colorScheme="red"
                        variant="outline"
                        leftIcon={<Icon as={FiTrash2} />}
                        onClick={handleDelete}
                        isLoading={deleteMutation.isLoading}
                    >
                        Delete
                    </Button>
                </Flex>
            </Flex>

            {/* Document details */}
            <Box
                borderWidth={1}
                borderRadius="lg"
                overflow="hidden"
                bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                boxShadow="sm"
                mb={6}
            >
                {/* Status section */}
                <Flex
                    p={4}
                    bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                    borderBottomWidth={1}
                    borderBottomColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                    justify="space-between"
                    align="center"
                    flexWrap="wrap"
                >
                    <Badge
                        colorScheme={document.status === 'processed' ? 'green' :
                            document.status === 'processing' ? 'blue' :
                                document.status === 'error' ? 'red' : 'gray'}
                        fontSize="md"
                        px={2}
                        py={1}
                    >
                        {document.status?.toUpperCase() || "UNKNOWN"}
                    </Badge>
                    <Text
                        fontSize="sm"
                        color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                        mt={{ base: 2, md: 0 }}
                    >
                        Uploaded: {formatDate(document.upload_date)}
                    </Text>
                </Flex>

                {/* Document properties */}
                <Box p={6}>
                    <Grid
                        templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
                        gap={4}
                    >
                        <GridItem>
                            <Text fontWeight="bold" mb={1} color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                                File Type:
                            </Text>
                            <Text fontSize="lg" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                {document.file_type?.toUpperCase() || "Unknown"}
                            </Text>
                        </GridItem>
                        <GridItem>
                            <Text fontWeight="bold" mb={1} color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                                Size:
                            </Text>
                            <Text fontSize="lg" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                {document.size_bytes ? `${(document.size_bytes / 1024).toFixed(1)} KB` : "Unknown"}
                            </Text>
                        </GridItem>
                        {document.num_pages && (
                            <GridItem>
                                <Text fontWeight="bold" mb={1} color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}>
                                    Pages:
                                </Text>
                                <Text fontSize="lg" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                    {document.num_pages}
                                </Text>
                            </GridItem>
                        )}
                    </Grid>

                    {/* Tags section */}
                    <Box mt={8}>
                        <Text
                            fontWeight="bold"
                            mb={3}
                            color={colorMode === 'dark' ? 'gray.300' : 'gray.600'}
                        >
                            Tags
                        </Text>
                        <InputGroup mb={4}>
                            <Input
                                placeholder="Add a tag"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyDown={handleKeyPress}
                                bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                                color={colorMode === 'dark' ? 'white' : 'black'}
                                borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                pr="4.5rem"
                            />
                            <InputRightElement width="4.5rem">
                                <Button
                                    h="1.75rem"
                                    size="sm"
                                    colorScheme="blue"
                                    onClick={handleAddTag}
                                    isLoading={updateMutation.isLoading}
                                    leftIcon={<Icon as={FiPlus} />}
                                >
                                    Add
                                </Button>
                            </InputRightElement>
                        </InputGroup>

                        <Box>
                            {document.tags && document.tags.length > 0 ? (
                                <Flex flexWrap="wrap" gap={2}>
                                    {document.tags.map((tag, index) => (
                                        <Tag
                                            key={index}
                                            size="lg"
                                            borderRadius="full"
                                            variant="solid"
                                            colorScheme="blue"
                                            mr={2}
                                            mb={2}
                                        >
                                            {tag}
                                        </Tag>
                                    ))}
                                </Flex>
                            ) : (
                                <Text color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}>
                                    No tags yet
                                </Text>
                            )}
                        </Box>
                    </Box>

                    {/* Error message if any */}
                    {document.error && (
                        <Box
                            mt={6}
                            p={4}
                            bg={colorMode === 'dark' ? 'red.900' : 'red.50'}
                            borderRadius="md"
                        >
                            <Text
                                fontWeight="bold"
                                mb={1}
                                color={colorMode === 'dark' ? 'red.200' : 'red.700'}
                            >
                                Error:
                            </Text>
                            <Text color={colorMode === 'dark' ? 'red.200' : 'red.700'}>
                                {document.error}
                            </Text>
                        </Box>
                    )}
                </Box>
            </Box>
        </Box>
    );
}

export default DocumentView;