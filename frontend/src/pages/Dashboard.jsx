import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
    Box, Heading, SimpleGrid, Text, Button, Icon, Input, Tag, HStack,
    VStack, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalCloseButton, ModalBody, ModalFooter, useToast, Spinner, Flex,
    useColorMode, Divider, Checkbox, Card, CardHeader, CardBody
} from '@chakra-ui/react';
import { FiUpload, FiFile, FiMessageSquare, FiChevronRight, FiSearch, FiCheck } from 'react-icons/fi';

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

    // Filter documents based on search query
    const filteredDocuments = documents?.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <Box p={5}>
            <Flex justify="space-between" align="center" mb={6} wrap="wrap">
                <Heading size="lg" color={colorMode === 'dark' ? 'white' : 'gray.800'}>Your Documents</Heading>
                <Flex align="center">
                    <Button
                        colorScheme="blue"
                        leftIcon={<Icon as={FiUpload} />}
                        onClick={onOpen}
                        mr={3}
                    >
                        Upload Document
                    </Button>
                    <Button
                        colorScheme="green"
                        leftIcon={<Icon as={FiMessageSquare} />}
                        onClick={handleGoToChat}
                        isDisabled={selectedDocuments.length === 0}
                    >
                        Chat with Selected
                    </Button>
                </Flex>
            </Flex>

            {/* Search and document selection summary */}
            <Flex mb={6} direction={{ base: "column", md: "row" }} align={{ base: "stretch", md: "center" }} gap={4}>
                <Box flex="1" position="relative">
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
                <HStack spacing={2} wrap="wrap">
                    <Text fontWeight="medium" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                        Selected: {selectedDocuments.length}
                    </Text>
                    {selectedDocuments.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDocuments([])}
                            colorScheme="red"
                        >
                            Clear All
                        </Button>
                    )}
                </HStack>
            </Flex>

            {/* Selected Documents Card */}
            {selectedDocuments.length > 0 && (
                <Card
                    mb={6}
                    bg={colorMode === 'dark' ? 'gray.700' : 'white'}
                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                >
                    <CardHeader pb={2}>
                        <Heading size="md" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                            Selected Documents
                        </Heading>
                    </CardHeader>
                    <CardBody pt={0}>
                        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                            {selectedDocuments.map(docId => {
                                const doc = documents?.find(d => d.doc_id === docId);
                                if (!doc) return null;

                                return (
                                    <Tag
                                        key={docId}
                                        size="lg"
                                        borderRadius="full"
                                        variant="solid"
                                        colorScheme="blue"
                                        padding={2}
                                        paddingLeft={3}
                                    >
                                        <HStack spacing={2} flex="1">
                                            <Icon as={FiFile} />
                                            <Text noOfLines={1}>{doc.filename}</Text>
                                        </HStack>
                                        <Button
                                            size="xs"
                                            ml={1}
                                            onClick={() => handleToggleDocumentSelection(docId)}
                                            variant="ghost"
                                            color="white"
                                        >
                                            ×
                                        </Button>
                                    </Tag>
                                );
                            })}
                        </SimpleGrid>
                        <Flex justify="flex-end" mt={4}>
                            <Button
                                colorScheme="green"
                                rightIcon={<FiChevronRight />}
                                onClick={handleGoToChat}
                            >
                                Chat with Selected
                            </Button>
                        </Flex>
                    </CardBody>
                </Card>
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
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {filteredDocuments.map((doc) => (
                        <Box key={doc.doc_id} position="relative">
                            <Checkbox
                                position="absolute"
                                top={2}
                                right={2}
                                zIndex={1}
                                colorScheme="blue"
                                size="lg"
                                isChecked={selectedDocuments.includes(doc.doc_id)}
                                onChange={() => handleToggleDocumentSelection(doc.doc_id)}
                            />
                            <DocumentCard
                                document={doc}
                                onDelete={() => handleDelete(doc.doc_id)}
                                isSelected={selectedDocuments.includes(doc.doc_id)}
                                onToggleSelect={() => handleToggleDocumentSelection(doc.doc_id)}
                            />
                        </Box>
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
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
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