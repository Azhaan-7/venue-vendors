import { extendTheme } from "@chakra-ui/react";

// Shared interaction conventions, with a distinct palette for this surface.
export const theme = extendTheme({
  fonts: { body: "Manrope, sans-serif", heading: "Manrope, sans-serif" },
  colors: { blue: { 50: "#eef2f4", 100: "#dfe6e9", 200: "#becdd3", 300: "#95a9b3", 400: "#6b8490", 500: "#4d6875", 600: "#3b5562", 700: "#2d4350", 800: "#203540", 900: "#152630" }, gray: { 50: "#f7f8f9", 100: "#eef0f2", 200: "#dde2e6", 300: "#bfc8d0", 400: "#8b98a3", 500: "#667581", 600: "#53616c", 700: "#3d4a54", 800: "#25323c", 900: "#17212a" } },
  styles: {
    global: {
      body: { bg: "gray.50", color: "gray.800", lineHeight: 1.6 },
      "::selection": { bg: "blue.100", color: "blue.900" },
      "input, textarea": { caretColor: "blue.600" },
      "h1, h2, h3": { textWrap: "balance" },
      "table": { fontVariantNumeric: "tabular-nums" },
      "tbody tr:hover": { bg: "gray.50" },
    },
  },
  components: {
    Heading: { baseStyle: { lineHeight: 1.2, fontWeight: 700, letterSpacing: "-0.015em" }, sizes: { xl: { fontSize: { base: "1.75rem", md: "2rem" } }, lg: { fontSize: { base: "1.25rem", md: "1.5rem" } } } },
    Button: { variants: { solid: ({ colorScheme }: { colorScheme: string }) => ({ bg: `${colorScheme}.700`, color: "white", _hover: { bg: `${colorScheme}.800`, _disabled: { bg: `${colorScheme}.700` } }, _active: { bg: `${colorScheme}.900` } }) }, defaultProps: { colorScheme: "blue" }, baseStyle: { borderRadius: "8px", fontWeight: 600, flexShrink: 0, _focusVisible: { outline: "3px solid", outlineColor: "blue.600", outlineOffset: "3px", boxShadow: "none" } }, sizes: { md: { minH: "44px", px: 5 }, sm: { minH: "36px", px: 3 } } },
    Input: { defaultProps: { focusBorderColor: "blue.600" }, variants: { outline: { field: { bg: "white", borderColor: "gray.300", _placeholder: { color: "gray.600" } } } } },
    Textarea: { defaultProps: { focusBorderColor: "blue.600" }, variants: { outline: { bg: "white", borderColor: "gray.300", _placeholder: { color: "gray.600" } } } },
    Select: { defaultProps: { focusBorderColor: "blue.600" }, variants: { outline: { field: { bg: "white", borderColor: "gray.300" } } } },
    FormLabel: { baseStyle: { mb: 2, fontSize: "sm", fontWeight: 600 } },
    Card: { baseStyle: { container: { bg: "white", borderWidth: "1px", borderColor: "gray.200", borderRadius: "lg", boxShadow: "none" } } },
    Table: { variants: { simple: { th: { bg: "gray.50", color: "gray.700", py: 3, letterSpacing: "0.03em" }, td: { py: 3, verticalAlign: "top", borderColor: "gray.200" } } } },
    Modal: { baseStyle: { dialog: { mx: { base: 3, md: 6 }, my: { base: 4, md: 12 }, borderRadius: "lg" }, header: { pr: 12 }, body: { px: { base: 4, md: 6 } } } },
    Spinner: { defaultProps: { color: "blue.600", label: "Loading" } },
  },
});
