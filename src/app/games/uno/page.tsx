import type { Metadata } from "next";
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
    ...pageMetadata("Uno", "Play Uno online with friends in a private room."),
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
      <Header noCrumbs game />
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
