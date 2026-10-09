#!/usr/bin/env bash
# brand/publish.mjs target — copy the brand set into the npm packages.
#
# npm renders a package README against the *repository*, but a reader who has
# installed the package also has these files locally. Shipping them means the
# tarball, the page and the repo all show the same mark, and an app can reach
# for the file without a CDN.
#
# Run from brand/render.sh, or on its own after changing the mark.
set -euo pipefail
cd "$(dirname "$0")/.."

for pkg in packages/core packages/pixi; do
  [ -d "$pkg" ] || continue
  mkdir -p "$pkg/assets"
  cp brand/assets/mark.svg           "$pkg/assets/logo-mark.svg"
  cp brand/assets/mark-inverse.svg   "$pkg/assets/logo-mark-inverse.svg"
  cp brand/assets/lockup.svg         "$pkg/assets/logo-lockup.svg"
  cp brand/assets/lockup-inverse.svg "$pkg/assets/logo-lockup-inverse.svg"
  cp brand/assets/favicon.svg        "$pkg/assets/favicon.svg"
  echo "  $pkg/assets"
done