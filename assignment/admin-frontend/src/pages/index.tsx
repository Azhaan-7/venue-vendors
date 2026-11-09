import NextLink from "next/link";
import { Box, Button, Flex, Heading, Text, VStack, Spinner } from "@chakra-ui/react";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";

export default function AdminDashboard() {
  const { isAdmin, isCheckingAuth } = useRequireAdmin();
  if (isCheckingAuth || !isAdmin) return <Spinner display="block" mx="auto" mt={12} />;
  return <Box px={{ base: 4, md: 6 }} py={{ base: 8, md: 12 }}>
    <Heading as="h1" size="xl">Admin overview</Heading>
    <Text mt={3} color="gray.600" maxW="65ch">Keep venue listings up to date, assign vendors and review activity. Choose a workspace to get started.</Text>
    <VStack align="stretch" spacing={0} mt={10} borderTopWidth="1px" borderColor="gray.200">
      {[{ title: "Venue management", text: "Add and edit spaces, manage featured listings and assign the right vendor.", href: "/venues", action: "Manage venues" }, { title: "Activity reports", text: "Review popular venues and active applicant summaries, or export a PDF report.", href: "/reports", action: "View reports" }].map(item => <Flex key={item.href} py={8} borderBottomWidth="1px" borderColor="gray.200" align="center" justify="space-between" gap={6} flexWrap="wrap">
        <Box maxW="620px"><Heading as="h2" size="md" mb={3}>{item.title}</Heading><Text color="gray.600">{item.text}</Text></Box>
        <Button as={NextLink} href={item.href} variant={item.href === "/venues" ? "solid" : "outline"}>{item.action}</Button>
      </Flex>)}
    </VStack>
  </Box>;
}
