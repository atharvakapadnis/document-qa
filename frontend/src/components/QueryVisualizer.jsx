import React, { useState, useEffect } from 'react';
import {
    Box, Text, Heading, Flex, Tag, Progress, Select,
    Tabs, TabList, TabPanels, Tab, TabPanel
} from '@chakra-ui/react';
import {
    PieChart, Pie, BarChart, Bar, Cell, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#83a6ed', '#8dd1e1'];

const QueryVisualizer = ({ sources, confidence, queryTime }) => {
    const [sourceStats, setSourceStats] = useState([]);
    const [pageStats, setPageStats] = useState([]);
    const [visualizationType, setVisualizationType] = useState('sources');

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

    return (
        <Box bg="white" p={4} borderRadius="md" boxShadow="sm" mb={4}>
            <Heading size="md" mb={3}>Query Results Analysis</Heading>

            <Flex mb={4} alignItems="center">
                <Text fontWeight="bold" mr={2}>Confidence:</Text>
                <Box flex="1">
                    <Progress
                        value={confidence * 100}
                        colorScheme={confidence > 0.7 ? "green" : confidence > 0.4 ? "yellow" : "red"}
                        borderRadius="md"
                        size="sm"
                    />
                </Box>
                <Text ml={2}>{(confidence * 100).toFixed(0)}%</Text>
            </Flex>

            <Text mb={4}>Query processed in {queryTime.toFixed(2)} seconds</Text>

            <Select
                mb={4}
                value={visualizationType}
                onChange={(e) => setVisualizationType(e.target.value)}
            >
                <option value="sources">Source Distribution</option>
                <option value="pages">Page Distribution</option>
            </Select>

            <Tabs>
                <TabList>
                    <Tab>Chart</Tab>
                    <Tab>Table</Tab>
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
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip formatter={(value) => [`${value} references`, 'Count']} />
                                        <Legend />
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
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                                            {visualizationType === 'sources' ? 'Source' : 'Page'}
                                        </th>
                                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #E2E8F0' }}>
                                            References
                                        </th>
                                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #E2E8F0' }}>
                                            Percentage
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(visualizationType === 'sources' ? sourceStats : pageStats).map((item, index) => {
                                        const total = (visualizationType === 'sources' ? sourceStats : pageStats)
                                            .reduce((sum, i) => sum + i.count, 0);
                                        const percentage = (item.count / total) * 100;

                                        return (
                                            <tr key={index}>
                                                <td style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #E2E8F0' }}>
                                                    {item.name}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #E2E8F0' }}>
                                                    {item.count}
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #E2E8F0' }}>
                                                    {percentage.toFixed(1)}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </Box>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </Box>
    );
};

export default QueryVisualizer;