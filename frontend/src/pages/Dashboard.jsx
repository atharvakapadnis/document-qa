import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
    Box, Heading, SimpleGrid, Text, Button, Icon, Input, Tag, HStack,
    VStack, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader,
    ModalCloseButton, ModalBody, ModalFooter, useToast, Spinner, Flex,
    useColorMode
} from '@chakra-ui/react';
import { FiUpload, FiFile } from 'react-icons/fi';

import { fetchDocuments, uploadDocument, deleteDocument } from '../api/documents';
import DocumentCard from '../components/DocumentCard';
import FileDropzone from '../components/FileDropzone';

function Dashboard() {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [searchQuery, setSearchQuery] = useState('');
    const [tags, setTags] = useState([]);
    const [currentTag, setCurrentTag] = useState('');
    const { colorMode } = useColorMode();

    // Fetch documents
    const { data: documents, isLoading, isError } = useQuery(
        'documents',
        fetchDocuments
    );

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

    // Filter documents based on search query
    const filteredDocuments = documents?.filter(doc =>
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    return (
        <Box p={5}>
            <Flex justify="space-between" align="center" mb={6}>
                <Heading size="lg" color={colorMode === 'dark' ? 'white' : 'gray.800'}>Your Documents</Heading>
                <Button
                    colorScheme="blue"
                    leftIcon={<Icon as={FiUpload} />}
                    onClick={onOpen}
                >
                    Upload Document
                </Button>
            </Flex>

            <Input
                placeholder="Search documents..."
                mb={6}
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
            />

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
                        <DocumentCard
                            key={doc.doc_id}
                            document={doc}
                            onDelete={() => handleDelete(doc.doc_id)}
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