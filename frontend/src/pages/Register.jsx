import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    Box, Button, FormControl, FormLabel, Input, VStack,
    Heading, Text, Link, useToast, FormErrorMessage,
    Container, InputGroup, InputRightElement, IconButton
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { register } from '../api/auth';

function Register() {
    const navigate = useNavigate();
    const toast = useToast();

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.username) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email is invalid';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            // Prepare data for API
            const userData = {
                username: formData.username,
                email: formData.email,
                password: formData.password
            };

            await register(userData);

            toast({
                title: 'Registration successful',
                description: 'You can now log in with your credentials',
                status: 'success',
                duration: 5000,
                isClosable: true,
            });

            navigate('/login');
        } catch (error) {
            toast({
                title: 'Registration failed',
                description: error.message,
                status: 'error',
                duration: 5000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container maxW="md" py={12}>
            <VStack spacing={8} align="stretch">
                <VStack spacing={3} align="center">
                    <Heading>Create an Account</Heading>
                    <Text color="gray.600">Sign up to get started with Document Q&A</Text>
                </VStack>

                <Box as="form" onSubmit={handleSubmit}>
                    <VStack spacing={4} align="stretch">
                        <FormControl isInvalid={!!errors.username}>
                            <FormLabel>Username</FormLabel>
                            <Input
                                name="username"
                                value={formData.username}
                                onChange={handleChange}
                                placeholder="Choose a username"
                            />
                            <FormErrorMessage>{errors.username}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.email}>
                            <FormLabel>Email</FormLabel>
                            <Input
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                            />
                            <FormErrorMessage>{errors.email}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.password}>
                            <FormLabel>Password</FormLabel>
                            <InputGroup>
                                <Input
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                />
                                <InputRightElement>
                                    <IconButton
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowPassword(!showPassword)}
                                    />
                                </InputRightElement>
                            </InputGroup>
                            <FormErrorMessage>{errors.password}</FormErrorMessage>
                        </FormControl>

                        <FormControl isInvalid={!!errors.confirmPassword}>
                            <FormLabel>Confirm Password</FormLabel>
                            <Input
                                name="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your password"
                            />
                            <FormErrorMessage>{errors.confirmPassword}</FormErrorMessage>
                        </FormControl>

                        <Button
                            type="submit"
                            colorScheme="blue"
                            size="lg"
                            isLoading={isLoading}
                            w="full"
                            mt={4}
                        >
                            Sign Up
                        </Button>
                    </VStack>
                </Box>

                <Text textAlign="center">
                    Already have an account?{' '}
                    <Link as={RouterLink} to="/login" color="blue.500">
                        Sign in
                    </Link>
                </Text>
            </VStack>
        </Container>
    );
}

export default Register;