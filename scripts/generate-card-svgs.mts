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

// Headwear for the court cards, each drawn in a 100 x 60 box. White details
// are cut-outs so the shapes read at small sizes.
const headwear: Record<string, string> = {
  // King: tall crown with three points
  K: '<path d="M5 58 L5 18 L28 38 L50 6 L72 38 L95 18 L95 58 Z"/><circle cx="5" cy="14" r="6"/><circle cx="50" cy="5" r="6"/><circle cx="95" cy="14" r="6"/><rect x="5" y="50" width="90" height="8" fill="#ffffff" opacity="0.5"/>',
  // Queen: lower coronet with pearls on its points
  Q: '<path d="M8 58 L8 30 L22 42 L36 22 L50 38 L64 22 L78 42 L92 30 L92 58 Z"/><circle cx="8" cy="25" r="5.5"/><circle cx="36" cy="17" r="5.5"/><circle cx="64" cy="17" r="5.5"/><circle cx="92" cy="25" r="5.5"/><rect x="8" y="49" width="84" height="9" fill="#ffffff" opacity="0.5"/><circle cx="30" cy="53.5" r="3" fill="#ffffff"/><circle cx="50" cy="53.5" r="3" fill="#ffffff"/><circle cx="70" cy="53.5" r="3" fill="#ffffff"/>',
  // Jack: feathered cap
  J: '<path d="M8 50 Q45 8 88 50 Z"/><rect x="4" y="48" width="88" height="10" rx="4"/><path d="M58 30 Q86 -4 99 2 Q86 16 66 38 Z"/>',
};

// The Ace of Spades gets an electric guitar, drawn in a 100 x 200 box, with
// a spade inlaid on the body
const guitar = `<path d="M44 0 L60 3 L58 26 L44 26 Z"/>
<circle cx="63" cy="4" r="2"/><circle cx="63" cy="8" r="2"/><circle cx="62.6" cy="12" r="2"/><circle cx="62.2" cy="16" r="2"/><circle cx="61.8" cy="20" r="2"/><circle cx="61.4" cy="24" r="2"/>
<rect x="45" y="24" width="10" height="82"/>
<path d="M38 104 C36 96 30 92 24 96 C18 100 22 112 24 122 C26 132 14 140 14 160 C14 184 30 196 50 196 C70 196 86 186 86 166 C86 150 76 142 78 130 C80 118 88 104 80 96 C74 90 64 96 62 104 Z"/>
<g fill="#ffffff"><rect x="39" y="120" width="22" height="6" rx="2"/><rect x="39" y="138" width="22" height="6" rx="2"/><rect x="38" y="160" width="24" height="7" rx="1"/><circle cx="70" cy="174" r="3.5"/><circle cx="62" cy="184" r="3.5"/></g>
<g transform="translate(23 166) scale(0.16)" fill="#ffffff">${suitShapes.Spades}</g>
<g stroke="#ffffff" stroke-width="0.8" opacity="0.8"><line x1="47" y1="26" x2="47" y2="162"/><line x1="49" y1="26" x2="49" y2="162"/><line x1="51" y1="26" x2="51" y2="162"/><line x1="53" y1="26" x2="53" y2="162"/></g>
<g stroke="#ffffff" stroke-width="1.5"><line x1="45" y1="40" x2="55" y2="40"/><line x1="45" y1="54" x2="55" y2="54"/><line x1="45" y1="67" x2="55" y2="67"/><line x1="45" y1="79" x2="55" y2="79"/><line x1="45" y1="90" x2="55" y2="90"/><line x1="45" y1="99" x2="55" y2="99"/></g>`;

function centre(label: string, suit: Suit) {
  if (label === "A" && suit === "Spades") {
    return `<g transform="rotate(-18 ${middle} 175) translate(${middle - 57.5} 62) scale(1.15)">${guitar}</g>`;
  }

  if (label === "A") {
    return suitAt(suit, middle, 175, 130);
  }

  if (label in headwear) {
    const size = 110;
    return `<g transform="translate(${middle - size / 2} ${130 - size * 0.3}) scale(${size / 100})">${headwear[label]}</g>${suitAt(suit, middle, 225, 90)}`;
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
