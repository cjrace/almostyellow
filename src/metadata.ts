import type { Metadata } from "next";

// A picture of its own for a page's shared link, in place of the one from
// src/app/opengraph-image.tsx. Use 1200 by 630 pixels, and keep files well
// under 300 KB, as WhatsApp ignores big ones
export interface ShareImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

// A page's own metadata replaces the layout's openGraph, so each page gets the
// full set, including the picture from src/app/opengraph-image.tsx
export function pageMetadata(
  title: string,
  description: string,
  image?: ShareImage,
): Metadata {
  return {
    title,
    description,
    openGraph: {
      title: `${title} | Almost Yellow`,
      description,
      type: "website",
      siteName: "Almost Yellow",
      images: image ?? "/opengraph-image",
    },
  };
}
