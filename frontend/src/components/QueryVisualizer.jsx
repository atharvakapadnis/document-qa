import React, { useState, useEffect } from 'react';
import {
    Box, Text, Heading, Flex, Tag, Progress, Select,
    Tabs, TabList, TabPanels, Tab, TabPanel, useColorMode,
    Button, Icon, Collapse
} from '@chakra-ui/react';
import {
    PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#83a6ed', '#8dd1e1'];

const QueryVisualizer = ({ sources, confidence, queryTime }) => {
    const [sourceStats, setSourceStats] = useState([]);
    const [pageStats, setPageStats] = useState([]);
    const [visualizationType, setVisualizationType] = useState('sources');
    const { colorMode } = useColorMode();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (sources && sources.length > 0) {
            // Process source statistics
            const sourceMap = {};
            sources.forEach(source => {
                const filename = source.filename || 'Unknown';
                if (!sourceMap[filename]) {
                    sourceMap[filename] = { name: filename, count: 0 };
                }
                sourceMap[filename].count += 1;
            });
            setSourceStats(Object.values(sourceMap));

            // Process page statistics
            const pageMap = {};
            sources.forEach(source => {
                if (!source.page) return;

                const pageKey = `Page ${source.page}`;
                if (!pageMap[pageKey]) {
                    pageMap[pageKey] = { name: pageKey, count: 0 };
                }
                pageMap[pageKey].count += 1;
            });
            setPageStats(Object.values(pageMap).sort((a, b) => {
                const aNum = parseInt(a.name.split(' ')[1]);
                const bNum = parseInt(b.name.split(' ')[1]);
                return aNum - bNum;
            }));
        }
    }, [sources]);

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <Box
            bg={colorMode === 'dark' ? 'gray.700' : 'white'}
            p={4}
            borderRadius="md"
            boxShadow="sm"
            mb={4}
            borderWidth={1}
            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
        >
            {/* Summary header that's always visible */}
            <Flex
                justify="space-between"
                align="center"
                onClick={toggleOpen}
                cursor="pointer"
                _hover={{ bg: colorMode === 'dark' ? 'gray.600' : 'gray.50' }}
                p={2}
                borderRadius="md"
            >
                <Heading
                    size="md"
                    color={colorMode === 'dark' ? 'white' : 'gray.800'}
                >
                    Query Results Analysis
                </Heading>

                <Flex align="center">
                    <Flex align="center" mr={4}>
                        <Text mr={2} fontWeight="bold" fontSize="sm" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                            Confidence:
                        </Text>
                        <Progress
                            value={confidence * 100}
                            colorScheme={confidence > 0.7 ? "green" : confidence > 0.4 ? "yellow" : "red"}
                            borderRadius="md"
                            size="sm"
                            width="60px"
                            bg={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                        />
                        <Text ml={2} fontSize="sm" color={colorMode === 'dark' ? 'white' : 'gray.800'}>
                            {(confidence * 100).toFixed(0)}%
                        </Text>
                    </Flex>

                    <Icon
                        as={isOpen ? FiChevronUp : FiChevronDown}
                        boxSize={5}
                        color={colorMode === 'dark' ? 'gray.300' : 'gray.500'}
                    />
                </Flex>
            </Flex>

            {/* Collapsible content */}
            <Collapse in={isOpen} animateOpacity>
                <Box pt={4}>
                    <Text
                        mb={4}
                        color={colorMode === 'dark' ? 'gray.200' : 'gray.800'}
                    >
                        Query processed in {queryTime.toFixed(2)} seconds
                    </Text>

                    <Select
                        mb={4}
                        value={visualizationType}
                        onChange={(e) => setVisualizationType(e.target.value)}
                        bg={colorMode === 'dark' ? 'gray.800' : 'white'}
                        color={colorMode === 'dark' ? 'white' : 'gray.800'}
                        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                        _hover={{
                            borderColor: colorMode === 'dark' ? 'blue.300' : 'blue.500',
                        }}
                    >
                        <option value="sources">Source Distribution</option>
                        <option value="pages">Page Distribution</option>
                    </Select>

                    <Tabs
                        variant="line"
                        colorScheme="blue"
                        borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                    >
                        <TabList>
                            <Tab
                                color={colorMode === 'dark' ? 'gray.200' : 'gray.600'}
                                _selected={{
                                    color: colorMode === 'dark' ? 'white' : 'blue.600',
                                    borderColor: 'blue.500'
                                }}
                            >
                                Chart
                            </Tab>
                            <Tab
                                color={colorMode === 'dark' ? 'gray.200' : 'gray.600'}
                                _selected={{
                                    color: colorMode === 'dark' ? 'white' : 'blue.600',
                                    borderColor: 'blue.500'
                                }}
                            >
                                Table
                            </Tab>
                        </TabList>

                        <TabPanels>
                            <TabPanel>
                                <Box height="300px">
                                    {visualizationType === 'sources' ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={sourceStats}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                    outerRadius={80}
                                                    fill="#8884d8"
                                                    dataKey="count"
                                                >
                                                    {sourceStats.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value) => [`${value} references`, 'Count']} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={pageStats}
                                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke={colorMode === 'dark' ? 'gray.600' : 'gray.200'} />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={{ fill: colorMode === 'dark' ? 'white' : 'gray.800' }}
                                                />
                                                <YAxis
                                                    tick={{ fill: colorMode === 'dark' ? 'white' : 'gray.800' }}
                                                />
                                                <Tooltip
                                                    formatter={(value) => [`${value} references`, 'Count']}
                                                    contentStyle={{
                                                        backgroundColor: colorMode === 'dark' ? '#2D3748' : '#FFF',
                                                        color: colorMode === 'dark' ? '#FFF' : '#1A202C',
                                                        border: colorMode === 'dark' ? '1px solid #4A5568' : '1px solid #E2E8F0'
                                                    }}
                                                />
                                                <Legend
                                                    formatter={(value) => (
                                                        <span style={{ color: colorMode === 'dark' ? '#FFF' : '#1A202C' }}>
                                                            {value}
                                                        </span>
                                                    )}
                                                />
                                                <Bar dataKey="count" fill="#8884d8">
                                                    {pageStats.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </Box>
                            </TabPanel>

                            <TabPanel>
                                <Box overflowX="auto">
                                    <Box
                                        as="table"
                                        width="100%"
                                        style={{
                                            borderCollapse: 'collapse',
                                            color: colorMode === 'dark' ? 'white' : 'inherit'
                                        }}
                                    >
                                        <Box as="thead">
                                            <Box as="tr">
                                                <Box
                                                    as="th"
                                                    padding="8px"
                                                    textAlign="left"
                                                    borderBottom="1px solid"
                                                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                                >
                                                    {visualizationType === 'sources' ? 'Source' : 'Page'}
                                                </Box>
                                                <Box
                                                    as="th"
                                                    padding="8px"
                                                    textAlign="right"
                                                    borderBottom="1px solid"
                                                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                                >
                                                    References
                                                </Box>
                                                <Box
                                                    as="th"
                                                    padding="8px"
                                                    textAlign="right"
                                                    borderBottom="1px solid"
                                                    borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                                >
                                                    Percentage
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box as="tbody">
                                            {(visualizationType === 'sources' ? sourceStats : pageStats).map((item, index) => {
                                                const total = (visualizationType === 'sources' ? sourceStats : pageStats)
                                                    .reduce((sum, i) => sum + i.count, 0);
                                                const percentage = (item.count / total) * 100;

                                                return (
                                                    <Box as="tr" key={index}>
                                                        <Box
                                                            as="td"
                                                            padding="8px"
                                                            textAlign="left"
                                                            borderBottom="1px solid"
                                                            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                                        >
                                                            {item.name}
                                                        </Box>
                                                        <Box
                                                            as="td"
                                                            padding="8px"
                                                            textAlign="right"
                                                            borderBottom="1px solid"
                                                            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                                        >
                                                            {item.count}
                                                        </Box>
                                                        <Box
                                                            as="td"
                                                            padding="8px"
                                                            textAlign="right"
                                                            borderBottom="1px solid"
                                                            borderColor={colorMode === 'dark' ? 'gray.600' : 'gray.200'}
                                                        >
                                                            {percentage.toFixed(1)}%
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    </Box>
                                </Box>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </Box>
            </Collapse>
        </Box>
    );
};

export default QueryVisualizer;