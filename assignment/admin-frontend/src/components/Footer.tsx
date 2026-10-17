import { Box, Text } from "@chakra-ui/react";

export default function Footer() {
    return (
        <Box as="footer" bg="gray.100" borderTopWidth="1px" borderColor="gray.200" px={4} py={6} textAlign="center" mt={8} color="gray.700">
            <Text>© 2026 RMIT University.</Text>
            <Text fontSize="sm">Started as an assignment in the Full Stack Development course, Semester 1, 2026.</Text>
            <Text fontSize="sm">Original group: Dilushi Mirthula Rajendran and Azhaanul Haque Farooqui.</Text>
        </Box>     
    )
}