import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import UnoTracker from "@/components/unotracker";
import ViewportHeight from "@/components/viewportheight";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Uno tracker",
  "Keeping score in Cam and Laura's never-ending Uno rivalry.",
);
export default function UnoPage() {
  return (
    <div className={layout.screen}>
      <ViewportHeight />
      <Header noCrumbs game />
      <main id="main-content">
        <UnoTracker />
      </main>
    </div>
  );
}
