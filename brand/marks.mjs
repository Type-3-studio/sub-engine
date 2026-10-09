/**
 * Sub-Engine — mark geometry.
 *
 * Every mark is authored inside a 100 x 100 design box so one drawing can be
 * instantiated at 16px (favicon) or 600px (hero) with identical proportions.
 *
 * The idea, stated once: an ECS engine is a *substrate*. Entities are integers
 * sitting on flat data; systems are pure functions crossing them every tick.
 * So the mark is a block in section — solid, load-bearing, unadorned — cut by
 * two seams and one gate. The seams are the layers the data rests on. The gate
 * is the channel every system has to cross. The one orange pip inside it is the
 * entity currently in flight, and it is the only thing in the mark that moves.
 *
 * `substrate()` is the single parametric source for the shipped mark, its 16px
 * cut and every exploration variant, so a change propagates everywhere.
 */

export const D = 100;

const r3 = (n) => +Number(n).toFixed(3);

/** Axis-aligned rectangle as a path. */
export const rect = (x, y, w, h) => `M${r3(x)} ${r3(y)}H${r3(x + w)}V${r3(y + h)}H${r3(x)}Z`;

/** True when a cut rectangle overlaps a shape rectangle. */
const overlaps = (a, [x0, y0, x1, y1]) =>
  x1 > a.x && x0 < a.x + a.w && y1 > a.y && y0 < a.y + a.h;

const live = (r) => (r.w > 0.4 && r.h > 0.4 ? r : null);

/** Carve one axis-aligned rectangle out of a set of shapes. */
export function subtract(shapes, cut) {
  const [cx0, cy0, cx1, cy1] = cut;
  const out = [];
  for (const s of shapes) {
    if (!overlaps(s, cut)) { out.push(s); continue; }
    const rx1 = s.x + s.w, ry1 = s.y + s.h;
    const ty0 = Math.max(s.y, cy0), ty1 = Math.min(ry1, cy1);
    // above / below the cut, then its left / right flanks
    if (cy0 > s.y) out.push(live({ x: s.x, y: s.y, w: s.w, h: cy0 - s.y }));
    if (cy1 < ry1) out.push(live({ x: s.x, y: cy1, w: s.w, h: ry1 - cy1 }));
    if (cx0 > s.x) out.push(live({ x: s.x, y: ty0, w: cx0 - s.x, h: ty1 - ty0 }));
    if (cx1 < rx1) out.push(live({ x: cx1, y: ty0, w: rx1 - cx1, h: ty1 - ty0 }));
  }
  return out;
}

/** The solid block every mark starts from. */
export const block = (inset = 6) => [{ x: inset, y: inset, w: D - inset * 2, h: D - inset * 2 }];

/**
 * Build a mark: a block, minus a list of axis-aligned cuts, plus one pip.
 *   cuts  each is [x0, y0, x1, y1]
 *   pip   [x, y, r] — the entity in the gate, or null to omit it
 */
export function substrate({ inset = 6, cuts = [], pip = null } = {}) {
  const shapes = cuts.reduce(subtract, block(inset));
  return { shapes, pip, inset };
}

/* ------------------------------------------------------------------ *
 * THE APPROVED MARK
 * ------------------------------------------------------------------ */

/** Primary mark, 32px and up. */
export const MARK = substrate({
  cuts: [
    [6, 27, 62, 31], // upper seam
    [6, 69, 62, 73], // lower seam
    [62, 27, 94, 73], // the gate
  ],
  pip: [78, 50, 10],
});

/**
 * The 16px cut.
 *
 * A 4u seam is two thirds of a pixel at 16px and a 20u pip is a smudge, so the
 * cut is *redrawn*, not scaled: the seams are opened to 12u, the gate is
 * squared up, and the pip is grown into a disc that survives the raster. Same
 * silhouette language, resolved for pixels instead of intent.
 */
export const CUT = substrate({
  cuts: [
    [6, 26, 60, 38],
    [6, 62, 60, 74],
    [60, 26, 94, 74],
  ],
  pip: [77, 50, 15],
});

/** The mark with no pip — the one-color / single-ink application. */
export const MARK_FLAT = substrate({
  cuts: [
    [6, 27, 62, 31],
    [6, 69, 62, 73],
    [62, 27, 94, 73],
  ],
  pip: null,
});

/* ------------------------------------------------------------------ *
 * EXPLORATION AXES — plate 01
 * ------------------------------------------------------------------ */

/** The six directions the mark was resolved from, kept so the choice is auditable. */
export const AXES = [
  {
    id: "A", name: "the gate", note: "chosen",
    mark: MARK,
    why: "Solid mass, two seams, one gate. Says substrate and channel without a single illustrative detail.",
  },
  {
    id: "B", name: "stepped section", note: "rejected",
    mark: substrate({
      cuts: [[6, 6, 34, 32], [34, 30, 66, 60], [66, 60, 94, 94]],
      pip: [20, 18, 6],
    }),
    why: "Reads as a bar chart. The three layers looked like data, not like the thing the data runs on.",
  },
  {
    id: "C", name: "laminate", note: "rejected",
    mark: substrate({
      cuts: [[6, 26, 64, 29], [6, 50, 64, 53], [6, 74, 64, 77]],
      pip: [78, 51, 9],
    }),
    why: "Right strata, no channel. Quiet, but static — nothing in it happens.",
  },
  {
    id: "D", name: "stepped channel", note: "rejected",
    mark: substrate({
      cuts: [[28, 6, 56, 58], [56, 38, 84, 94]],
      pip: [42, 32, 9],
    }),
    why: "Bolder silhouette, but the pip floats in open space instead of travelling a defined channel.",
  },
  {
    id: "E", name: "spine", note: "rejected",
    mark: substrate({
      cuts: [[28, 32, 94, 39], [28, 60, 94, 67]],
      pip: [60, 36, 8],
    }),
    why: "Layers bound on one edge. Genuinely layered — but it reads as a list, which is what an engine is not.",
  },
  {
    id: "F", name: "index grid", note: "rejected",
    mark: substrate({
      cuts: [[32, 6, 38, 94], [63, 6, 69, 94], [6, 32, 94, 38], [6, 63, 94, 69]],
      pip: [50, 50, 11],
    }),
    why: "Pure data, honestly drawn. But a 3x3 grid is a spreadsheet with better manners.",
  },
];

/* ------------------------------------------------------------------ *
 * RENDERING
 * ------------------------------------------------------------------ */

/**
 * Emit a mark as SVG.
 *   size    rendered edge length in user units (the 100-box scales to it)
 *   x, y    top-left of the rendered mark
 *   ink     everything but the pip
 *   signal  the pip
 *   pip     false to omit the pip entirely (single-ink applications)
 */
export function render(m, o = {}) {
  const {
    size = 100, x = 0, y = 0,
    ink = "var(--ink)", signal = "var(--signal)",
    pip = true, knockout = null, opacity = 1,
  } = o;
  const k = r3(size / D);
  const body = m.shapes.map((s) => `<path d="${rect(s.x, s.y, s.w, s.h)}" fill="${ink}"/>`).join("");
  const p = m.pip && pip
    ? `<circle cx="${m.pip[0]}" cy="${m.pip[1]}" r="${m.pip[2]}" fill="${knockout || signal}"/>`
    : "";
  return `<g transform="translate(${x} ${y}) scale(${k})"${opacity !== 1 ? ` opacity="${opacity}"` : ""}>${body}${p}</g>`;
}

/** Clearspace, in design-box units. The mark never comes closer to type or edge than this. */
export const CLEARSPACE = 8;

/** Optical centre of the mark's mass — used to align the lockup on its own bounds. */
export const MARK_CENTER = [50, 50];