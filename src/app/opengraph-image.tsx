import { ImageResponse } from "next/og";

// The picture shown when a link to any page is shared
export const alt = "Almost Yellow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#242424",
        color: "#ffffff",
      }}
    >
      <div
        style={{
          fontSize: 140,
          fontWeight: 700,
          backgroundImage: "linear-gradient(to left, yellow, #e8590c)",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Almost Yellow
      </div>
      <div style={{ fontSize: 48, marginTop: 24 }}>
        Games, cocktails and the good stuff
      </div>
    </div>,
    size,
  );
}
