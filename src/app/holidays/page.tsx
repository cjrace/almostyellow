import { Breadcrumbs, Anchor } from "@mantine/core";
import BackToTop from "@/components/backtotop";
import HolidayTimeline from "@/components/timeline";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Holidays",
};

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Holidays", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

export default function HolidaysPage() {
  return (
    <>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

      <h1>Our trips and holidays</h1>

      <HolidayTimeline />
      <BackToTop />
    </>
  );
}
