#!/bin/sh
# Bump the asset version on every page so no phone can keep a stale copy.
V=$(date +%s)
for f in index.html studio.html; do
  [ -f "$f" ] && sed -i "s|dery2\.js?v=[0-9]*|dery2.js?v=$V|; s|app\.js?v=[0-9]*|app.js?v=$V|" "$f"
done
echo "built with version $V"
