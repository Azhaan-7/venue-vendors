import { Box, Heading, Text } from "@chakra-ui/react";

export default function About() {
  return <Box maxW="900px" mx="auto" p={6}>
    <Heading mb={4}>About Us</Heading>
    <Text mb={3}>Venue Vendors started as an assignment in the Full Stack Development course at RMIT University, Semester 1, 2026.</Text>
    <Text mb={3}>Original group members: Dilushi Mirthula Rajendran and Azhaanul Haque Farooqui.</Text>
    <Text mb={3}>Copyright © 2026 RMIT University. Published and self-hosted with the original course lecturer’s permission, subject to attribution.</Text>
    <Text>This portfolio project demonstrates venue applications and administration. Use demonstration documents only; do not upload real identity documents.</Text>
  </Box>;
}
