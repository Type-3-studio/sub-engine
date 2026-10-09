/**
 * brand/lockup.mjs — the horizontal lockup, from the shipped outlines.
 *
 * The wordmark's ink box is scaled to 62% of the mark's height and centred on
 * it, which lands the word on the block's optical centre. The gap is clearspace
 * (26u). Because the wordmark is outlined, this is renderer-independent: a
 * README, an npm page and a browser all get the same lockup.
 */
import { asset } from "./svg.mjs";
import { MARK, render, D } from "./marks.mjs";
import { WORDMARK } from "./wordmark.mjs";

export const GAP = 26;
export const WORD_RATIO = 0.62;

/** Geometry of the lockup at a given mark size. */
export function lockupMetrics(markSize = D) {
  const k = (markSize * WORD_RATIO) / WORDMARK.height;
  const wordW = WORDMARK.width * k;
  const width = markSize + GAP + wordW;
  return {
    k,
    wordW,
    width,
    height: markSize,
    wordX: markSize + GAP,
    wordY: (markSize - WORDMARK.height * k) / 2,
    ratio: width / markSize,
  };
}

/** Markup only — so callers can place it inside a larger document. */
export function lockupGroup(ink, signal, { markSize = D, wordFill = ink } = {}) {
  const m = lockupMetrics(markSize);
  return (
    render(MARK, { size: markSize, ink, signal }) +
    `<g transform="translate(${m.wordX.toFixed(2)} ${m.wordY.toFixed(2)}) scale(${m.k.toFixed(4)})" fill="${wordFill}">${WORDMARK.paths}</g>`
  );
}

/** A standalone lockup SVG file. */
export function lockupSvg(ink, signal, opts = {}) {
  const m = lockupMetrics(opts.markSize ?? D);
  return asset(
    Math.round(m.width),
    Math.round(m.height),
    lockupGroup(ink, signal, opts),
  );
}