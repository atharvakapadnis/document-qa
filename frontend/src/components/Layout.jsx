import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
    Box, Flex, IconButton, Avatar, Menu, MenuButton, MenuList,
    MenuItem, Text, Heading, Divider, HStack, Icon, Drawer,
    DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody,
    VStack, Button, useDisclosure
} from '@chakra-ui/react';
import {
    FiHome, FiMessageSquare, FiLogOut, FiUser, FiMenu, FiX
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const SidebarLink = ({ to, icon, children, onClick }) => {
    return (
        <Box
            as={Link}
            to={to}
            w="full"
            borderRadius="md"
            p={2}
            _hover={{ bg: 'gray.100', textDecoration: 'none' }}
            _activeLink={{ bg: 'blue.50', color: 'blue.700', fontWeight: 'medium' }}
            onClick={onClick}
        >
            <HStack spacing={3}>
                <Icon as={icon} boxSize={5} />
                <Text>{children}</Text>
            </HStack>
        </Box>
    );
};

function Layout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const sidebarWidth = "240px";

    return (
        <Box minH="100vh">
            {/* Mobile header */}
            <Flex
                display={{ base: 'flex', md: 'none' }}
                align="center"
                justify="space-between"
                px={4}
                py={2}
                bg="white"
                borderBottomWidth={1}
                borderColor="gray.200"
                position="sticky"
                top={0}
                zIndex={10}
            >
                <IconButton
                    icon={<FiMenu />}
                    variant="ghost"
                    onClick={onOpen}
                    aria-label="Open Menu"
                />

                <Heading size="md">Document Q&A</Heading>

                <Menu>
                    <MenuButton
                        as={IconButton}
                        icon={<Avatar size="sm" name={user?.full_name || user?.username} />}
                        variant="ghost"
                        aria-label="User menu"
                    />
                    <MenuList>
                        <MenuItem icon={<FiUser />}>Profile</MenuItem>
                        <Divider />
                        <MenuItem icon={<FiLogOut />} onClick={handleLogout}>
                            Logout
                        </MenuItem>
                    </MenuList>
                </Menu>
            </Flex>

            {/* Mobile sidebar */}
            <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
                <DrawerOverlay />
                <DrawerContent>
                    <DrawerHeader borderBottomWidth={1}>
                        <Flex justify="space-between" align="center">
                            <Heading size="md">Document Q&A</Heading>
                            <IconButton
                                icon={<FiX />}
                                variant="ghost"
                                onClick={onClose}
                                aria-label="Close Menu"
                            />
                        </Flex>
                    </DrawerHeader>
                    <DrawerBody p={0}>
                        <VStack align="stretch" spacing={0} p={2}>
                            <SidebarLink to="/" icon={FiHome} onClick={onClose}>
                                Dashboard
                            </SidebarLink>
                            <SidebarLink to="/chat" icon={FiMessageSquare} onClick={onClose}>
                                Chat
                            </SidebarLink>
                            <Divider my={2} />
                            <Box p={2}>
                                <Text fontSize="sm" color="gray.500" mb={2}>
                                    User
                                </Text>
                                <HStack>
                                    <Avatar size="sm" name={user?.full_name || user?.username} />
                                    <Box>
                                        <Text fontWeight="medium">
                                            {user?.full_name || user?.username}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500">
                                            {user?.email}
                                        </Text>
                                    </Box>
                                </HStack>
                                <Button
                                    leftIcon={<FiLogOut />}
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                    mt={4}
                                    w="full"
                                >
                                    Logout
                                </Button>
                            </Box>
                        </VStack>
                    </DrawerBody>
                </DrawerContent>
            </Drawer>

            {/* Desktop layout */}
            <Flex h="100vh">
                {/* Sidebar */}
                <Box
                    w={sidebarWidth}
                    h="full"
                    bg="white"
                    borderRightWidth={1}
                    borderColor="gray.200"
                    py={4}
                    px={3}
                    display={{ base: 'none', md: 'block' }}
                    position="fixed"
                >
                    <Heading size="md" px={2} mb={6}>
                        Document Q&A
                    </Heading>

                    <VStack align="stretch" spacing={1} mb={6}>
                        <SidebarLink to="/" icon={FiHome}>
                            Dashboard
                        </SidebarLink>
                        <SidebarLink to="/chat" icon={FiMessageSquare}>
                            Chat
                        </SidebarLink>
                    </VStack>

                    <Divider mb={4} />

                    <Box px={2}>
                        <Text fontSize="sm" color="gray.500" mb={2}>
                            User Profile
                        </Text>
                        <Flex align="center" mb={3}>
                            <Avatar size="sm" name={user?.full_name || user?.username} mr={2} />
                            <Box>
                                <Text fontWeight="medium" fontSize="sm">
                                    {user?.full_name || user?.username}
                                </Text>
                                <Text fontSize="xs" color="gray.500">
                                    {user?.email}
                                </Text>
                            </Box>
                        </Flex>
                        <Button
                            leftIcon={<FiLogOut />}
                            variant="ghost"
                            size="sm"
                            onClick={handleLogout}
                            w="full"
                            justifyContent="flex-start"
                        >
                            Logout
                        </Button>
                    </Box>
                </Box>

                {/* Main content */}
                <Box
                    ml={{ base: 0, md: sidebarWidth }}
                    p={0}
                    w={{ base: 'full', md: `calc(100% - ${sidebarWidth})` }}
                    flex="1"
                >
                    <Box as="main" h="100%">
                        <Outlet />
                    </Box>
                </Box>
            </Flex>
        </Box>
    );
}

export default Layout;
