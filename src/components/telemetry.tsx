"use client";

import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

function isCounter(pathname: string) {
  return pathname.replace(/\/$/, "") === "/tools/word-counter";
}

export function excludeCounterEvent<T extends { url: string }>(
  event: T,
): T | null {
  // Scripts remain loaded after client navigation. Check at send time too,
  // including delayed performance events from a previous counter visit.
  if (
    isCounter(window.location.pathname) ||
    isCounter(new URL(event.url, window.location.origin).pathname)
  )
    return null;
  return event;
}

export default function Telemetry() {
  const pathname = usePathname();
  if (isCounter(pathname)) return null;
  return (
    <>
      <Analytics beforeSend={excludeCounterEvent} />
      <SpeedInsights beforeSend={excludeCounterEvent} />
    </>
  );
}
