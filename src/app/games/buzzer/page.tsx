import type { Metadata } from "next";
import Header from "@/components/header";
import Buzzer from "@/components/buzzer";
import { firebaseClientConfig, getSession } from "@/auth";
import { pageMetadata } from "@/metadata";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}): Promise<Metadata> {
  const { room } = await searchParams;
  return {
    ...pageMetadata("Quiz buzzer", "Join a room and buzz in with friends."),
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
