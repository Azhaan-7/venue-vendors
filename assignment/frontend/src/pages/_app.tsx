import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { ChakraProvider, Box } from "@chakra-ui/react";
import Header from "@/components/Header";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/context/AuthContext";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <AuthProvider>
        <Box minH="100vh" display="flex" flexDirection="column">
          <Header/>
          <Navigation/>
          <Box flex="1">
            <Component {...pageProps} />
          </Box>
          <Footer/>
        </Box>
      </AuthProvider>      
    </ChakraProvider>
  );
}
