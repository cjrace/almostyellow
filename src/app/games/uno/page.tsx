import type { Metadata } from "next";
import { Title } from "@mantine/core";
import Header from "@/components/header";
import Uno from "@/components/uno";
import { firebaseClientConfig, getSession } from "@/auth";
import { pageMetadata } from "@/metadata";
import layout from "@/styles/cardgame.module.css";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}): Promise<Metadata> {
  const { room } = await searchParams;
  return {
    ...pageMetadata(
      "Uno",
      "Almo has challenged you to Uno. Join the room and play.",
      {
        url: "/images/uno-challenge.jpg",
        width: 1200,
        height: 630,
        alt: "Almo the cow points and says: I challenge you to Uno!",
      },
    ),
    robots: room ? { index: false, follow: false } : undefined,
  };
}

export default async function UnoPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const session = await getSession();
  return (
    <div className={layout.screen}>
      <Header noCrumbs game title={<Title>Uno</Title>} />
      <main id="main-content">
        <Uno
          config={firebaseClientConfig()}
          initialCode={room ?? ""}
          host={!!session}
        />
      </main>
    </div>
  );
}
