import type { Metadata } from "next";
import Header from "@/components/header";
import Buzzer from "@/components/buzzer";
import { firebaseClientConfig, getSession } from "@/auth";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}): Promise<Metadata> {
  const { room } = await searchParams;
  return {
    title: "Quiz buzzer",
    description: "Join a room and buzz in with friends.",
    openGraph: {
      title: "Quiz buzzer | Almost Yellow",
      description: "Join a room and buzz in with friends.",
      type: "website",
      siteName: "Almost Yellow",
      url: "https://www.almostyellow.co.uk/games/buzzer",
      images: [
        {
          url: "https://www.almostyellow.co.uk/images/almo-border.png",
          alt: "Almost Yellow mascot",
        },
      ],
    },
    alternates: { canonical: "https://www.almostyellow.co.uk/games/buzzer" },
    robots: room ? { index: false, follow: false } : undefined,
  };
}
export default async function BuzzerPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const session = await getSession();
  return (
    <>
      <Header noCrumbs game />
      <main id="main-content">
        <Buzzer
          config={firebaseClientConfig()}
          initialCode={room ?? ""}
          host={!!session}
        />
      </main>
    </>
  );
}
