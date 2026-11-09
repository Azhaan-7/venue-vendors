import NextLink from "next/link";
import { Flex, Link, Text } from "@chakra-ui/react";

export default function Header() {
  return <Flex as="header" maxW="1200px" w="full" mx="auto" px={{ base: 4, md: 6 }} pt={6} pb={3} direction="column" align="center" gap={1}>
    <Link as={NextLink} href="/" fontFamily="heading" fontSize={{ base: "3xl", md: "4xl" }} fontWeight={400} textDecoration="none">Venue Vendors</Link>
    <Text display={{ base: "none", md: "block" }} fontSize="sm" color="gray.600">Spaces for getting together.</Text>
  </Flex>;
}
