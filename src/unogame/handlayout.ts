// Lays your hand out as an overlapping fan that always fits the width it has.
// Each card is overlapped by the one after it, but the left strip with its
// corner label stays clear. On a tall screen the hand wraps into rows once the
// strips would be narrower than COMFORT_STEP; elsewhere only when even the
// narrowest strips would not fit. Each row overlaps the one above it with the
// top strip, and so the corner, still showing.

export const CARD_RATIO = 7 / 5; // Height over width
export const MIN_CARD_WIDTH = 58;
// A phone held sideways is under this tall, so its cards can be smaller
export const SHORT_SCREEN = 400;
export const SHORT_MIN_CARD_WIDTH = 46;
export const MAX_CARD_WIDTH = 132;
// A card's width as a share of the screen's height, so the hand grows with the
// space it has: about 80 pixels on a phone held sideways, 120 on a tall one
export const CARD_HEIGHT_SHARE = 0.2;
// Part of a card's width, from its left edge, that is never covered. The
// corner label sits inside it.
export const CORNER_STRIP = 0.26;
// Part of a card's height, from its top edge, that is never covered by the
// next row
export const ROW_STRIP = 0.32;
export const GAP = 6;
// WCAG 2.2 target size: the part of each card left showing is at least this
// wide, and this tall where rows overlap
export const MIN_TARGET = 24;
// Room above the row for playable cards, which stand up from the rest
export const LIFT = 12;
// On screens with height to spare, a hand wraps into rows sooner, so each
// card shows at least this much and is easy to tap. Up to COMFORT_ROWS rows;
// a bigger hand narrows the strips down to MIN_TARGET instead.
export const COMFORT_STEP = 40;
export const COMFORT_ROWS = 3;
export const COMFORT_HEIGHT = 600;

export interface HandLayout {
  cardWidth: number;
  height: number;
  positions: { left: number; top: number }[];
}

export function fanLayout(options: {
  width: number; // Of the space the hand has
  viewportHeight: number; // Cards shrink on short screens
  count: number;
}): HandLayout {
  const { width, viewportHeight, count } = options;
  const cardWidth = Math.round(
    Math.min(
      MAX_CARD_WIDTH,
      Math.max(
        viewportHeight < SHORT_SCREEN ? SHORT_MIN_CARD_WIDTH : MIN_CARD_WIDTH,
        // Tall screens have room for bigger cards
        Math.min(width * 0.17, viewportHeight * CARD_HEIGHT_SHARE),
      ),
    ),
  );
  const cardHeight = cardWidth * CARD_RATIO;
  const minStep = Math.max(cardWidth * CORNER_STRIP, MIN_TARGET);
  const perRowMax = Math.max(1, Math.floor((width - cardWidth) / minStep) + 1);
  const comfortStep = Math.max(minStep, COMFORT_STEP);
  const perRowComfort = Math.max(
    1,
    Math.floor((width - cardWidth) / comfortStep) + 1,
  );
  const rows = Math.max(
    1,
    Math.ceil(count / perRowMax),
    viewportHeight >= COMFORT_HEIGHT
      ? Math.min(COMFORT_ROWS, Math.ceil(count / perRowComfort))
      : 1,
  );
  const perRow = Math.max(1, Math.ceil(count / rows));
  const step =
    perRow > 1
      ? Math.min(cardWidth + GAP, (width - cardWidth) / (perRow - 1))
      : 0;
  const rowStep = Math.max(cardHeight * ROW_STRIP, MIN_TARGET);

  const positions = Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / perRow);
    const column = index % perRow;
    const inRow = Math.min(perRow, count - row * perRow);
    const rowWidth = cardWidth + (inRow - 1) * step;
    return {
      left: (width - rowWidth) / 2 + column * step,
      top: LIFT + row * rowStep,
    };
  });
  return {
    cardWidth,
    height: Math.ceil(LIFT + (rows - 1) * rowStep + cardHeight + GAP),
    positions,
  };
}
