#!/bin/bash
# Reads .dronz/groups.json and copies the env var line to clipboard
DIR="$(cd "$(dirname "$0")/.." && pwd)"
JSON=$(node -e "process.stdout.write(JSON.stringify(JSON.parse(require('fs').readFileSync('$DIR/.dronz/groups.json','utf8'))))")
LINE="GROUPS_CONFIG=$JSON"
echo "$LINE"
echo "$LINE" | pbcopy
echo ""
echo "Copied to clipboard."
