#!/usr/bin/env bash
# brand/render.sh — rebuild every board, the card and the install set.
#
#   brand/render.sh
#
# The SVG is the source of truth. This only rasterises what a browser (or a
# social scraper) cannot draw for itself: the boards, and the OG card, which
# has to be a raster because crawlers do not render SVG.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p docs/brand assets

build () {   # build <script> <svg>   — regenerate an SVG from its source
  node "brand/$1"
}

shot () {    # shot <svg> <png> <w> <h>
  local svg="$1" png="$2" w="$3" h="$4"
  google-chrome --headless --disable-gpu --no-sandbox --hide-scrollbars \
    --allow-file-access-from-files \
    --screenshot="$png" --window-size="$w,$h" "$svg" 2>/dev/null
}

echo "generating ->"
build explore.mjs
build kit.mjs
build spec.mjs
build og.mjs
build export.mjs

echo "rasterising ->"
shot brand/01-mark-exploration.svg docs/brand/01-mark-exploration.png 1400 1120
shot brand/02-brand-system.svg      docs/brand/02-brand-system.png      1600 1000
shot brand/03-spec.svg              docs/brand/03-spec.png              1400  920
shot brand/og-image.svg             assets/og-image.png                 1200  630
echo "  assets/og-image.png"

# Raster icons, for the places that will not take an SVG: the studio site's
# project card, a PWA manifest on iOS, a Slack unfurl.
for s in 512 192 180; do
  shot brand/assets/mark.svg "assets/icon-${s}.png" "$s" "$s"
  shot brand/assets/mark-inverse.svg "assets/icon-${s}-inverse.png" "$s" "$s"
  printf '  assets/icon-%s.png\n' "$s"
done

echo "installing ->"
# The repo root is what a README, an npm page and the studio site can all point
# at. brand/assets stays the source of truth; this is a copy, regenerated.
cp brand/assets/mark.svg           assets/logo-mark.svg
cp brand/assets/mark-inverse.svg   assets/logo-mark-inverse.svg
cp brand/assets/mark-flat.svg      assets/logo-mark-flat.svg
cp brand/assets/mark-flat-inverse.svg assets/logo-mark-flat-inverse.svg
cp brand/assets/lockup.svg         assets/logo-lockup.svg
cp brand/assets/lockup-inverse.svg assets/logo-lockup-inverse.svg
cp brand/assets/wordmark.svg       assets/logo-wordmark.svg
cp brand/assets/favicon.svg        assets/favicon.svg
cp brand/assets/site.webmanifest   assets/site.webmanifest
for f in logo-mark logo-mark-inverse logo-mark-flat logo-mark-flat-inverse \
         logo-lockup logo-lockup-inverse logo-wordmark favicon site.webmanifest; do
  printf '  assets/%s\n' "$f"
done
printf '  assets/og-image.png\n'

brand/publish.sh

echo "done"