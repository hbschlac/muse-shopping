#!/bin/bash
# Run the TJ Maxx new-arrivals scraper every 15 minutes on this Mac (launchd).
# It runs only while the Mac is awake; launchd catches up once after sleep.
#
#   bash scripts/schedule-tjmaxx-scraper.sh            # install / update
#   bash scripts/schedule-tjmaxx-scraper.sh --remove   # stop it
#
# Log: ~/Library/Logs/muse-tjmaxx.log
set -euo pipefail

LABEL="shopping.muse.tjmaxx-new-arrivals"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
NODE="$(command -v node)"
LOG="$HOME/Library/Logs/muse-tjmaxx.log"

if [[ "${1:-}" == "--remove" ]]; then
  launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "Stopped the TJ Maxx schedule."
  exit 0
fi

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>WorkingDirectory</key><string>$REPO</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE</string>
    <string>$REPO/scripts/scrape-tjmaxx-new-arrivals.js</string>
    <string>--headless</string>
    <string>--pages</string><string>2</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>PATH</key><string>$(dirname "$NODE"):/usr/bin:/bin</string>
  </dict>
  <key>StartInterval</key><integer>900</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"
echo "TJ Maxx scraper now runs every 15 minutes. Log: $LOG"
