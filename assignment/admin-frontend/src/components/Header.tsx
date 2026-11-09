import NextLink from "next/link";
import { Flex, Link, Text } from "@chakra-ui/react";
export default function Header() {
  return <Flex as="header" maxW="1200px" w="full" mx="auto" px={{ base: 4, md: 6 }} pt={6} pb={3} align="center" justify="space-between" gap={4}>
    <Link as={NextLink} href="/" fontWeight={800} fontSize="xl">Venue Vendors</Link>
    <Text fontSize="sm" color="gray.600">Administration</Text>
  </Flex>;
}
