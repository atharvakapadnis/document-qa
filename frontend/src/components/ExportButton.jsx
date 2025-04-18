import React, { useState } from 'react';
import {
    IconButton,
    Icon,
    Tooltip,
    useDisclosure,
    useToast
} from '@chakra-ui/react';
import { FiDownload } from 'react-icons/fi';
import ExportModal from './ExportModal';

const ExportButton = ({ 
    chatId, 
    chatTitle, 
    messagesCount = 0, 
    isDisabled = false 
}) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const toast = useToast();

    const handleExportSuccess = (message) => {
        toast({
            title: 'Export Successful',
            description: message,
            status: 'success',
            duration: 3000,
            isClosable: true,
        });
    };

    const handleExportError = (message) => {
        toast({
            title: 'Export Failed',
            description: message,
            status: 'error',
            duration: 5000,
            isClosable: true,
        });
    };

    return (
        <>
            <Tooltip label="Export to Excel" placement="top">
                <IconButton
                    icon={<Icon as={FiDownload} />}
                    aria-label="Export to Excel"
                    onClick={onOpen}
                    variant="ghost"
                    isDisabled={isDisabled || !chatId || messagesCount === 0}
                    size="md"
                />
            </Tooltip>

            <ExportModal
                isOpen={isOpen}
                onClose={onClose}
                chatId={chatId}
                chatTitle={chatTitle}
                messagesCount={messagesCount}
                onExportSuccess={handleExportSuccess}
                onExportError={handleExportError}
            />
        </>
    );
};

export default ExportButton;