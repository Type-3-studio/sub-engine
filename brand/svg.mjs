/**
 * Sub-Engine identity — shared SVG primitives for the boards.
 * Everything returns an SVG fragment string; nothing touches the filesystem.
 *
 * The palette is deliberately narrow: one ink, one paper, one signal. It is a
 * sibling of the Type-3 Studio palette (solar orange carries across as the
 * single accent) but built on a cooler, darker ground because an engine is a
 * tool you run at night, not a studio you visit by day.
 */

export const C = {
  void: "#0B0B0D", //  canvas ground — the substrate itself
  panel: "#131317", //  board panel
  panelAlt: "#18181D", //  raised panel
  sunken: "#0E0E11", //  inset wells, terminal bodies
  ink: "#F2F1EE", //  primary foreground
  inkDim: "#0B0B0D", //  the same ink for light surfaces
  paper: "#EDEBE6", //  paper stock
  paperHi: "#F8F7F3", //  raised paper
  hair: "#27272D", //  hairline rules
  hairSoft: "#1E1E23", //  quieter hairlines
  muted: "#8A8A93", //  secondary text
  faint: "#575760", //  tertiary text, panel indices
  signal: "#FF5A1F", //  solar orange — inherited from Type-3
  signalDim: "#B8410F", //  pressed / recessive signal
};

/** Where JetBrains Mono lives. Boards are rasterised locally, never shipped. */
export const FONT_DIR = "/usr/share/fonts/truetype/jetbrains-mono";

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const FAM = {
  mono: "'JetBrains Mono',ui-monospace,'DejaVu Sans Mono',monospace",
  ui: "system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
};

export const fontFace = () => `<style>
@font-face{font-family:'JetBrains Mono';src:url('file://${FONT_DIR}/JetBrainsMono-Regular.ttf');font-weight:400}
@font-face{font-family:'JetBrains Mono';src:url('file://${FONT_DIR}/JetBrainsMono-Medium.ttf');font-weight:500}
@font-face{font-family:'JetBrains Mono';src:url('file://${FONT_DIR}/JetBrainsMono-SemiBold.ttf');font-weight:600}
@font-face{font-family:'JetBrains Mono';src:url('file://${FONT_DIR}/JetBrainsMono-Bold.ttf');font-weight:700}
@font-face{font-family:'JetBrains Mono';src:url('file://${FONT_DIR}/JetBrainsMono-ExtraBold.ttf');font-weight:800}
</style>`;

export const text = (x, y, str, o = {}) => {
  const {
    size = 11,
    fill = C.ink,
    weight = 400,
    family = "mono",
    anchor = "start",
    spacing = 0,
    opacity = 1,
    baseline,
  } = o;
  return `<text x="${x}" y="${y}" font-family="${FAM[family]}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}" opacity="${opacity}"${baseline ? ` dominant-baseline="${baseline}"` : ""}>${esc(str)}</text>`;
};

/** Small all-caps panel label, the way the boards label their own cells. */
export const label = (x, y, str, o = {}) =>
  text(x, y, str.toUpperCase(), {
    size: 8.5,
    weight: 600,
    fill: C.faint,
    spacing: 1.9,
    ...o,
  });

/**
 * Word-wrap live text. `charW` is the advance width of the font at `size` —
 * JetBrains Mono is 0.6em advance per glyph, so width is size * 0.6 * length.
 */
export function wrap(x, y, str, width, o = {}) {
  const { size = 11, lead = size * 1.55, max = Infinity } = o;
  const perLine = Math.max(1, Math.floor(width / (size * 0.605)));
  const words = String(str).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines
    .slice(0, max)
    .map((l, i) => text(x, y + i * lead, l, o))
    .join("");
}

export const panel = (x, y, w, h, o = {}) => {
  const { fill = C.panel, label: l = null, index = null, stroke = C.hair, rx = 2 } = o;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="1"` : ""}/>`;
  if (l) s += label(x + 18, y + 24, l);
  if (index)
    s += text(x + w - 18, y + 24, index, {
      size: 8.5,
      weight: 600,
      fill: C.faint,
      spacing: 1.9,
      anchor: "end",
    });
  return s;
};

export const rule = (x1, y1, x2, y2, stroke = C.hair, dash = null, w = 1) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;

export const hair = (x, y, w, color = C.hair) =>
  `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${color}"/>`;

export const vhair = (x, y, h, color = C.hair) =>
  `<rect x="${x}" y="${y}" width="1" height="${h}" fill="${color}"/>`;

export const chip = (x, y, w, h, str, o = {}) => {
  const { stroke = C.hair, fill = "none", color = C.muted, size = 8.5, rx = h / 2, weight = 500, opacity = 1 } = o;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="1" opacity="${opacity}"/>` +
    text(x + w / 2, y + h / 2 + size * 0.35, str, { size, fill: color, anchor: "middle", spacing: 0.8, weight })
  );
};

/** Re-point a mark authored against the dark ground so it reads on paper. */
export const onPaper = (inner, o = {}) => {
  const { ink = C.inkDim, signal = C.signal } = o;
  return `<g style="--ink:${ink};--signal:${signal}">${inner}</g>`;
};

/** Deterministic PRNG so grain and starfields are byte-stable across rebuilds. */
export const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Assemble a board: outer canvas, panel definitions, footer rule.
 * Panels are drawn first so content can be layered on top by the caller.
 */
export const doc = (w, h, body, o = {}) => {
  const { bg = C.void, title = "Sub-Engine identity", desc = "" } = o;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
${fontFace()}
<style>:root{--ink:${C.ink};--signal:${C.signal}}</style>
<title>${esc(title)}</title>
${desc ? `<desc>${esc(desc)}</desc>` : ""}
<rect width="${w}" height="${h}" fill="${bg}"/>
${body}
</svg>
`;
};

/** Standalone SVG file for a mark or lockup — no board chrome, no backdrop. */
export const asset = (w, h, body, o = {}) => {
  const { title = "Sub-Engine", desc = "" } = o;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
<title>${esc(title)}</title>
${desc ? `<desc>${esc(desc)}</desc>` : ""}
${body}
</svg>
`;
};