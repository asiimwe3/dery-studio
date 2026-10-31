#!/bin/sh
# Rebuild Dery Studio: bump the asset version so phones never keep an old copy.
V=$(date +%s)
sed -i "s|dery2\.js?v=[0-9]*|dery2.js?v=$V|; s|app\.js?v=[0-9]*|app.js?v=$V|" index.html
echo "built with version $V"
