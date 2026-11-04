"use client";

import { useEffect } from "react";

// Marks the page once React has taken it over. Anything typed into a form
// before then is put back to the starting value, so the Playwright tests wait
// for this before using a page (tests/playwright.ts)
export default function Hydrated() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "";
  }, []);
  return null;
}
