// Writes the Uno card faces into public/images/uno. Run it again after
// changing the design:
//
//   node scripts/generate-uno-svgs.mts
//
// File names match getUnoCardImagePath() in src/unogame/cards.ts. The card
// back is the existing Mr Tayto one in public/images/cards/back.svg.
//
// Colour is never the only clue: every coloured face spells its colour out at
// the top and bottom, and the name is in each image's title.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = join(import.meta.dirname, "..", "public", "images", "uno");

const width = 250;
const height = 350;
const border = "#a3a3a3";
const black = "#171717";

const colours = {
  red: { name: "Red", panel: "#d62828", ink: "#b91c1c", onPanel: "#ffffff" },
  yellow: {
    name: "Yellow",
    panel: "#f5c518",
    ink: "#7a5600",
    onPanel: black,
  },
  green: {
    name: "Green",
    panel: "#2a9d4a",
    ink: "#166534",
    onPanel: "#ffffff",
  },
  blue: { name: "Blue", panel: "#1f5fd1", ink: "#1e40af", onPanel: "#ffffff" },
} as const;
type Colour = keyof typeof colours;

const font = 'font-family="Arial, Helvetica, sans-serif" font-weight="700"';

// Skip and Reverse are drawn in a 100 x 100 box
const symbols = {
  skip: '<circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="12"/><line x1="23" y1="23" x2="77" y2="77" stroke="currentColor" stroke-width="12"/>',
  reverse:
    '<path d="M30 92 L30 42 L14 42 L40 8 L66 42 L50 42 L50 92 Z" fill="currentColor"/><path d="M70 8 L70 58 L86 58 L60 92 L34 58 L50 58 L50 8 Z" fill="currentColor" transform="translate(20 0)"/>',
} as const;

function symbolAt(
  kind: keyof typeof symbols,
  cx: number,
  cy: number,
  size: number,
  colour: string,
) {
  const scale = size / 100;
  return `<g color="${colour}" transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${scale})">${symbols[kind]}</g>`;
}

type Face =
  | { colour: Colour; kind: "number"; value: number }
  | { colour: Colour; kind: "skip" | "reverse" | "draw-two" };

function label(face: Face) {
  return face.kind === "number"
    ? String(face.value)
    : face.kind === "draw-two"
      ? "+2"
      : face.kind;
}

function faceName(face: Face) {
  const colour = colours[face.colour].name;
  if (face.kind === "number") return `${colour} ${String(face.value)}`;
  return `${colour} ${face.kind === "draw-two" ? "Draw Two" : face.kind === "skip" ? "Skip" : "Reverse"}`;
}

function cornerMark(face: Face, text: string) {
  const { onPanel } = colours[face.colour];
  if (face.kind === "skip" || face.kind === "reverse")
    return symbolAt(face.kind, 38, 62, 34, onPanel);
  return `<text x="38" y="76" font-size="${text.length > 1 ? 34 : 44}" text-anchor="middle" fill="${onPanel}" ${font}>${text}</text>`;
}

function centreMark(face: Face, text: string) {
  const { ink } = colours[face.colour];
  if (face.kind === "skip" || face.kind === "reverse")
    return symbolAt(face.kind, 125, 175, 92, ink);
  if (face.kind === "draw-two")
    return `<g transform="rotate(-14 125 175)"><rect x="89" y="136" width="52" height="74" rx="8" fill="${ink}" stroke="#ffffff" stroke-width="5"/></g><g transform="rotate(10 125 175)"><rect x="108" y="142" width="52" height="74" rx="8" fill="${ink}" stroke="#ffffff" stroke-width="5"/><text x="134" y="196" font-size="34" text-anchor="middle" fill="#ffffff" ${font}>+2</text></g>`;
  // A bar under 6 and 9 shows which way up they are
  const bar =
    text === "6" || text === "9"
      ? `<rect x="102" y="227" width="46" height="8" rx="3" fill="${ink}"/>`
      : "";
  return `<text x="125" y="217" font-size="118" text-anchor="middle" fill="${ink}" ${font}>${text}</text>${bar}`;
}

function coloured(face: Face) {
  const c = colours[face.colour];
  const text = label(face);
  const name = faceName(face);
  const word = `<text x="125" y="42" font-size="20" letter-spacing="3" text-anchor="middle" fill="${c.onPanel}" ${font}>${c.name.toUpperCase()}</text>`;
  const corners = `${cornerMark(face, text)}${word}`;
  return svg(
    name,
    `<rect x="14" y="14" width="222" height="322" rx="12" fill="${c.panel}"/>
<ellipse cx="125" cy="175" rx="70" ry="108" transform="rotate(-18 125 175)" fill="#ffffff"/>
${corners}
<g transform="rotate(180 ${width / 2} ${height / 2})">${corners}</g>
${centreMark(face, text)}`,
  );
}

const wildColours = [
  ["#d62828", "M125 175 L125 30 L270 30 L270 175 Z"],
  ["#1f5fd1", "M125 175 L270 175 L270 330 L125 330 Z"],
  ["#2a9d4a", "M125 175 L125 330 L-20 330 L-20 175 Z"],
  ["#f5c518", "M125 175 L-20 175 L-20 30 L125 30 Z"],
] as const;

function wild(four: boolean) {
  const name = four ? "Wild Draw Four" : "Wild";
  const mark = four ? "+4" : "";
  const words = `<text x="125" y="42" font-size="20" letter-spacing="3" text-anchor="middle" fill="#ffffff" ${font}>${four ? "WILD +4" : "WILD"}</text>`;
  const quadrants = wildColours
    .map(([fill, d]) => `<path d="${d}" fill="${fill}"/>`)
    .join("");
  return svg(
    name,
    `<rect x="14" y="14" width="222" height="322" rx="12" fill="${black}"/>
<defs><clipPath id="oval"><ellipse cx="125" cy="175" rx="70" ry="108" transform="rotate(-18 125 175)"/></clipPath></defs>
<g clip-path="url(#oval)">${quadrants}</g>
<ellipse cx="125" cy="175" rx="70" ry="108" transform="rotate(-18 125 175)" fill="none" stroke="#ffffff" stroke-width="6"/>
${words}
<g transform="rotate(180 ${width / 2} ${height / 2})">${words}</g>
${four ? `<text x="125" y="204" font-size="80" text-anchor="middle" fill="${black}" stroke="#ffffff" stroke-width="8" paint-order="stroke" ${font}>${mark}</text>` : ""}`,
  );
}

function svg(title: string, body: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img">
<title>${title}</title>
<rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="16" fill="#ffffff" stroke="${border}" stroke-width="3"/>
${body}
</svg>
`;
}

mkdirSync(outDir, { recursive: true });
let count = 0;
const write = (file: string, content: string) => {
  writeFileSync(join(outDir, file), content);
  count++;
};

for (const colour of Object.keys(colours) as Colour[]) {
  for (let value = 0; value <= 9; value++)
    write(
      `${colour}-${String(value)}.svg`,
      coloured({ colour, kind: "number", value }),
    );
  for (const kind of ["skip", "reverse", "draw-two"] as const)
    write(`${colour}-${kind}.svg`, coloured({ colour, kind }));
}
write("wild.svg", wild(false));
write("wild-draw-four.svg", wild(true));

console.log(`Wrote ${String(count)} Uno card images to ${outDir}`);
