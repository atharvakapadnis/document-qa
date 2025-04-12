import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box, Heading, SimpleGrid, Text, Button, Input, Tag, HStack,
    VStack, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalCloseButton, ModalBody, ModalFooter, useToast, Spinner, Flex,
    useColorMode, Icon
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiMessageSquare, FiChevronRight, FiSearch, FiX } from 'react-icons/fi';

import { fetchDocuments, uploadDocument, deleteDocument } from '../api/documents';
import DocumentCard from '../components/DocumentCard';
import FileDropzone from '../components/FileDropzone';

function Dashboard() {
    const toast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [searchQuery, setSearchQuery] = useState('');
    const [tags, setTags] = useState([]);
    const [currentTag, setCurrentTag] = useState('');
    const [selectedDocuments, setSelectedDocuments] = useState([]);
    const { colorMode } = useColorMode();

    // Fetch documents
    const { data: documents, isLoading, isError } = useQuery(
        'documents',
        fetchDocuments
    );

    // Load selected documents from localStorage on mount
    useEffect(() => {
        const savedDocs = localStorage.getItem('selectedDocuments');
        if (savedDocs) {
            try {
                const parsedDocs = JSON.parse(savedDocs);
                if (Array.isArray(parsedDocs)) {
                    setSelectedDocuments(parsedDocs);
                }
            } catch (error) {
                console.error("Error parsing saved documents:", error);
            }
        }
    }, []);

    // Upload document mutation
    const uploadMutation = useMutation(uploadDocument, {
        onSuccess: () => {
            queryClient.invalidateQueries('documents');
            onClose();
            toast({
                title: 'Document uploaded',
                description: "We've started processing your document.",
                status: 'success',
                duration: 5000,
                isClosable: true,
            });
        },
        onError: (error) => {
            toast({
                title: 'Upload failed',
                description: error.message || 'There was an error uploading your document.',
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        }
    });

    // Delete document mutation
    const deleteMutation = useMutation(deleteDocument, {
        onSuccess: () => {
            queryClient.invalidateQueries('documents');
            toast({
                title: 'Document deleted',
                status: 'success',
                duration: 3000,
                isClosable: true,
            });
        }
    });

    // Handle file upload
    const handleUpload = (files) => {
        if (files && files.length > 0) {
            const formData = new FormData();
            formData.append('file', files[0]);

            // Add tags if any
            tags.forEach(tag => {
                formData.append('tags', tag);
            });

            uploadMutation.mutate(formData);
        }
    };

    // Handle document deletion
    const handleDelete = (docId) => {
        if (window.confirm('Are you sure you want to delete this document?')) {
            // Also remove from selected documents if present
            setSelectedDocuments(prev => prev.filter(id => id !== docId));
            localStorage.setItem('selectedDocuments', JSON.stringify(
                selectedDocuments.filter(id => id !== docId)
            ));
            deleteMutation.mutate(docId);
        }
    };

    // Handle adding a tag
    const handleAddTag = () => {
        if (currentTag && !tags.includes(currentTag)) {
            setTags([...tags, currentTag]);
            setCurrentTag('');
        }
    };

    // Handle removing a tag
    const handleRemoveTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    // Handle document selection
    const handleToggleDocumentSelection = (docId) => {
        setSelectedDocuments(prevSelected => {
            const newSelection = prevSelected.includes(docId)
                ? prevSelected.filter(id => id !== docId)
                : [...prevSelected, docId];

            // Save to localStorage for persistence
            localStorage.setItem('selectedDocuments', JSON.stringify(newSelection));

            return newSelection;
        });
    };

    // Navigate to chat with selected documents
    const handleGoToChat = () => {
        navigate('/chat');
    };

    // Clear all selected documents
    const clearAllSelected = () => {
        setSelectedDocuments([]);
        localStorage.setItem('selectedDocuments', JSON.stringify([]));
    };

    // Filter documents based on search query
    const filteredDocuments = documents?.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <Box p={5}>
            <Heading size="lg" mb={6} color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                Your Documents
            </Heading>

            <Flex justify="space-between" align="center" mb={6} wrap="wrap">
                <Box position="relative" w={{ base: '100%', md: '60%' }} mb={{ base: 4, md: 0 }}>
                    <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                        _hover={{
                            borderColor: colorMode === 'dark' ? 'blue.300' : 'blue.500',
                        }}
                        _focus={{
                            borderColor: 'blue.500',
                            boxShadow: colorMode === 'dark'
                                ? '0 0 0 1px var(--chakra-colors-blue-500)'
                                : '0 0 0 1px var(--chakra-colors-blue-500)'
                        }}
                        pl="40px"
                    />
                    <Icon
                        as={FiSearch}
                        position="absolute"
                        left="15px"
                        top="50%"
                        transform="translateY(-50%)"
                        color={colorMode === 'dark' ? 'gray.400' : 'gray.500'}
                    />
                </Box>

                <Flex gap={2}>
                    <Button
                        colorScheme="blue"
                        leftIcon={<Icon as={FiUpload} />}
                        onClick={onOpen}
                    >
                        Upload Document
                    </Button>
                    {selectedDocuments.length > 0 && (
                        <Button
                            colorScheme="green"
                            leftIcon={<Icon as={FiMessageSquare} />}
                            onClick={handleGoToChat}
                        >
                            Chat with Selected
                        </Button>
                    )}
                </Flex>
            </Flex>

            {/* Selected documents summary */}
            {selectedDocuments.length > 0 && (
                <Flex
                    mb={6}
                    p={3}
                    bg={colorMode === 'dark' ? 'gray.700' : 'gray.50'}
                    borderRadius="md"
                    borderWidth={1}
                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                    align="center"
                    justify="space-between"
                    wrap="wrap"
                >
                    <HStack spacing={2} mb={{ base: 2, md: 0 }} flex="1">
                        <Text fontWeight="medium" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                            Selected: {selectedDocuments.length}
                        </Text>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllSelected}
                            colorScheme="red"
                        >
                            Clear All
                        </Button>
                        <Box flex="1">
                            <Flex wrap="wrap" gap={2}>
                                {selectedDocuments.slice(0, 3).map(docId => {
                                    const doc = documents?.find(d => d.doc_id === docId);
                                    if (!doc) return null;

                                    return (
                                        <Tag
                                            key={docId}
                                            size="md"
                                            borderRadius="full"
                                            variant="solid"
                                            colorScheme="blue"
                                        >
                                            <HStack spacing={1}>
                                                <Text noOfLines={1} maxW="150px">{doc.filename}</Text>
                                                <Icon
                                                    as={FiX}
                                                    cursor="pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleDocumentSelection(docId);
                                                    }}
                                                />
                                            </HStack>
                                        </Tag>
                                    );
                                })}
                                {selectedDocuments.length > 3 && (
                                    <Tag colorScheme="blue" variant="solid">
                                        +{selectedDocuments.length - 3} more
                                    </Tag>
                                )}
                            </Flex>
                        </Box>
                    </HStack>
                    <Button
                        colorScheme="green"
                        rightIcon={<Icon as={FiChevronRight} />}
                        onClick={handleGoToChat}
                        size={{ base: 'sm', md: 'md' }}
                        mt={{ base: 2, md: 0 }}
                    >
                        Chat with Selected
                    </Button>
                </Flex>
            )}

            {isLoading ? (
                <Flex justify="center" mt={10}>
                    <Spinner size="xl" color={colorMode === 'dark' ? 'blue.300' : 'blue.500'} />
                </Flex>
            ) : isError ? (
                <Box textAlign="center" mt={10}>
                    <Text color={colorMode === 'dark' ? 'red.300' : 'red.500'}>
                        Error loading documents. Please try again later.
                    </Text>
                </Box>
            ) : filteredDocuments.length === 0 ? (
                <Box
                    textAlign="center"
                    mt={10}
                    p={6}
                    borderWidth={1}
                    borderRadius="md"
                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                    bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                >
                    <Icon as={FiFile} boxSize={12} color={colorMode === 'dark' ? 'gray.300' : 'gray.400'} />
                    <Heading size="md" mt={4} mb={2} color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                        No documents found
                    </Heading>
                    <Text mb={4} color={colorMode === 'dark' ? 'gray.300' : 'gray.500'}>
                        Upload your first document to get started
                    </Text>
                    <Button colorScheme="blue" onClick={onOpen}>Upload Document</Button>
                </Box>
            ) : (
                <SimpleGrid columns={{ base: 1, sm: 1, md: 2, lg: 3 }} spacing={6}>
                    {filteredDocuments.map((doc) => (
                        <DocumentCard
                            key={doc.doc_id}
                            document={doc}
                            onDelete={() => handleDelete(doc.doc_id)}
                            isSelected={selectedDocuments.includes(doc.doc_id)}
                            onToggleSelect={() => handleToggleDocumentSelection(doc.doc_id)}
                        />
                    ))}
                </SimpleGrid>
            )}

            {/* Upload Document Modal */}
            <Modal isOpen={isOpen} onClose={onClose} size="lg">
                <ModalOverlay />
                <ModalContent
                    bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                    <ModalHeader
                        borderBottomWidth={1}
                        borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                    >
                        Upload Document
                    </ModalHeader>
                    <ModalCloseButton color={colorMode === 'dark' ? 'white' : 'gray.800'} />
                    <ModalBody>
                        <FileDropzone onFileAccepted={handleUpload} isUploading={uploadMutation.isLoading} />

                        <Box mt={4}>
                            <Heading
                                size="sm"
                                mb={2}
                                color={colorMode === 'dark' ? 'white' : 'gray.800'}
                            >
                                Add Tags (Optional)
                            </Heading>
                            <HStack mb={2}>
                                <Input
                                    placeholder="Enter tag"
                                    value={currentTag}
                                    onChange={(e) => setCurrentTag(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                    bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                    _hover={{
                                        borderColor: colorMode === 'dark' ? 'blue.300' : 'blue.500',
                                    }}
                                    _focus={{
                                        borderColor: 'blue.500',
                                        boxShadow: colorMode === 'dark'
                                            ? '0 0 0 1px var(--chakra-colors-blue-500)'
                                            : '0 0 0 1px var(--chakra-colors-blue-500)'
                                    }}
                                />
                                <Button onClick={handleAddTag}>Add</Button>
                            </HStack>

                            <HStack spacing={2} mt={2} flexWrap="wrap">
                                {tags.map((tag, index) => (
                                    <Tag key={index} size="md" variant="solid" colorScheme="blue" mb={2}>
                                        {tag}
                                        <Button
                                            size="xs"
                                            ml={1}
                                            onClick={() => handleRemoveTag(tag)}
                                            variant="ghost"
                                            color="white"
                                        >
                                            ×
                                        </Button>
                                    </Tag>
                                ))}
                            </HStack>
                        </Box>

                        {uploadMutation.isLoading && (
                            <VStack mt={4}>
                                <Spinner color={colorMode === 'dark' ? 'blue.300' : 'blue.500'} />
                                <Text color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                                    Uploading document...
                                </Text>
                            </VStack>
                        )}
                    </ModalBody>

                    <ModalFooter
                        borderTopWidth={1}
                        borderColor={colorMode === 'dark' ? 'gray.700' : 'gray.200'}
                    >
                        <Button variant="ghost" mr={3} onClick={onClose}>
                            Cancel
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </Box>
    );
}

export default Dashboard;