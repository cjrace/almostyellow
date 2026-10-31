import { createTheme, type CSSVariablesResolver } from "@mantine/core";

export const acalat = createTheme({
  primaryColor: "orange",

  // Pick black or white text on filled colours, whichever contrasts more.
  // White wins below a luminance of about 0.18, rather than Mantine's 0.3,
  // so text on orange, red and green meets WCAG AA's 4.5:1.
  autoContrast: true,
  luminanceThreshold: 0.18,

  // Skip transitions for anyone who has asked for less motion
  respectReducedMotion: true,

  // Set rounding for buttons and inputs
  defaultRadius: "lg",

  // Set cursor, mainly for the checkbox list
  cursorType: "pointer",
});

// Mantine's dimmed grey, error red and light-scheme links are below WCAG AA's
// 4.5:1 contrast for normal text, so use darker or lighter shades
export const acalatCssVariables: CSSVariablesResolver = (theme) => ({
  variables: {},
  light: {
    "--mantine-color-dimmed": theme.colors.gray[7],
    "--mantine-color-error": theme.colors.red[9],
    "--mantine-color-anchor": "#c2410c",
    "--mantine-primary-color-light-color": "#c2410c",
    "--mantine-color-orange-light-color": "#c2410c",
    "--mantine-color-blue-outline": theme.colors.blue[8],
    "--mantine-color-green-outline": "#2f7a3b",
    "--mantine-color-red-outline": theme.colors.red[9],
  },
  dark: {
    "--mantine-color-dimmed": theme.colors.dark[1],
    "--mantine-color-error": theme.colors.red[5],
  },
});
