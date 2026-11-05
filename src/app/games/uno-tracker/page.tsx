import { pageMetadata } from "@/metadata";
import Header from "@/components/header";
import UnoTracker from "@/components/unotracker";
import layout from "@/styles/cardgame.module.css";

export const metadata = pageMetadata(
  "Uno tracker",
  "Track Uno scores, follow the current game and see who is leading.",
);
export default function UnoPage() {
  return (
    <div className={layout.screen}>
      <Header noCrumbs game />
      <main id="main-content">
        <UnoTracker />
      </main>
    </div>
  );
}
