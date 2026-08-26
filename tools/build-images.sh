#!/usr/bin/env bash
# Regenerate the WebP derivatives used by the responsive <picture> elements.
#
# For every assets/images/NAME.jpg this produces:
#   assets/images/NAME.webp       — capped at 1280px wide (desktop)
#   assets/images/NAME-768.webp   — capped at  768px wide (mobile)
#
# The original JPEGs stay in place as the universal fallback.
# Requires ImageMagick (`convert`) with WebP support.

set -euo pipefail
cd "$(dirname "$0")/.."

shopt -s nullglob
for source in assets/images/*.jpg; do
    base="$(basename "$source" .jpg)"
    convert "$source" -strip -resize '1280x>' -quality 72 -define webp:method=6 "assets/images/${base}.webp"
    convert "$source" -strip -resize  '768x>' -quality 70 -define webp:method=6 "assets/images/${base}-768.webp"
    echo "built ${base}.webp + ${base}-768.webp"
done

echo
echo "JPEG originals: $(du -ch assets/images/*.jpg | tail -1 | cut -f1)"
echo "WebP (1280px):  $(du -ch assets/images/*[!8].webp | tail -1 | cut -f1)"
echo "WebP (768px):   $(du -ch assets/images/*-768.webp | tail -1 | cut -f1)"
