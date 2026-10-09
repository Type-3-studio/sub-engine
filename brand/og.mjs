/**
 * brand/og.mjs — the social card.
 *
 *   node brand/og.mjs
 *   google-chrome --headless --disable-gpu --no-sandbox \
 *     --hide-scrollbars --screenshot=assets/og-image.png \
 *     --window-size=1200,630 brand/og-image.svg
 *
 * The wordmark is inlined from the *shipped* outlined lockup rather than set
 * as live text, so the card carries the same artwork the repo ships instead of
 * a second rendering of the name that quietly drifts.
 *
 * The atmosphere is the same flow field as the system board — the engine's own
 * cost grid, seeded, so the card is byte-stable across rebuilds.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, doc, mulberry32 } from "./svg.mjs";
import { MARK, render } from "./marks.mjs";
import { WORDMARK } from "./wordmark.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const W = 1200, H = 630;

let b = "";

/* atmosphere: a cost grid, dimmed until it is nearly texture */
const N = 46, R = 24;
const cost = [];
for (let j = 0; j < R; j++) {
  const row = [];
  for (let i = 0; i < N; i++) {
    const fx = i / (N - 1), fy = j / (R - 1);
    // cheapest along the diagonal, so the integration path crosses the field
    // rather than skimming its cheapest edge
    row.push(1 + 1.7 * Math.abs(fx - fy) + 0.45 * Math.sin(fx * 6.1 + fy * 4.3));
  }
  cost.push(row);
}
const cw = W / (N - 1), ch = H / (R - 1);
for (let j = 0; j < R; j++)
  for (let i = 0; i < N; i++) {
    const t = Math.min(1, cost[j][i] / 3.2);
    const x = i * cw, y = j * ch;
    b += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + (1 - t) * 2.1).toFixed(2)}" fill="${C.ink}" opacity="${(0.045 + (1 - t) * 0.10).toFixed(3)}"/>`;
  }

/* one integration path through it, dimmer than the wordmark so it reads as ground */
{
  const start = [0, 0], goal = [N - 1, R - 1];
  const dist = Array.from({ length: R }, () => new Float64Array(N).fill(Infinity));
  const prev = Array.from({ length: R }, () => new Int32Array(N).fill(-1));
  dist[start[1]][start[0]] = 0;
  const open = [[0, start[1], start[0]]];
  while (open.length) {
    let bi = 0;
    for (let n = 1; n < open.length; n++) if (open[n][0] < open[bi][0]) bi = n;
    const [d, j, i] = open.splice(bi, 1)[0];
    if (d > dist[j][i]) continue;
    for (const [di, dj] of [[0, -1], [-1, 0], [0, 1], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || ni >= N || nj < 0 || nj >= R) continue;
      const nd = d + cost[nj][ni] * (di && dj ? 1.414 : 1);
      if (nd < dist[nj][ni]) { dist[nj][ni] = nd; prev[nj][ni] = j * N + i; open.push([nd, nj, ni]); }
    }
  }
  // walk the parent chain back from the goal — the source has no parent,
  // so start the trace at the goal and follow prev to zero
  const path = [];
  let cur = goal[1] * N + goal[0];
  while (cur >= 0) { path.push(cur); cur = prev[Math.floor(cur / N)][cur % N]; }
  path.reverse();
  let d = "";
  path.forEach((c, n) => { d += `${n ? "L" : "M"}${(c % N) * cw} ${Math.floor(c / N) * ch}`; });
  b += `<path d="${d}" fill="none" stroke="${C.signal}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" opacity="0.4"/>`;
}

/* the lockup, at 96u, from the shipped outlines */
const PAD = 88;
const MS = 96;
const k = (MS * 0.62) / WORDMARK.height;
b += render(MARK, { size: MS, x: PAD, y: 92, ink: C.ink, signal: C.signal });
b += `<g transform="translate(${PAD + MS + 26} ${(92 + (MS - WORDMARK.height * k) / 2).toFixed(2)}) scale(${k.toFixed(4)})" fill="${C.ink}">${WORDMARK.paths}</g>`;

/* the promise */
b += `<g font-family="'JetBrains Mono',ui-monospace,monospace" fill="${C.ink}">`;
b += `<text x="${PAD}" y="336" font-size="60" font-weight="800" letter-spacing="-2.2">The layer beneath the game.</text>`;
b += `<text x="${PAD}" y="398" font-size="24" fill="${C.muted}" letter-spacing="-0.3">An ECS core that runs without a browser.</text>`;
b += `<text x="${PAD}" y="434" font-size="24" fill="${C.muted}" letter-spacing="-0.3">Entities are integers. Components are flat JSON. Systems are pure functions.</text>`;
b += `</g>`;

/* the install, and who made it */
const chips = ["@sub-engine/core", "@sub-engine/pixi", "create-sub-engine"];
let chx = PAD;
chips.forEach((t) => {
  const w = t.length * 12.4 + 40;
  b += `<rect x="${chx}" y="496" width="${w}" height="42" rx="21" fill="none" stroke="${C.hair}"/>`;
  b += `<rect x="${chx + 18}" y="512" width="4" height="10" fill="${C.signal}"/>`;
  b += `<text x="${chx + 32}" y="523" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="16" fill="${C.muted}">${t}</text>`;
  chx += w + 12;
});
b += `<text x="${PAD}" y="592" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="15" fill="${C.faint}" letter-spacing="0.6">npm i @sub-engine/pixi    ·    MIT    ·    by Type-3 Studio</text>`;

fs.writeFileSync(path.join(here, "og-image.svg"), doc(W, H, b, {
  bg: C.void,
  title: "Sub-Engine",
  desc: "The layer beneath the game. AI-first, pure-data ECS 2D engine.",
}));
console.log("brand/og-image.svg", `${W}×${H}`);