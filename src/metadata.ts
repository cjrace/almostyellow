import type { Metadata } from "next";

// A page's own metadata replaces the layout's openGraph, so each page gets the
// full set, including the picture from src/app/opengraph-image.tsx
export function pageMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} | Almost Yellow`,
      description,
      type: "website",
      siteName: "Almost Yellow",
      images: "/opengraph-image",
    },
  };
}
