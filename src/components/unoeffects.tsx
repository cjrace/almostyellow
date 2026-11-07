"use client";

import { useEffect, useRef } from "react";
import { Paper, Text } from "@mantine/core";
import type { Card } from "@/unogame/engine/cards";
import type { TableAlert } from "@/unogame/alerts";
import { UnoCard } from "@/components/unocard";
import styles from "@/styles/unotable.module.css";

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const rectOf = (selector: string) =>
  document.querySelector(selector)?.getBoundingClientRect();

// What happened on the last move, in the middle of the table: cards to pick
// up, missed goes, Uno calls. It is for the eyes only, as the live region
// already reads the same events out, so it never takes focus.
export function UnoAlert({
  alerts,
  onDismiss,
}: {
  alerts: TableAlert[];
  onDismiss: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onDismiss]);
  const special = alerts.some((a) => a.tone === "special");
  return (
    <div
      className={special ? styles.alertBackdrop : styles.alertTop}
      aria-hidden="true"
      onClick={onDismiss}
    >
      <Paper
        withBorder
        shadow="xl"
        p={special ? "xl" : "sm"}
        className={styles.alertBox}
      >
        {alerts.map((alert) => (
          <Text
            key={alert.text}
            ta="center"
            fw={700}
            size={special ? "xl" : "md"}
          >
            {alert.text}
          </Text>
        ))}
      </Paper>
    </div>
  );
}

// A copy of the card you just played, flying from your hand to the discard pile
export function FlyingCard({
  card,
  from,
  onDone,
}: {
  card: Card;
  from: DOMRect;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const to = rectOf('[data-uno-pile="discard"]');
    if (!element || !to) {
      onDone();
      return;
    }
    const animation = element.animate(
      [
        { transform: "none" },
        {
          transform: `translate(${String(to.left - from.left)}px, ${String(to.top - from.top)}px) scale(${String(to.width / from.width)})`,
        },
      ],
      { duration: 320, easing: "ease-in", fill: "forwards" },
    );
    animation.onfinish = onDone;
    return () => {
      animation.cancel();
    };
  }, [from, onDone]);
  return (
    <div
      ref={ref}
      className={styles.flying}
      aria-hidden="true"
      style={{
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
        transformOrigin: "top left",
      }}
    >
      <UnoCard card={card} decorative />
    </div>
  );
}

// A card you drew: it is lifted off the draw pile, turned over so you can see
// it, then moves into your hand
export function DrawReveal({
  card,
  onDone,
}: {
  card: Card;
  onDone: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const start = rectOf('[data-uno-pile="draw"]');
    if (!element || !start) {
      onDone();
      return;
    }
    const target = rectOf(`[data-uno-card="${String(card.id)}"]`);
    const move = target
      ? `translate(${String(target.left + target.width / 2 - (start.left + start.width / 2))}px, ${String(target.top + target.height / 2 - (start.top + start.height / 2))}px) scale(${String(target.width / start.width)}) `
      : "";
    const animation = element.animate(
      [
        { transform: "translateY(0) rotateY(0deg)" },
        { transform: "translateY(-40px) rotateY(180deg)", offset: 0.4 },
        { transform: "translateY(-40px) rotateY(180deg)", offset: 0.65 },
        { transform: `${move}rotateY(180deg)` },
      ],
      { duration: 1100, easing: "ease-in-out", fill: "forwards" },
    );
    animation.onfinish = onDone;
    return () => {
      animation.cancel();
    };
  }, [card.id, onDone]);
  const start = rectOf('[data-uno-pile="draw"]');
  if (!start) return null;
  return (
    <div className={styles.reveal} aria-hidden="true">
      <div
        ref={ref}
        className={styles.revealCard}
        style={{
          left: start.left,
          top: start.top,
          width: start.width,
          height: start.height,
        }}
      >
        <div className={styles.revealBack}>
          <UnoCard card={null} decorative />
        </div>
        <div className={styles.revealFront}>
          <UnoCard card={card} decorative />
        </div>
      </div>
    </div>
  );
}
