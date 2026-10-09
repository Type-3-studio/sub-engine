/**
 * brand/spec.mjs — plate 03: what ships, and the rules it ships under.
 *
 *   node brand/spec.mjs
 *
 * The specification half of the system: the applications, the sizes, the
 * clearspace, the colour rules, and the four things that are not allowed.
 * Written down so the identity survives being handed to someone who was not
 * in the room.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { C, text, label, panel, hair, rule, doc } from "./svg.mjs";
import { MARK, CUT, MARK_FLAT, render, D, CLEARSPACE } from "./marks.mjs";
import { lockupGroup, lockupMetrics } from "./lockup.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const W = 1400, H = 920, M = 46, GUT = 16;

let b = "";
b += render(MARK, { size: 30, x: M, y: 30 });
b += text(M + 42, 53, "Sub-Engine", { size: 20, weight: 800, spacing: -0.4 });
b += text(M + 42, 70, "Specification", { size: 9.5, fill: C.muted, spacing: 2 });
b += text(W - M, 53, "03", { size: 20, weight: 800, fill: C.faint, anchor: "end" });
b += text(W - M, 70, "what ships, and the rules it ships under", { size: 9.5, fill: C.faint, spacing: 1.4, anchor: "end" });
b += hair(M, 96, W - M * 2);

const colW = (W - M * 2 - GUT * 2) / 3;
const cxs = [M, M + colW + GUT, M + (colW + GUT) * 2];

/* ------------------------------------------------------- 1. the marks */
{
  const x = cxs[0], y = 116, h = 348;
  b += panel(x, y, colW, h, { label: "the marks", index: "01" });
  const rows = [
    ["mark.svg", "primary, light surfaces", MARK, C.inkDim, C.signal, false],
    ["mark-inverse.svg", "primary, dark surfaces", MARK, C.ink, C.signal, false],
    ["mark-flat.svg", "single ink, no accent", MARK_FLAT, C.ink, C.ink, true],
    ["favicon.svg", "the 16px cut", CUT, C.ink, C.signal, false],
  ];
  rows.forEach(([name, use, m, ink, sig, flat], i) => {
    const ry = y + 44 + i * 74;
    // ink-on-dark would vanish, so the light-surface variants sit on paper
    if (ink === C.inkDim) b += `<rect x="${x + 20}" y="${ry - 6}" width="66" height="66" rx="3" fill="${C.paper}"/>`;
    b += render(m, { size: 54, x: x + 26, y: ry, ink, signal: sig, pip: !flat });
    b += text(x + 100, ry + 22, name, { size: 11, weight: 600 });
    b += text(x + 100, ry + 39, use, { size: 9.5, fill: C.faint });
    if (i === 3) b += text(x + colW - 24, ry + 30, "≤ 31px", { size: 9, fill: C.signal, anchor: "end", weight: 600 });
    if (i < 3) b += hair(x + 26, ry + 66, colW - 52, C.hairSoft);
  });
}

/* ---------------------------------------------------- 2. clearspace */
{
  const x = cxs[1], y = 116, h = 348;
  b += panel(x, y, colW, h, { label: "clearspace & minimum size", index: "02" });
  const cs = CLEARSPACE * 1.6; // drawn blown up so the ratio is readable
  const s = 150, bx = x + 48, by = y + 52;
  b += `<rect x="${bx - cs}" y="${by - cs}" width="${s + cs * 2}" height="${s + cs * 2}" fill="none" stroke="${C.hair}" stroke-dasharray="3 3"/>`;
  b += render(MARK, { size: s, x: bx, y: by });
  b += rule(bx - cs, by - cs - 16, bx - cs, by - cs, C.faint);
  b += text(bx - cs + 6, by - cs - 8, CLEARSPACE, { size: 9, fill: C.faint });
  const minX = x + 250, minY = y + 52;
  b += text(minX, minY + 12, "minimum size", { size: 9, fill: C.faint, spacing: 1.6 });
  [32, 24, 16].forEach((sz, i) => {
    const useCut = sz < 32;
    const mm = useCut ? CUT : MARK;
    const yy = minY + 32 + i * 62;
    b += render(mm, { size: sz * 1.35, x: minX, y: yy });
    b += text(minX + sz * 1.35 + 16, yy + sz * 0.62, `${sz}px`, { size: 10, fill: C.muted });
    b += text(minX + sz * 1.35 + 60, yy + sz * 0.62, useCut ? "cut" : "primary", { size: 9, fill: useCut ? C.signal : C.faint });
  });
  b += text(x + 26, y + h - 22, "Clearspace is measured in the mark's own units, never in points.", { size: 9.5, fill: C.faint });
}

/* ------------------------------------------------------- 3. the lockup */
{
  const x = cxs[2], y = 116, h = 348;
  b += panel(x, y, colW, h, { label: "the lockup", index: "03" });
  // the lockup is outlined, so it can be placed directly — no font, no drift
  const lm = lockupMetrics(46);
  const paperLock = `<g transform="translate(${x + 40} ${y + 46})"><g transform="scale(${(46 / D).toFixed(3)})">${lockupGroup(C.inkDim, C.signal)}</g></g>`;
  b += `<rect x="${x + 24}" y="${y + 46}" width="${colW - 48}" height="104" rx="3" fill="${C.paper}"/>`;
  b += paperLock;
  b += text(x + colW - 40, y + 138, "on paper", { size: 9, fill: C.inkDim, anchor: "end" });
  b += `<rect x="${x + 24}" y="${y + 168}" width="${colW - 48}" height="104" rx="3" fill="${C.sunken}" stroke="${C.hair}"/>`;
  b += `<g transform="translate(${x + 40} ${y + 168})"><g transform="scale(${(46 / D).toFixed(3)})">${lockupGroup(C.ink, C.signal)}</g></g>`;
  b += text(x + colW - 40, y + 260, "on dark", { size: 9, fill: C.faint, anchor: "end" });
  b += text(x + 26, y + 300, `lockup.svg — ${lm.ratio.toFixed(1)}:1, outlined`, { size: 11, weight: 600 });
  b += text(x + 26, y + 318, "Name must be present. Below 90px wide,", { size: 9.5, fill: C.muted });
  b += text(x + 26, y + 334, "in app chrome, or as an avatar — mark alone.", { size: 9.5, fill: C.muted });
}

/* ------------------------------------------------ 4. what is not allowed */
{
  const x = cxs[0], y = 116 + 348 + GUT, h = H - 96 - (116 + 348 + GUT) - M;
  b += panel(x, y, colW, h, { label: "not allowed", index: "04" });
  const no = [
    ["stretch", "Scale the block and the gate non-uniformly", "shear"],
    ["rotate", "Rotate or add perspective", "tilt"],
    ["recolour", "Use any accent but Signal", "hue"],
    ["crowd", "Let type or an image enter the clearspace", "pad"],
  ];
  no.forEach(([name, why, k], i) => {
    const ry = y + 50 + i * 62;
    const cx0 = x + 44, cy0 = ry;
    if (k === "shear") b += `<g transform="translate(${cx0} ${cy0})"><g transform="scale(1.5 0.85)">${render(MARK, { size: 40, ink: C.faint, signal: C.faint })}</g></g>`;
    else if (k === "tilt") b += `<g transform="rotate(-14 ${cx0 + 20} ${cy0 + 20})">${render(MARK, { size: 40, x: cx0, y: cy0, ink: C.faint, signal: C.faint })}</g>`;
    else if (k === "hue") b += render(MARK, { size: 40, x: cx0, y: cy0, ink: C.faint, signal: "#4C7CF0" });
    else b += `<rect x="${cx0}" y="${cy0}" width="40" height="40" fill="none" stroke="${C.faint}"/>`;
    b += `<circle cx="${cx0 + 20}" cy="${cy0 + 20}" r="19" fill="none" stroke="${C.signalDim}" stroke-width="1"/>`;
    b += rule(cx0 + 6, cy0 + 34, cx0 + 34, cy0 + 6, C.signalDim);
    b += text(x + 108, ry + 18, name, { size: 11, weight: 600 });
    b += text(x + 108, ry + 34, why, { size: 9, fill: C.faint });
  });
}

/* ------------------------------------------------- 5. colour in practice */
{
  const x = cxs[1], y = 116 + 348 + GUT, h = H - 96 - (116 + 348 + GUT) - M;
  b += panel(x, y, colW, h, { label: "colour in practice", index: "05" });
  const pair = (bgc, inkc, sigc, cap) => {
    b += `<rect x="${x + 26}" y="${y + 46 + cap * 62}" width="${colW - 52}" height="52" rx="3" fill="${bgc}"${bgc === C.void ? ' stroke="' + C.hair + '"' : ""}/>`;
    b += render(MARK, { size: 30, x: x + 44, y: y + 57 + cap * 62, ink: inkc, signal: sigc });
    b += text(x + 88, y + 78 + cap * 62, cap === 0 ? "Void ground" : cap === 1 ? "Paper ground" : "Flat, no accent", { size: 10, fill: inkc });
  };
  pair(C.void, C.ink, C.signal, 0);
  pair(C.paper, C.inkDim, C.signal, 1);
  pair(C.void, C.ink, C.ink, 2);
  b += text(x + 26, y + h - 22, "Ink on ink is the fallback, not a brand colour. Reach for mark-flat.", { size: 9.5, fill: C.faint });
}

/* ------------------------------------------------------- 6. the install */
{
  const x = cxs[2], y = 116 + 348 + GUT, h = H - 96 - (116 + 348 + GUT) - M;
  b += panel(x, y, colW, h, { label: "the install", index: "06" });
  const rows = [
    ["GitHub README", "assets/logo-lockup.svg", C.signal],
    ["npm package page", "packages/*/assets/logo-lockup.svg", C.muted],
    ["social / OG", "assets/og-image.png", C.muted],
    ["favicon / PWA", "assets/favicon.svg", C.muted],
    ["app icon / social", "assets/icon-{512,192,180}.png", C.muted],
    ["Type-3 Studio page", "assets/logo-mark.svg", C.muted],
  ];
  rows.forEach(([where, file, col], i) => {
    const ry = y + 50 + i * 30;
    b += `<rect x="${x + 26}" y="${ry - 9}" width="3" height="11" fill="${col}"/>`;
    b += text(x + 40, ry, where, { size: 10.5, fill: C.ink });
    b += text(x + colW - 26, ry, file, { size: 9.5, fill: C.faint, anchor: "end" });
  });
  b += hair(x + 26, y + h - 58, colW - 52);
  b += text(x + 26, y + h - 36, "node brand/export.mjs   →   assets/", { size: 9.5, fill: C.muted });
  b += text(x + 26, y + h - 20, "brand/render.sh        →   docs/brand/*.png", { size: 9.5, fill: C.faint });
}

b += hair(M, H - 40, W - M * 2);
b += text(M, H - 20, "Sub-Engine identity — a sibling of Type-3 Studio, not a copy of it", { size: 9, fill: C.faint, spacing: 1.2 });

fs.writeFileSync(path.join(here, "03-spec.svg"), doc(W, H, b, {
  title: "Sub-Engine — specification",
  desc: "The marks, clearspace, minimum size, lockup, prohibitions and installation targets for the Sub-Engine identity.",
}));
console.log("brand/03-spec.svg", `${W}×${H}`);