"use client";

import { MantineProvider } from "@mantine/core";
import { acalat, acalatCssVariables } from "@/styles/acalat";

// The colour overrides are a function, which the server-rendered layout
// cannot pass to MantineProvider itself
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MantineProvider
      defaultColorScheme="dark"
      theme={acalat}
      cssVariablesResolver={acalatCssVariables}
    >
      {children}
    </MantineProvider>
  );
}
