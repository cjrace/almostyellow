import BackToTop from "@/components/backtotop";
import HolidayTimeline from "@/components/timeline";
import { Metadata } from "next";
import Header from "@/components/header";
import { Title } from "@mantine/core";

export const metadata: Metadata = {
  title: "Holidays",
  description: "A timeline of our adventures.",
  openGraph: {
    title: "Holidays | Almost Yellow",
    description: "A timeline of our adventures.",
  },
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Holidays", href: "" },
];

export default function HolidaysPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <main>
        <Title>Our trips and holidays</Title>
        <HolidayTimeline />
        <BackToTop />
      </main>
    </>
  );
}
