import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider, Box } from "@chakra-ui/react";
import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";
import { ApolloProvider } from "@apollo/client/react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";


const client = new ApolloClient({
  link: new HttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  }),
  cache: new InMemoryCache(),
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <ApolloProvider client={client}>
          <Box minH="100vh" display="flex" flexDirection="column">
            <Header />
            <Navigation />
            <Box flex="1">
              <Component {...pageProps} />
            </Box>
            <Footer />
          </Box>
      </ApolloProvider>
    </ChakraProvider>
  );
}