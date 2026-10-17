import { Box, Heading } from "@chakra-ui/react";

export default function Header() {
    return (
        <Box bg="blue.600" color="white" px={4} py={{ base: 4, md: 5 }} textAlign="center">
            <Heading size="lg">Venue Vendors (VV) Web System</Heading>
        </Box>
    );
}