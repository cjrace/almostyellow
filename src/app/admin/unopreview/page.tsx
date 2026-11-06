import type { Metadata } from "next";
import { Title } from "@mantine/core";
import Header from "@/components/header";
import UnoPreview from "@/components/unopreview";
import layout from "@/styles/cardgame.module.css";

export const metadata: Metadata = {
  title: "Uno table preview",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin" },
  { title: "Uno table preview", href: "" },
];

// Synthetic tables for checking the Uno layouts before the game is playable.
// Admin only, so it stays out of the sitemap and search engines.
export default function UnoPreviewPage() {
  return (
    <div className={layout.screen}>
      <Header crumbs={crumbitems} nativeBreadcrumbs />

      <main id="main-content">
        <Title mb="sm">Uno table preview</Title>
        <UnoPreview />
      </main>
    </div>
  );
}
