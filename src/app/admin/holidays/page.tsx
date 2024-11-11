import BackToTop from "@/components/backtotop";
import HolidayTimeline from "@/components/timeline";
import { Metadata } from "next";
import Header from "@/components/header";
import { Title } from "@mantine/core";

export const metadata: Metadata = {
  title: "Holidays",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Admin", href: "/admin/" },
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
