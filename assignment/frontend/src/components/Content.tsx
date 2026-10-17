import { Box, Heading, Text, VStack, HStack, SimpleGrid, Card, CardBody, Badge } from "@chakra-ui/react";

export default function HomeContent() {
  return (
    <Box px={{ base: 4, md: 6 }} py={{ base: 6, md: 8 }}>
        <VStack spacing={8} align="stretch">
            <Box textAlign="center" py={{ base: 6, md: 10 }}>
                <Heading mb={4}>Welcome to Venue Vendors</Heading>
                    <Text fontSize="lg" maxW="700px" mx="auto">Venue Vendors helps event organizers find, compare, and hire the right venues quickly and easily.</Text>
            </Box>

            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                <Card>
                    <CardBody>
                        <VStack align="start" spacing={3}>
                            <Badge colorScheme="blue">For Hirers</Badge>
                            <Heading size="md">Find and apply for venues</Heading>
                            <Text>
                            Browse available venues, ranking the preferred options, and submit event details such as date, time, guests, and duration. And finally view their hiring reputation based on the historical list of the previous venues. 
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>

                <Card>
                    <CardBody>
                        <VStack align="start" spacing={3}>
                            <Badge colorScheme="green">For Vendors</Badge>
                            <Heading size="md">Review and approve applicants</Heading>
                            <Text>
                            View applicant details based on their event requirements, check their hire history and complain documents, selecting the appropriate applicant, leave comments, and confirm bookings based on suitability and credibility.
                            </Text>
                        </VStack>
                    </CardBody>
                </Card>
            </SimpleGrid>

            <Box>
                <Heading size="md" mb={4}>How it works</Heading>
                <HStack spacing={0} gap={4} flexWrap="wrap" align="stretch">
                    <Card flex="1" minW="220px">
                        <CardBody>
                            <Text fontWeight="bold" mb={2}>1. Sign in</Text>
                            <Text>Create or use your account to access the correct dashboard.</Text>
                        </CardBody>
                    </Card>
                    <Card flex="1" minW="220px">
                        <CardBody>
                            <Text fontWeight="bold" mb={2}>2. Choose a role</Text>
                            <Text>Hirers apply for venues, while vendors manage applicants.</Text>
                        </CardBody>
                    </Card>
                    <Card flex="1" minW="220px">
                        <CardBody>
                            <Text fontWeight="bold" mb={2}>3. Confirm booking</Text>
                            <Text>Vendors review, comment, and approve the most suitable applicants.</Text>
                        </CardBody>
                    </Card>
                </HStack>
            </Box>
        </VStack>
    </Box>
  );
}