// Approved original Mantine fills for buttons, badges and selected choices.
// Only white text on these exact colours is exempt; other text stays checked.
const originalFills = new Set([
  "#fd7e14",
  "#f76707",
  "#e8590c",
  "#d9480f", // orange 6–9
  "#fab005",
  "#f59f00",
  "#f08c00",
  "#e67700", // yellow 6–9
  "#40c057",
  "#37b24d",
  "#2f9e44",
  "#2b8a3e", // green 6–9
  "#fa5252",
  "#f03e3e",
  "#e03131",
  "#c92a2a", // red 6–9
  "#228be6",
  "#1c7ed6",
  "#1971c2",
  "#1864ab", // blue 6–9
]);

function hexColour(value: unknown) {
  if (typeof value !== "string") return "";
  const hex = value.toLowerCase();
  return /^#[0-9a-f]{3}$/.test(hex)
    ? `#${hex
        .slice(1)
        .split("")
        .map((digit) => digit + digit)
        .join("")}`
    : hex;
}

export function isApprovedContrastPair(
  foreground: unknown,
  background: unknown,
) {
  return (
    hexColour(foreground) === "#ffffff" &&
    originalFills.has(hexColour(background))
  );
}
