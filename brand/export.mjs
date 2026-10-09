/**
 * brand/export.mjs — the assets the world loads.
 *
 *   node brand/export.mjs
 *
 * Everything here is renderer-independent: no live <text>, no external font,
 * no CSS custom properties. A GitHub README, an npm page and a favicon can
 * all point at these files and get the same mark, which is the whole point.
 *
 * The wordmark is outlined to paths by tools/outline-wordmark.py and pasted
 * into wordmark.mjs, because an SVG loaded as an <img> cannot reach the
 * page's @font-face — a live <text> would have to inline the font, which is
 * several hundred KB on every page load.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, asset, esc } from "./svg.mjs";
import { MARK, CUT, MARK_FLAT, render, D } from "./marks.mjs";
import { WORDMARK } from "./wordmark.mjs";
import { lockupSvg, lockupMetrics } from "./lockup.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "assets");
fs.mkdirSync(out, { recursive: true });

const write = (name, svg) => {
  fs.writeFileSync(path.join(out, name), svg);
  const kb = (Buffer.byteLength(svg) / 1024).toFixed(1);
  console.log(`  assets/${name.padEnd(24)} ${kb.padStart(6)} KB`);
};

/** Ink + signal are literal hex here — no `var()`, these ship standalone. */
const flat = (m, ink, signal, o = {}) => render(m, { ...o, ink, signal });

/* ------------------------------------------------------------ the marks */

/* Naming follows the studio: the un-suffixed asset is the one for light
   surfaces, `-inverse` is the one for dark. Consumers reach for `mark.svg`
   without reading anything, so it has to be the safe default. */

write("mark.svg", asset(D, D, flat(MARK, C.void, C.signal), {
  title: "Sub-Engine",
  desc: "Primary mark for light surfaces. A block in section: two seams, one gate, one entity in flight.",
}));

write("mark-inverse.svg", asset(D, D, flat(MARK, C.ink, C.signal), {
  title: "Sub-Engine",
  desc: "The primary mark for dark surfaces.",
}));

write("mark-flat.svg", asset(D, D, flat(MARK_FLAT, C.void, C.void, { pip: false }), {
  title: "Sub-Engine",
  desc: "Single-ink mark for light surfaces, for contexts that cannot carry the accent.",
}));

write("mark-flat-inverse.svg", asset(D, D, flat(MARK_FLAT, C.ink, C.ink, { pip: false }), {
  title: "Sub-Engine",
  desc: "Single-ink mark for dark surfaces.",
}));

/** The designed 16px cut — not the primary mark scaled down. */
write("favicon.svg", asset(D, D, flat(CUT, C.void, C.signal), {
  title: "Sub-Engine",
  desc: "The 16px cut: seams redrawn at 12u, pip grown to Ø30.",
}));

/* --------------------------------------------------------- the lockups */

/**
 * Horizontal lockup, built once in lockup.mjs so the spec board and the
 * shipped file can never drift apart.
 */
const l1 = { svg: lockupSvg(C.void, C.signal), ratio: lockupMetrics().ratio };
write("lockup.svg", l1.svg);
write("lockup-inverse.svg", lockupSvg(C.ink, C.signal));

/* ------------------------------------------------------------- the words */

write("wordmark.svg", asset(Math.ceil(WORDMARK.width), Math.ceil(WORDMARK.height),
  `<g fill="${C.void}">${WORDMARK.paths}</g>`));

/* ------------------------------------------------------------ the manfest */

fs.writeFileSync(
  path.join(out, "site.webmanifest"),
  JSON.stringify(
    {
      name: "Sub-Engine",
      short_name: "Sub-Engine",
      description: "AI-first, pure-data ECS 2D engine",
      start_url: "/",
      display: "standalone",
      background_color: C.void,
      theme_color: C.void,
      icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml" }],
    },
    null,
    2,
  ) + "\n",
);
console.log("  assets/site.webmanifest           written");

console.log(`\nlockup ratio ${l1.ratio.toFixed(2)}:1`);
console.log("done");