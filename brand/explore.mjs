/**
 * brand/explore.mjs — plate 01: the mark, its axes, and the reduction test.
 *
 *   node brand/explore.mjs
 *   google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
 *     --screenshot=docs/brand/01-mark-exploration.png \
 *     --window-size=1400,900 brand/01-mark-exploration.svg
 *
 * Renders the six directions the mark was resolved from, the construction of
 * the one that shipped, and the reduction row that decides the 16px cut.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, text, label, panel, rule, hair, doc } from "./svg.mjs";
import { MARK, CUT, AXES, render, rect, D, CLEARSPACE } from "./marks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const W = 1400, H = 1120, M = 46;
const GUT = 16;

let b = "";
b += text(M, 56, "Sub-Engine", { size: 26, weight: 800, spacing: -0.6 });
b += text(M, 78, "Mark exploration", { size: 10, fill: C.muted, spacing: 2.2 });
b += text(W - M, 56, "01", { size: 26, weight: 800, fill: C.faint, anchor: "end" });
b += text(W - M, 78, "sub-engine/brand", { size: 10, fill: C.faint, spacing: 1.6, anchor: "end" });
b += hair(M, 96, W - M * 2);

/* --- axes: the six directions --------------------------------------- */
const cols = 3, cellW = (W - M * 2 - GUT * (cols - 1)) / cols, cellH = 282;
let y = 122;

AXES.forEach((ax, i) => {
  const x = M + (i % cols) * (cellW + GUT);
  const yy = y + Math.floor(i / cols) * (cellH + GUT);
  const chosen = ax.note === "chosen";

  b += panel(x, yy, cellW, cellH, {
    fill: chosen ? C.panelAlt : C.panel,
    stroke: chosen ? C.signalDim : C.hair,
    label: `${ax.id} — ${ax.name}`,
    index: chosen ? "chosen" : ax.note,
  });

  // construction grid behind the mark
  const gx = x + 28, gy = yy + 50, gs = 140;
  for (let g = 25; g < 100; g += 25)
    b += `<rect x="${gx + (g / 100) * gs}" y="${gy}" width="0.5" height="${gs}" fill="${C.hairSoft}"/>` +
      `<rect x="${gx}" y="${gy + (g / 100) * gs}" width="${gs}" height="0.5" fill="${C.hairSoft}"/>`;
  b += `<rect x="${gx}" y="${gy}" width="${gs}" height="${gs}" fill="none" stroke="${C.hair}"/>`;
  b += render(ax.mark, { size: gs, x: gx, y: gy, opacity: chosen ? 1 : 0.62 });

  // reasoning, set tight in the right column
  const tx = x + 194, tw = cellW - 194 - 28;
  const words = ax.why.split(" ");
  let line = "", ty = gy + 16;
  for (const word of words) {
    if ((line + " " + word).trim().length > Math.floor(tw / 6.1)) {
      b += text(tx, ty, line.trim(), { size: 11.5, fill: chosen ? C.ink : C.muted });
      line = word; ty += 17;
    } else line += " " + word;
  }
  if (line.trim()) b += text(tx, ty, line.trim(), { size: 11.5, fill: chosen ? C.ink : C.muted });

  if (chosen)
    b += `<circle cx="${tx}" cy="${gy + 196}" r="3" fill="${C.signal}"/>` +
      text(tx + 12, gy + 200, "shipped", { size: 9.5, fill: C.signal, weight: 600, spacing: 1.4 });
});

y += Math.ceil(AXES.length / cols) * (cellH + GUT) + 6;

/* --- construction + reduction --------------------------------------- */
const lowY = y, lowH = H - lowY - M;
const halfW = (W - M * 2 - GUT) / 2;

b += panel(M, lowY, halfW, lowH, { label: "construction", index: "100 unit box" });

const kx = M + 40, ky = lowY + 62, ks = 190;
for (let g = 25; g < 100; g += 25)
  b += `<rect x="${kx + (g / 100) * ks}" y="${ky}" width="0.5" height="${ks}" fill="${C.hairSoft}"/>` +
    `<rect x="${kx}" y="${ky + (g / 100) * ks}" width="${ks}" height="0.5" fill="${C.hairSoft}"/>`;
b += `<rect x="${kx}" y="${ky}" width="${ks}" height="${ks}" fill="none" stroke="${C.hair}"/>`;
// construction edges: block, seams, gate
b += `<rect x="${kx + 6}" y="${ky + 6}" width="${(88 / D) * ks}" height="${(88 / D) * ks}" fill="none" stroke="${C.signal}" stroke-width="0.75" opacity="0.55"/>`;
[[6, 27, 62, 31], [6, 69, 62, 73], [62, 27, 94, 73]].forEach(([x0, y0, x1, y1]) => {
  b += `<rect x="${kx + (x0 / D) * ks}" y="${ky + (y0 / D) * ks}" width="${((x1 - x0) / D) * ks}" height="${((y1 - y0) / D) * ks}" fill="none" stroke="${C.signal}" stroke-width="0.75" opacity="0.8"/>`;
});
b += `<circle cx="${kx + (78 / D) * ks}" cy="${ky + (50 / D) * ks}" r="${(10 / D) * ks}" fill="none" stroke="${C.signal}" stroke-width="0.75"/>`;
b += render(MARK, { size: ks, x: kx, y: ky, pip: false, opacity: 0.9 });
b += `<circle cx="${kx + (78 / D) * ks}" cy="${ky + (50 / D) * ks}" r="${(10 / D) * ks}" fill="${C.signal}"/>`;

const specs = [
  ["block", "88 × 88, inset 6"],
  ["seams", "56 × 4, two, left-anchored"],
  ["gate", "32 × 46, right, off-centre"],
  ["pip", "Ø 20, centred in the gate"],
  ["clearspace", `${CLEARSPACE} units, all sides`],
];
specs.forEach(([k, v], i) => {
  const sx = M + 268, sy = lowY + 82 + i * 28;
  b += text(sx, sy, k, { size: 9, weight: 600, fill: C.faint, spacing: 1.6 });
  b += text(sx + 108, sy, v, { size: 10.5, fill: C.muted });
});

// reduction
b += panel(M + halfW + GUT, lowY, halfW, lowH, { label: "reduction", index: "primary → 16px cut" });
const rx = M + halfW + GUT + 34;
[80, 64, 48, 32, 24, 16].forEach((s, i) => {
  const cut = s < 32;
  const cx = rx + i * 82;
  b += render(cut ? CUT : MARK, { size: s, x: cx, y: lowY + 58 });
  b += text(cx + s / 2, lowY + 58 + s + 18, `${s}`, { size: 9, fill: C.muted, anchor: "middle" });
  if (i === 3) b += text(cx + s / 2, lowY + 58 + s + 32, "cut", { size: 8, fill: C.signal, anchor: "middle", weight: 600 });
});
b += text(rx, lowY + 208, "Below 32px the 4u seam falls under a pixel and the Ø20 pip smears.", { size: 10, fill: C.muted });
b += text(rx, lowY + 224, "The cut redraws the seams at 12u, squares the gate and grows the pip to Ø30.", { size: 10, fill: C.faint });

fs.writeFileSync(path.join(here, "01-mark-exploration.svg"), doc(W, H, b, {
  title: "Sub-Engine — mark exploration",
  desc: "Six directions the Sub-Engine mark was resolved from, its construction, and its reduction.",
}));
console.log("brand/01-mark-exploration.svg", `${W}×${H}`);