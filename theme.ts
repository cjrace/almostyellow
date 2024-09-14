import { createTheme } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "orange",
  fontFamily: "Helvetica, sans-serif",
  components: {
    Button: {
      styles: (theme: any) => ({
        root: {
          "--mantine-color-default-hover": "#fffa5d",
          borderRadius: "var(--mantine-radius-xl)",
        },
      }),
    },
  },
});
