import { describe, expect, it } from "vitest";
import {
  CARD_HEIGHT_SHARE,
  CARD_RATIO,
  COMFORT_ROWS,
  COMFORT_STEP,
  CORNER_STRIP,
  MIN_TARGET,
  MAX_CARD_WIDTH,
  MIN_CARD_WIDTH,
  ROW_STRIP,
  SHORT_MIN_CARD_WIDTH,
  SHORT_SCREEN,
  fanLayout,
} from "@/unogame/handlayout";

const sizes = [
  { width: 280, viewportHeight: 568 },
  { width: 320, viewportHeight: 568 },
  { width: 390, viewportHeight: 800 },
  { width: 768, viewportHeight: 1024 },
  { width: 1100, viewportHeight: 650 },
  // A small phone held sideways
  { width: 647, viewportHeight: 320 },
];
const counts = [0, 1, 2, 7, 15, 40, 70, 107];

describe("fanLayout", () => {
  for (const { width, viewportHeight } of sizes)
    for (const count of counts)
      it(`fits ${String(count)} cards in ${String(width)} pixels`, () => {
        const layout = fanLayout({ width, viewportHeight, count });
        const { cardWidth, positions } = layout;
        expect(positions).toHaveLength(count);
        expect(cardWidth).toBeGreaterThanOrEqual(
          viewportHeight < SHORT_SCREEN ? SHORT_MIN_CARD_WIDTH : MIN_CARD_WIDTH,
        );
        expect(cardWidth).toBeLessThanOrEqual(MAX_CARD_WIDTH);

        for (const { left, top } of positions) {
          // Inside the space, with no scrolling
          expect(left).toBeGreaterThanOrEqual(-0.5);
          expect(left + cardWidth).toBeLessThanOrEqual(width + 0.5);
          expect(top + cardWidth * CARD_RATIO).toBeLessThanOrEqual(
            layout.height,
          );
        }
        positions.forEach((position, index) => {
          const next = positions[index + 1] as
            { left: number; top: number } | undefined;
          if (!next) return;
          if (next.top === position.top) {
            // The corner strip of every card is clear of the next card
            expect(next.left - position.left).toBeGreaterThanOrEqual(
              Math.max(cardWidth * CORNER_STRIP, MIN_TARGET) - 0.5,
            );
          } else {
            // A new row starts below, leaving the top strip showing
            expect(next.top - position.top).toBeGreaterThanOrEqual(
              Math.max(cardWidth * CARD_RATIO * ROW_STRIP, MIN_TARGET) - 0.5,
            );
          }
        });
      });

  it("keeps a small hand in one row, centred", () => {
    const { positions, cardWidth } = fanLayout({
      width: 600,
      viewportHeight: 800,
      count: 3,
    });
    expect(new Set(positions.map((p) => p.top)).size).toBe(1);
    const used = positions[2].left + cardWidth - positions[0].left;
    expect(positions[0].left).toBeCloseTo((600 - used) / 2, 0);
  });

  it("on a tall phone, wraps a big hand into rows so each card shows at least 40 pixels", () => {
    const seven = fanLayout({ width: 390, viewportHeight: 800, count: 7 });
    expect(new Set(seven.positions.map((p) => p.top)).size).toBe(1);
    for (const count of [10, 12, 18, 27]) {
      const { positions } = fanLayout({
        width: 390,
        viewportHeight: 800,
        count,
      });
      const rows = new Set(positions.map((p) => p.top)).size;
      expect(rows).toBeGreaterThan(1);
      expect(rows).toBeLessThanOrEqual(COMFORT_ROWS);
      positions.forEach((position, index) => {
        const next = positions[index + 1] as typeof position | undefined;
        if (next?.top === position.top)
          expect(next.left - position.left).toBeGreaterThanOrEqual(
            COMFORT_STEP - 0.5,
          );
      });
    }
    // Rows are balanced: 10 cards are two rows of five
    const ten = fanLayout({ width: 390, viewportHeight: 800, count: 10 });
    expect(
      ten.positions.filter((p) => p.top === ten.positions[0].top),
    ).toHaveLength(5);
  });

  it("on a short screen, wraps only when the corner strips cannot fit in one row", () => {
    const one = fanLayout({ width: 640, viewportHeight: 360, count: 12 });
    expect(new Set(one.positions.map((p) => p.top)).size).toBe(1);
    const many = fanLayout({ width: 640, viewportHeight: 360, count: 70 });
    expect(new Set(many.positions.map((p) => p.top)).size).toBeGreaterThan(1);
  });

  it("makes the cards smaller on a short screen", () => {
    const tall = fanLayout({ width: 1100, viewportHeight: 1000, count: 7 });
    const short = fanLayout({ width: 1100, viewportHeight: 500, count: 7 });
    expect(short.cardWidth).toBeLessThan(tall.cardWidth);
  });

  it("sizes the cards by the screen's height, up to the largest", () => {
    // A phone held sideways gets cards of about 64 pixels, not much smaller
    // than a tall screen's
    for (const viewportHeight of [402, 448, 599, 600]) {
      const { cardWidth } = fanLayout({
        width: 1100,
        viewportHeight,
        count: 7,
      });
      expect(cardWidth).toBe(Math.round(viewportHeight * CARD_HEIGHT_SHARE));
    }
    const taller = fanLayout({ width: 1100, viewportHeight: 800, count: 7 });
    expect(taller.cardWidth).toBeGreaterThan(
      fanLayout({ width: 1100, viewportHeight: 600, count: 7 }).cardWidth,
    );
    const tallest = fanLayout({ width: 1600, viewportHeight: 1200, count: 7 });
    expect(tallest.cardWidth).toBe(MAX_CARD_WIDTH);
  });
});
