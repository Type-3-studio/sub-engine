/**
 * brand/kit.mjs — plate 02: the 3x3 brand system.
 *
 *   node brand/kit.mjs
 *
 * The whole identity on one board: the mark, its anatomy, the engine's own
 * surfaces (terminal, packages), the promise, colour, type, the social card,
 * the image world and the detail language. Quiet panel, loud panel, quiet
 * panel — the rhythm is deliberate, every cell is not allowed to shout.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, text, label, panel, hair, rule, chip, wrap, doc, mulberry32 } from "./svg.mjs";
import { MARK, CUT, render, D } from "./marks.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const W = 1600, H = 1000, M = 44, GUT = 16;
const cellW = (W - M * 2 - GUT * 2) / 3;
const cellH = (H - 116 - 56 - GUT * 2) / 3;
const cx = (col) => M + col * (cellW + GUT);
const cy = (row) => 116 + row * (cellH + GUT);

let b = "";

/* ---------------------------------------------------------------- header */
b += render(MARK, { size: 30, x: M, y: 30 });
b += text(M + 42, 53, "Sub-Engine", { size: 20, weight: 800, spacing: -0.4 });
b += text(M + 42, 70, "Brand system", { size: 9.5, fill: C.muted, spacing: 2 });
b += text(W - M, 53, "02", { size: 20, weight: 800, fill: C.faint, anchor: "end" });
b += text(W - M, 70, "AI-first, pure-data ECS 2D engine", { size: 9.5, fill: C.faint, spacing: 1.4, anchor: "end" });
b += hair(M, 96, W - M * 2);

/* ---------------------------------------------------- 1. the mark, large */
{
  const x = cx(0), y = cy(0);
  b += panel(x, y, cellW, cellH, { fill: C.panelAlt, label: "the mark", index: "01" });
  const s = 128, mx = x + (cellW - s) / 2, my = y + 44;
  b += render(MARK, { size: s, x: mx, y: my });
  b += text(x + cellW / 2, my + s + 42, "sub-engine", { size: 30, weight: 800, anchor: "middle", spacing: -0.8 });
  b += text(x + cellW / 2, my + s + 62, "the layer beneath the game", { size: 9.5, fill: C.muted, anchor: "middle", spacing: 1.6 });
}

/* --------------------------------------------------------- 2. anatomy */
{
  const x = cx(1), y = cy(0);
  b += panel(x, y, cellW, cellH, { label: "anatomy", index: "02" });
  const s = 148, mx = x + 34, my = y + 60;
  b += render(MARK, { size: s, x: mx, y: my, pip: false });
  const k = s / D, px = (u) => mx + u * k, py = (u) => my + u * k;
  b += `<circle cx="${px(78)}" cy="${py(50)}" r="${10 * k}" fill="${C.signal}"/>`;

  // spec-drawing callouts: an orthogonal leader off the feature, then a row
  const lx = x + 250, rows = [y + 66, y + 116, y + 166, y + 216];
  const notes = [
    [[50, 6], "block", "88 × 88, inset 6"],
    [[34, 71], "seams", "two, 56 × 4, left-anchored"],
    [[70, 27], "gate", "32 × 46, off-centre right"],
    [[78, 50], "pip", "Ø 20, the entity in flight"],
  ];
  notes.forEach(([[ux, uy], name, val], i) => {
    const tx = px(ux), ty = py(uy), ry = rows[i], knee = lx - 22;
    b += `<path d="M${tx.toFixed(1)} ${ty.toFixed(1)}L${knee} ${ty.toFixed(1)}L${knee} ${ry}L${lx - 6} ${ry}" fill="none" stroke="${C.hair}" stroke-width="1"/>`;
    b += `<circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="2.5" fill="${name === "pip" ? C.signal : C.faint}"/>`;
    b += text(lx, ry - 3, name, { size: 10.5, weight: 600, fill: C.ink, spacing: 0.8 });
    b += text(lx, ry + 11, val, { size: 9, fill: C.faint });
  });
  b += text(x + 24, y + cellH - 20, "Two seams the data rests on. One gate every system crosses.", { size: 9.5, fill: C.faint });
}

/* -------------------------------------------- 3. the engine's own surface */
{
  const x = cx(2), y = cy(0);
  b += panel(x, y, cellW, cellH, { label: "in the wild", index: "03" });
  const tx = x + 24, ty = y + 46, tw = cellW - 48, th = cellH - 70;
  b += `<rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="4" fill="${C.sunken}" stroke="${C.hair}"/>`;
  // window chrome
  b += hair(tx + 1, ty + 30, tw - 2);
  [C.signal, "#5A5A62", "#3A3A42"].forEach((col, i) =>
    b += `<circle cx="${tx + 18 + i * 13}" cy="${ty + 16}" r="3.5" fill="${col}"${i === 0 ? ' opacity="0.9"' : ""}/>`);
  b += text(tx + 66, ty + 20, "sub-engine — install", { size: 9, fill: C.faint });

  let ly = ty + 52;
  b += text(tx + 18, ly, "$", { size: 10.5, fill: C.signal, weight: 700 });
  b += text(tx + 32, ly, "npm i @sub-engine/core", { size: 10.5, fill: C.ink });
  ly += 24;
  b += text(tx + 18, ly, "$", { size: 10.5, fill: C.signal, weight: 700 });
  b += text(tx + 32, ly, "npx create-sub-engine my-game", { size: 10.5, fill: C.muted });
  ly += 28;
  b += hair(tx + 18, ly - 8, tw - 36, C.hairSoft);
  const code = [
    ["const reg", " = createRegistry()"],
    ["const player", " = reg.createEntity()"],
    ["reg.addComponent(player, 'Position',", ""],
    ["", "  { x: 0, y: 0 })"],
  ];
  code.forEach(([a, rest], i) => {
    b += text(tx + 18, ly + i * 17, a, { size: 9.5, fill: C.muted });
    b += text(tx + 18 + a.length * 5.75 + 1, ly + i * 17, rest, { size: 9.5, fill: C.inkDim === C.inkDim ? C.ink : C.ink, opacity: 0.9 });
  });
  b += text(tx + 18, ly + code.length * 17 + 8, "player  ===  0", { size: 9.5, fill: C.signal, weight: 600 });
  b += text(tx + tw - 18, ly + code.length * 17 + 8, "entities are integers", { size: 8.5, fill: C.faint, anchor: "end" });
}

/* ------------------------------------------------------------ 4. essence */
{
  const x = cx(0), y = cy(1);
  b += panel(x, y, cellW, cellH, { fill: C.panelAlt, label: "the promise", index: "04" });
  b += text(x + 28, y + 96, "The layer", { size: 40, weight: 800, spacing: -1.4 });
  b += text(x + 28, y + 140, "beneath the", { size: 40, weight: 800, spacing: -1.4 });
  b += text(x + 28, y + 184, "game.", { size: 40, weight: 800, spacing: -1.4, fill: C.signal });
  b += wrap(x + 28, y + 214,
    "An ECS core that runs without a browser. Entities are integers, components are flat JSON, systems are pure functions.",
    cellW - 56, { size: 10.5, fill: C.muted, max: 3 });
}

/* ------------------------------------------------------------- 5. colour */
{
  const x = cx(1), y = cy(1);
  b += panel(x, y, cellW, cellH, { label: "colour", index: "05" });
  const sw = [
    ["Void", C.void, "#0B0B0D", "canvas"],
    ["Panel", C.panel, "#131317", "surface"],
    ["Hairline", C.hair, "#27272D", "rules"],
    ["Muted", C.muted, "#8A8A93", "secondary"],
    ["Ink", C.ink, "#F2F1EE", "primary"],
    ["Signal", C.signal, "#FF5A1F", "the accent"],
  ];
  const bw = (cellW - 48 - 5 * 8) / 6;
  sw.forEach(([name, col, hex, role], i) => {
    const bx = x + 24 + i * (bw + 8), by = y + 48, bh = cellH - 128;
    b += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="${col}" stroke="${C.hair}"/>`;
    b += text(bx, by + bh + 18, name, { size: 9, weight: 600, fill: C.ink, spacing: 0.8 });
    b += text(bx, by + bh + 31, hex, { size: 8.5, fill: C.faint });
    b += text(bx, by + bh + 43, role, { size: 8, fill: C.faint, opacity: 0.75 });
  });
  b += text(x + 24, y + cellH - 20, "One accent, inherited from Type-3. Used once per surface.", { size: 9.5, fill: C.faint });
}

/* ---------------------------------------------------------------- 6. type */
{
  const x = cx(2), y = cy(1);
  b += panel(x, y, cellW, cellH, { label: "typography", index: "06" });
  b += text(x + 26, y + 78, "Aa", { size: 58, weight: 800, spacing: -2 });
  b += text(x + 116, y + 58, "JetBrains Mono", { size: 15, weight: 700 });
  b += text(x + 116, y + 78, "the engine speaks in data, so the identity does too", { size: 9.5, fill: C.muted });
  b += hair(x + 26, y + 100, cellW - 52);
  b += text(x + 26, y + 122, "ExtraBold  800", { size: 9, fill: C.faint, spacing: 1.4 });
  b += text(x + 26, y + 146, "sub-engine", { size: 21, weight: 800, spacing: -0.6 });
  b += text(x + 26, y + 168, "SemiBold  600", { size: 9, fill: C.faint, spacing: 1.4 });
  b += text(x + 26, y + 188, "Headless core, PixiJS bridge", { size: 14, weight: 600 });
  b += text(x + 26, y + 208, "Regular  400", { size: 9, fill: C.faint, spacing: 1.4 });
  b += text(x + 26, y + 226, "Entities are integers. Components are flat JSON.", { size: 11 });
  b += hair(x + 26, y + 240, cellW - 52);
  b += text(x + 26, y + 254, "ABCDEFGHIJKLMNOPQRSTUVWXYZ  0123456789  {}[]<>()/\\ @#&", { size: 8.5, fill: C.faint });
}

/* ------------------------------------------- 7. the card people actually share */
{
  const x = cx(0), y = cy(2);
  b += panel(x, y, cellW, cellH, { label: "social card", index: "07" });
  const chh = 172, cw = (chh * 1200) / 630;
  const ox = x + (cellW - cw) / 2, oy = y + 46;
  b += `<rect x="${ox}" y="${oy}" width="${cw}" height="${chh}" rx="3" fill="${C.void}" stroke="${C.hair}"/>`;
  // a restrained field, so the card is not a flat rectangle of type
  const rnd = mulberry32(20260114);
  for (let i = 0; i < 46; i++) {
    const px = ox + rnd() * cw, py = oy + rnd() * chh;
    b += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(0.5 + rnd() * 1.3).toFixed(2)}" fill="${C.ink}" opacity="${(0.06 + rnd() * 0.16).toFixed(2)}"/>`;
  }
  const ms = chh * 0.42;
  b += render(MARK, { size: ms, x: ox + cw * 0.06, y: oy + chh * 0.18 });
  b += text(ox + cw * 0.06, oy + chh * 0.78, "sub-engine", { size: chh * 0.115, weight: 800, spacing: -0.5 });
  b += text(ox + cw * 0.06, oy + chh * 0.89, "AI-first, pure-data ECS 2D engine", { size: chh * 0.048, fill: C.muted, spacing: 0.6 });
  b += text(x + 24, y + cellH - 30, "1200 × 630 — npm, GitHub, the studio page", { size: 9, fill: C.faint });
  b += text(x + cellW - 24, y + cellH - 30, "one accent", { size: 9, fill: C.faint, anchor: "end" });
}

/* ------------------------------------------------------- 8. image direction */
{
  const x = cx(1), y = cy(2);
  b += panel(x, y, cellW, cellH, { label: "image direction", index: "08" });
  const ox = x + 24, oy = y + 46, ow = cellW - 48, oh = cellH - 96;
  b += `<clipPath id="img"><rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" rx="2"/></clipPath>`;
  b += `<g clip-path="url(#img)">`;
  b += `<rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" fill="${C.sunken}"/>`;
  // A flow field, drawn with the engine's own idea: a cost grid, then a real
  // Dijkstra integration path through it. This is what the atmosphere images
  // are made of — never a photograph, always the thing the engine computes.
  const N = 30, R = 17;
  const cw = ow / (N - 1), chh = oh / (R - 1);
  const cost = [];
  for (let j = 0; j < R; j++) {
    const row = [];
    for (let i = 0; i < N; i++) {
      const fx = i / (N - 1), fy = j / (R - 1);
      row.push(1 + 1.7 * Math.abs(fx - fy) + 0.5 * Math.sin(fx * 7.3 + fy * 5.1));
    }
    cost.push(row);
  }
  for (let j = 0; j < R; j++)
    for (let i = 0; i < N; i++) {
      const t = Math.min(1, cost[j][i] / 3.2);
      const px = ox + i * cw, py = oy + j * chh;
      b += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(0.9 + (1 - t) * 1.9).toFixed(2)}" fill="${C.ink}" opacity="${(0.05 + (1 - t) * 0.16).toFixed(3)}"/>`;
    }
  // Dijkstra from the goal, then walk it back — the engine's FlowFieldNav
  const goal = [N - 1, R - 1];
  const dist = Array.from({ length: R }, () => new Float64Array(N).fill(Infinity));
  const prev = Array.from({ length: R }, () => new Int32Array(N).fill(-1));
  dist[goal[1]][goal[0]] = 0;
  const open = [[0, goal[1], goal[0]]];
  while (open.length) {
    let bi = 0;
    for (let n = 1; n < open.length; n++) if (open[n][0] < open[bi][0]) bi = n;
    const [d, j, i] = open.splice(bi, 1)[0];
    if (d > dist[j][i]) continue;
    for (const [di, dj] of [[0, -1], [-1, 0], [0, 1], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || ni >= N || nj < 0 || nj >= R) continue;
      const nd = d + cost[nj][ni] * (di && dj ? 1.414 : 1);
      if (nd < dist[nj][ni]) {
        dist[nj][ni] = nd; prev[nj][ni] = j * N + i;
        open.push([nd, nj, ni]);
      }
    }
  }
  const path = [];
  let cur = 0 * N + 0;
  path.push(cur);
  while (cur !== goal[1] * N + goal[0]) {
    const p = prev[Math.floor(cur / N)][cur % N];
    if (p < 0) break;
    cur = p; path.push(cur);
  }
  let d = `M${(ox).toFixed(1)} ${(oy).toFixed(1)}`;
  path.forEach((c, n) => {
    if (!n) return;
    d += `L${(ox + (c % N) * cw).toFixed(1)} ${(oy + Math.floor(c / N) * chh).toFixed(1)}`;
  });
  b += `<path d="${d}" fill="none" stroke="${C.signal}" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>`;
  b += `<circle cx="${(ox + (path.at(-1) % N) * cw).toFixed(1)}" cy="${(oy + Math.floor(path.at(-1) / N) * chh).toFixed(1)}" r="4.5" fill="${C.signal}"/>`;
  b += `<circle cx="${ox.toFixed(1)}" cy="${oy.toFixed(1)}" r="3" fill="none" stroke="${C.signal}" stroke-width="1.4"/>`;
  b += `</g><rect x="${ox}" y="${oy}" width="${ow}" height="${oh}" rx="2" fill="none" stroke="${C.hair}"/>`;
  b += text(x + 24, y + cellH - 34, "A flow field, not a photograph.", { size: 9.5, fill: C.faint });
  b += text(x + cellW - 24, y + cellH - 34, "30 × 17 cost grid, one integration path", { size: 9, fill: C.faint, anchor: "end" });
}

/* --------------------------------------------------- 9. system / detail */
{
  const x = cx(2), y = cy(2);
  b += panel(x, y, cellW, cellH, { label: "system detail", index: "09" });
  let ly = y + 52;
  [["@sub-engine/core", "headless ECS"], ["@sub-engine/pixi", "PixiJS 8 bridge"], ["create-sub-engine", "CLI scaffold"]].forEach(([name, role]) => {
    b += `<rect x="${x + 24}" y="${ly - 13}" width="4" height="14" rx="1" fill="${C.signal}"/>`;
    b += text(x + 38, ly, name, { size: 11, weight: 600 });
    b += text(x + cellW - 24, ly, role, { size: 10, fill: C.muted, anchor: "end" });
    ly += 26;
  });
  b += hair(x + 24, ly - 6, cellW - 48);
  ly += 16;
  const chips = ["headless", "pure data", "typed", "deterministic", "MIT"];
  let chx = x + 24;
  chips.forEach((t) => {
    const w = t.length * 5.9 + 22;
    if (chx + w > x + cellW - 24) { chx = x + 24; ly += 26; }
    b += chip(chx, ly - 12, w, 22, t, { color: t === "MIT" ? C.signal : C.muted, stroke: t === "MIT" ? C.signalDim : C.hair });
    chx += w + 8;
  });
  b += hair(x + 24, ly + 20, cellW - 48);
  const cmd = "$ npx create-sub-engine my-game";
  b += text(x + 24, ly + 46, cmd, { size: 11, fill: C.ink });
  b += `<rect x="${x + 24 + cmd.length * 11 * 0.605 + 7}" y="${ly + 35}" width="9" height="13" fill="${C.signal}"/>`;
  b += text(x + 24, y + cellH - 22, "the cursor is the only other orange thing", { size: 9, fill: C.faint });
}

/* ------------------------------------------------------------------ footer */
b += hair(M, H - 44, W - M * 2);
b += text(M, H - 24, "sub-engine/brand", { size: 9, fill: C.faint, spacing: 1.4 });
b += text(W / 2, H - 24, "node brand/kit.mjs", { size: 9, fill: C.faint, spacing: 1.4, anchor: "middle" });
b += text(W - M, H - 24, "Type-3 Studio · 2026", { size: 9, fill: C.faint, spacing: 1.4, anchor: "end" });

fs.writeFileSync(path.join(here, "02-brand-system.svg"), doc(W, H, b, {
  title: "Sub-Engine — brand system",
  desc: "The Sub-Engine identity on one board: mark, anatomy, product surfaces, promise, colour, type, social card, image direction, detail.",
}));
console.log("brand/02-brand-system.svg", `${W}×${H}`);