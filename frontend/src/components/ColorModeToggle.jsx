import React from 'react';
import { IconButton, useToast } from '@chakra-ui/react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useColorMode } from '../context/ColorModeContext';

const ColorModeToggle = () => {
    const { colorMode, toggleColorMode } = useColorMode();
    const toast = useToast();

    const handleToggle = () => {
        toggleColorMode();
        toast({
            title: `Switched to ${colorMode === 'light' ? 'dark' : 'light'} mode`,
            status: 'success',
            duration: 2000,
            isClosable: true,
            position: 'top-right'
        });
    };

    return (
        <IconButton
            aria-label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}
            icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
            onClick={handleToggle}
            variant="ghost"
            color={colorMode === 'light' ? 'gray.600' : 'yellow.300'}
            _hover={{
                bg: colorMode === 'light' ? 'gray.100' : 'gray.700'
            }}
        />
    );
};

export default ColorModeToggle;