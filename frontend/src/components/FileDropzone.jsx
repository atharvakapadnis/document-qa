import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Box, Text, Icon, VStack, List, ListItem, Flex,
    Progress, IconButton, Badge
} from '@chakra-ui/react';
import { FiUploadCloud, FiFile, FiX } from 'react-icons/fi';

const FileDropzone = ({ onFileAccepted, isUploading, maxSize = 50 * 1024 * 1024 }) => {
    const [files, setFiles] = useState([]);

    // Handle file drop
    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles?.length) {
            setFiles(acceptedFiles);
            onFileAccepted(acceptedFiles);
        }
    }, [onFileAccepted]);

    // Configure dropzone
    const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
        onDrop,
        maxSize,
        maxFiles: 1,
        accept: {
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/msword': ['.doc'],
            'text/plain': ['.txt'],
            'text/csv': ['.csv'],
        },
    });

    // Format file size
    const formatFileSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Remove file from list
    const removeFile = (file) => {
        setFiles(files.filter(f => f !== file));
    };

    // Get file extension
    const getFileExt = (filename) => {
        return filename.split('.').pop().toLowerCase();
    };

    // Get color based on file type
    const getFileColor = (ext) => {
        switch (ext) {
            case 'pdf': return 'red.500';
            case 'docx':
            case 'doc': return 'blue.500';
            case 'txt': return 'gray.500';
            case 'csv': return 'green.500';
            default: return 'gray.400';
        }
    };

    return (
        <Box>
            <Box
                {...getRootProps()}
                p={6}
                borderWidth={2}
                borderRadius="md"
                borderStyle="dashed"
                borderColor={isDragActive ? 'blue.400' : 'gray.200'}
                bg="gray.50"
                textAlign="center"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ borderColor: 'blue.300' }}
            >
                <input {...getInputProps()} />
                <VStack spacing={2}>
                    <Icon as={FiUploadCloud} boxSize={10} color="blue.500" />
                    {isDragActive ? (
                        <Text fontWeight="medium">Drop the files here...</Text>
                    ) : (
                        <>
                            <Text fontWeight="medium">Drag & drop files here, or click to select files</Text>
                            <Text fontSize="sm" color="gray.500">
                                Supported formats: PDF, DOCX, TXT, CSV (Max {formatFileSize(maxSize)})
                            </Text>
                        </>
                    )}
                </VStack>
            </Box>

            {/* Error messages */}
            {fileRejections.length > 0 && (
                <Box mt={2} p={2} bg="red.50" color="red.500" borderRadius="md">
                    <Text fontWeight="medium">Error:</Text>
                    <List fontSize="sm">
                        {fileRejections.map(({ file, errors }) => (
                            <ListItem key={file.path}>
                                {file.path} - {errors.map(e => e.message).join(', ')}
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            {/* File list */}
            {files.length > 0 && (
                <List spacing={2} mt={4}>
                    {files.map((file) => (
                        <ListItem key={file.path}>
                            <Flex
                                p={2}
                                bg="white"
                                borderWidth={1}
                                borderRadius="md"
                                align="center"
                            >
                                <Icon
                                    as={FiFile}
                                    mr={2}
                                    color={getFileColor(getFileExt(file.name))}
                                />
                                <Box flex="1">
                                    <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                                        {file.name}
                                    </Text>
                                    <Text fontSize="xs" color="gray.500">
                                        {formatFileSize(file.size)}
                                    </Text>
                                </Box>
                                <Badge colorScheme="blue" mr={2}>
                                    {getFileExt(file.name).toUpperCase()}
                                </Badge>
                                <IconButton
                                    icon={<FiX />}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => removeFile(file)}
                                    aria-label="Remove file"
                                    isDisabled={isUploading}
                                />
                            </Flex>
                            {isUploading && (
                                <Progress
                                    size="xs"
                                    isIndeterminate
                                    colorScheme="blue"
                                    mt={1}
                                />
                            )}
                        </ListItem>
                    ))}
                </List>
            )}
        </Box>
    );
};

export default FileDropzone;