import BackToTop from "@/components/backtotop";
import HolidayTimeline from "@/components/timeline";
import { Metadata } from "next";
import Header from "@/components/header";

export const metadata: Metadata = {
  title: "Holidays",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Holidays", href: "" },
];

export default function HolidaysPage() {
  return (
    <>
      <Header crumbs={crumbitems} />

      <h1>Our trips and holidays</h1>

      <HolidayTimeline />
      <BackToTop />
    </>
  );
}
