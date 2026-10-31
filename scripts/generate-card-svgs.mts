// Writes the playing card images used by Red or Black and Suits into
// public/images/cards. Run it again after changing the design:
//
//   node scripts/generate-card-svgs.mts
//
// Names match getCardImagePath() in src/components/carddeck.tsx, which can't
// be imported here as Node only strips types from .ts files.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(import.meta.dirname, "..", "public", "images", "cards");

const red = "#b91c1c";
const black = "#171717";
const border = "#a3a3a3";
const orange = "#fd7e14";
const paleOrange = "#ffe8cc";

const suitColours = {
  Hearts: red,
  Diamonds: red,
  Clubs: black,
  Spades: black,
} as const;

const ranks = {
  Ace: "A",
  King: "K",
  Queen: "Q",
  Jack: "J",
  Ten: "10",
  Nine: "9",
  Eight: "8",
  Seven: "7",
  Six: "6",
  Five: "5",
  Four: "4",
  Three: "3",
  Two: "2",
} as const;

type Suit = keyof typeof suitColours;

// Each suit drawn in a 100 x 100 box
const suitShapes: Record<Suit, string> = {
  Hearts:
    '<path d="M50 90 C20 66 4 49 4 30 C4 15 16 5 30 5 C40 5 47 11 50 19 C53 11 60 5 70 5 C84 5 96 15 96 30 C96 49 80 66 50 90 Z"/>',
  Diamonds: '<path d="M50 2 L88 50 L50 98 L12 50 Z"/>',
  Clubs:
    '<circle cx="50" cy="28" r="21"/><circle cx="27" cy="57" r="21"/><circle cx="73" cy="57" r="21"/><path d="M45 50 C45 78 40 89 32 97 L68 97 C60 89 55 78 55 50 Z"/>',
  Spades:
    '<path d="M50 3 C40 22 5 40 5 62 C5 76 16 85 29 85 C38 85 44 80 47 75 C46 85 42 92 35 97 L65 97 C58 92 54 85 53 75 C56 80 62 85 71 85 C84 85 95 76 95 62 C95 40 60 22 50 3 Z"/>',
};

const width = 250;
const height = 350;

// Pip centres for the number cards. Pips in the bottom half are drawn upside
// down, as on a printed deck.
const left = 75;
const middle = 125;
const right = 175;
const pipLayouts: Record<string, [number, number][]> = {
  "2": [
    [middle, 70],
    [middle, 280],
  ],
  "3": [
    [middle, 70],
    [middle, 175],
    [middle, 280],
  ],
  "4": [
    [left, 70],
    [right, 70],
    [left, 280],
    [right, 280],
  ],
  "5": [
    [left, 70],
    [right, 70],
    [middle, 175],
    [left, 280],
    [right, 280],
  ],
  "6": [
    [left, 70],
    [right, 70],
    [left, 175],
    [right, 175],
    [left, 280],
    [right, 280],
  ],
  "7": [
    [left, 70],
    [right, 70],
    [middle, 122],
    [left, 175],
    [right, 175],
    [left, 280],
    [right, 280],
  ],
  "8": [
    [left, 70],
    [right, 70],
    [middle, 122],
    [left, 175],
    [right, 175],
    [middle, 228],
    [left, 280],
    [right, 280],
  ],
  "9": [
    [left, 70],
    [right, 70],
    [left, 140],
    [right, 140],
    [middle, 175],
    [left, 210],
    [right, 210],
    [left, 280],
    [right, 280],
  ],
  "10": [
    [left, 70],
    [right, 70],
    [middle, 105],
    [left, 140],
    [right, 140],
    [left, 210],
    [right, 210],
    [middle, 245],
    [left, 280],
    [right, 280],
  ],
};

function suitAt(
  suit: Suit,
  cx: number,
  cy: number,
  size: number,
  upsideDown = false,
) {
  const scale = size / 100;
  const rotate = upsideDown ? " rotate(180 50 50)" : "";
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})${rotate}">${suitShapes[suit]}</g>`;
}

function corner(label: string, suit: Suit) {
  return `<text x="27" y="48" font-size="${label === "10" ? 34 : 40}" font-weight="700" text-anchor="middle">${label}</text>${suitAt(suit, 27, 70, 26)}`;
}

function centre(label: string, suit: Suit) {
  if (label === "A") {
    return suitAt(suit, middle, 170, 120);
  }

  if (label === "J" || label === "Q" || label === "K") {
    return `<rect x="55" y="45" width="140" height="260" rx="10" fill="none" stroke="currentColor" stroke-width="3"/><text x="${middle}" y="185" font-size="120" font-weight="700" text-anchor="middle">${label}</text>${suitAt(suit, middle, 245, 56)}`;
  }

  return pipLayouts[label]
    .map(([cx, cy]) => suitAt(suit, cx, cy, 44, cy > height / 2))
    .join("");
}

function face(rankName: string, label: string, suit: Suit) {
  const colour = suitColours[suit];
  const name = `${rankName} of ${suit}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
<title>${name}</title>
<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="16" fill="#ffffff" stroke="${border}" stroke-width="3"/>
<g fill="${colour}" color="${colour}" font-family="Arial, Helvetica, sans-serif">
${corner(label, suit)}
<g transform="rotate(180 ${width / 2} ${height / 2})">${corner(label, suit)}</g>
${centre(label, suit)}
</g>
</svg>
`;
}

function back() {
  const lines: string[] = [];
  for (let offset = -height; offset < width + height; offset += 22) {
    lines.push(
      `<line x1="${offset}" y1="0" x2="${offset + height}" y2="${height}"/>`,
      `<line x1="${offset}" y1="${height}" x2="${offset + height}" y2="0"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
<title>Face-down card</title>
<defs><clipPath id="inner"><rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="10"/></clipPath></defs>
<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="16" fill="#ffffff" stroke="${border}" stroke-width="3"/>
<g clip-path="url(#inner)" stroke="${paleOrange}" stroke-width="5">${lines.join("")}</g>
<rect x="18" y="18" width="${width - 36}" height="${height - 36}" rx="10" fill="none" stroke="${orange}" stroke-width="4"/>
<path d="M125 120 L170 175 L125 230 L80 175 Z" fill="#ffffff" stroke="${orange}" stroke-width="4"/>
<path d="M125 145 L150 175 L125 205 L100 175 Z" fill="${orange}"/>
</svg>
`;
}

mkdirSync(outDir, { recursive: true });

for (const suit of Object.keys(suitColours) as Suit[]) {
  for (const [rankName, label] of Object.entries(ranks)) {
    const file = `${rankName.toLowerCase()}-${suit.toLowerCase()}.svg`;
    writeFileSync(join(outDir, file), face(rankName, label, suit));
  }
}

writeFileSync(join(outDir, "back.svg"), back());

console.log(`Wrote 53 card images to ${outDir}`);
