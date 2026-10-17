import { extendTheme } from "@chakra-ui/react";

// Keep the existing blue/neutral identity; share control and spacing conventions.
export const theme = extendTheme({
  fonts: { body: "Arial, Helvetica, sans-serif", heading: "Arial, Helvetica, sans-serif" },
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
    Heading: { baseStyle: { lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.015em" }, sizes: { xl: { fontSize: { base: "1.75rem", md: "2rem" } }, lg: { fontSize: { base: "1.25rem", md: "1.5rem" } } } },
    Button: { defaultProps: { colorScheme: "blue" }, baseStyle: { borderRadius: "md", fontWeight: 600, flexShrink: 0 }, sizes: { md: { minH: "44px", px: 5 }, sm: { minH: "36px", px: 3 } } },
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
