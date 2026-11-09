import "@/styles/globals.css";
import { theme } from "@/styles/theme";
import type { AppProps } from "next/app";
import { ChakraProvider, Box } from "@chakra-ui/react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";
import BackendWakeup from "@/components/BackendWakeup";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <AuthProvider>
        <BackendWakeup />
        <Box minH="100vh" display="flex" flexDirection="column">
          <a className="skip-link" href="#main-content">Skip to content</a>
          <Header/>
          <Navigation/>
          <Box as="main" id="main-content" flex="1" w="full" maxW="1200px" mx="auto" minW={0}>
            <Component {...pageProps} />
          </Box>
          <Footer/>
        </Box>
      </AuthProvider>      
    </ChakraProvider>
  );
}
