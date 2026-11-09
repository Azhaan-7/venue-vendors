import NextLink from "next/link";
import Image from "next/image";
import { Box, Button, Flex, Heading, Text, Stack } from "@chakra-ui/react";
import { useAuth } from "@/context/AuthContext";

export default function HomeContent() {
  const { user } = useAuth();
  const workspace = user?.role === "vendor" ? "/vendor" : "/hirer";
  return (
    <Box px={{ base: 4, md: 6 }} pt={{ base: 8, md: 12 }} pb={10}>
      <Flex align="end" justify="space-between" gap={8} flexWrap="wrap" mb={{ base: 7, md: 10 }}>
        <Heading as="h1" fontSize={{ base: "3rem", md: "5rem" }} lineHeight={1.03} fontWeight={400} maxW="780px">A place for your<br />next gathering.</Heading>
        <Box maxW="320px" pb={1}>
          <Text color="gray.600" mb={5}>Find a space that fits your plans. Compare venues, rank your favourites and send your event details to the people who know them best.</Text>
          <Button as={NextLink} href={user ? workspace : "/signup"} size="lg">{user?.role === "vendor" ? "Open your workspace" : "Find a venue"}</Button>
          {!user && <Text mt={3} fontSize="sm" color="gray.600">Create an account to browse and apply.</Text>}
        </Box>
      </Flex>
      <Box as="figure" m={0}>
        <Box position="relative" h={{ base: "300px", md: "460px" }} overflow="hidden" borderRadius="16px" className="venue-opening">
          <Image src="/images/v1.jpg" alt="A timber event space with draped fabric, chandeliers and warm lighting" fill priority sizes="(max-width: 1200px) 100vw, 1152px" style={{ objectFit: "cover", objectPosition: "center 52%" }} />
        </Box>
        <Text as="figcaption" fontSize="sm" color="gray.600" mt={3}>Venue inspiration · A setting for a celebration, a conversation, a new memory.</Text>
      </Box>
      <Stack direction={{ base: "column", md: "row" }} spacing={{ base: 8, md: 16 }} py={{ base: 10, md: 14 }} borderBottomWidth="1px" borderColor="gray.200">
        <Heading as="h2" fontSize={{ base: "2rem", md: "2.75rem" }} fontWeight={400} flex="1">Good gatherings<br />start with a good fit.</Heading>
        <Box flex="1"><Text fontSize="lg" mb={4}>Your event. Your shortlist.</Text><Text color="gray.600">Search by location, capacity or occasion. Put your preferred spaces in order, add your event details and submit an application. Track the vendor’s decision in your workspace.</Text></Box>
      </Stack>
      <Flex py={10} justify="space-between" align="center" gap={6} flexWrap="wrap">
        <Box maxW="650px"><Heading as="h2" size="lg" mb={3}>A space to share?</Heading><Text color="gray.600">Vendors can manage venues, review applicants and documents, and confirm suitable bookings from one workspace.</Text></Box>
        <Button as={NextLink} href={user ? workspace : "/signup"} variant="outline">{user ? "Go to workspace" : "Join as a vendor"}</Button>
      </Flex>
    </Box>
  );
}
