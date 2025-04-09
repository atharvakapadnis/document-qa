import React, { createContext, useContext, useState, useEffect } from 'react';

const ColorModeContext = createContext();

export const ColorModeProvider = ({ children }) => {
    const [colorMode, setColorMode] = useState('dark');

    // Initialize from localStorage or set to dark by default
    useEffect(() => {
        const savedMode = localStorage.getItem('colorMode') || 'dark';
        setColorMode(savedMode);
        document.documentElement.setAttribute('data-theme', savedMode);
    }, []);

    const toggleColorMode = () => {
        const newMode = colorMode === 'light' ? 'dark' : 'light';
        setColorMode(newMode);
        localStorage.setItem('colorMode', newMode);
        document.documentElement.setAttribute('data-theme', newMode);
    };

    return (
        <ColorModeContext.Provider value={{ colorMode, toggleColorMode }}>
            {children}
        </ColorModeContext.Provider>
    );
};

export const useColorMode = () => useContext(ColorModeContext);