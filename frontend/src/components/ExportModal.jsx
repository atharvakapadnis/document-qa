import React, { useState } from 'react';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    FormControl,
    FormLabel,
    Switch,
    Text,
    useColorMode,
    VStack,
    Icon,
    Divider,
    Badge
} from '@chakra-ui/react';
import { FiDownload, FiFileText, FiCheckCircle } from 'react-icons/fi';
import { exportChatToExcel } from '../api/exports';

const ExportModal = ({
    isOpen,
    onClose,
    chatId,
    chatTitle,
    messagesCount = 0,
    onExportSuccess,
    onExportError
}) => {
    const { colorMode } = useColorMode();
    const [isExporting, setIsExporting] = useState(false);
    const [includeConfidence, setIncludeConfidence] = useState(true);
    const [includeSources, setIncludeSources] = useState(true);

    // Export function
    const handleExport = async () => {
        if (!chatId) return;

        setIsExporting(true);
        try {
            await exportChatToExcel(chatId, {
                includeConfidence,
                includeSources
            });

            if (onExportSuccess) {
                onExportSuccess('Chat has been exported to Excel');
            }

            onClose();
        } catch (error) {
            if (onExportError) {
                onExportError(error.message || 'Failed to export chat');
            }
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalOverlay />
            <ModalContent bg={colorMode === 'dark' ? 'gray.800' : 'white'}>
                <ModalHeader color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                    Export Chat to Excel
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <VStack spacing={4} align="start">
                        <Text color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>
                            Export Q&A pairs from "{chatTitle || 'this chat'}" to an Excel file
                        </Text>

                        <Divider />

                        <FormControl display="flex" alignItems="center">
                            <FormLabel htmlFor="include-confidence" mb="0" color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>
                                Include Confidence Scores
                            </FormLabel>
                            <Switch
                                id="include-confidence"
                                isChecked={includeConfidence}
                                onChange={(e) => setIncludeConfidence(e.target.checked)}
                                colorScheme="blue"
                            />
                        </FormControl>

                        <FormControl display="flex" alignItems="center">
                            <FormLabel htmlFor="include-sources" mb="0" color={colorMode === 'dark' ? 'gray.200' : 'gray.700'}>
                                Include Source Documents
                            </FormLabel>
                            <Switch
                                id="include-sources"
                                isChecked={includeSources}
                                onChange={(e) => setIncludeSources(e.target.checked)}
                                colorScheme="blue"
                            />
                        </FormControl>

                        <Divider />

                        <VStack spacing={2} align="start" w="full">
                            <Text color={colorMode === 'dark' ? 'gray.200' : 'gray.700'} fontSize="sm">
                                <Icon as={FiFileText} mr={2} />
                                File will contain:
                            </Text>
                            <Badge colorScheme="blue" ml={6}>
                                {messagesCount / 2} Q&A pairs
                            </Badge>
                            {messagesCount === 0 && (
                                <Text color="red.500" fontSize="sm" ml={6}>
                                    No messages to export
                                </Text>
                            )}
                        </VStack>
                    </VStack>
                </ModalBody>

                <ModalFooter>
                    <Button variant="ghost" mr={3} onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        colorScheme="blue"
                        onClick={handleExport}
                        leftIcon={<Icon as={FiDownload} />}
                        isLoading={isExporting}
                        loadingText="Exporting..."
                        isDisabled={messagesCount === 0}
                    >
                        Export
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default ExportModal;