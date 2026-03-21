#!/bin/bash
# Launch Chrome with QUIC/HTTP3 disabled for testing DIA scans

echo "🚀 Launching Chrome without QUIC protocol..."
echo "This will fix ERR_QUIC_PROTOCOL_ERROR for SSE endpoints"
echo ""

# Close existing Chrome instances
osascript -e 'quit app "Google Chrome"' 2>/dev/null
sleep 2

# Launch Chrome with QUIC disabled
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --disable-quic \
  --disable-http3 \
  --user-data-dir="/tmp/chrome-no-quic" \
  "https://www.dia-dev.com" \
  > /dev/null 2>&1 &

echo "✅ Chrome launched successfully!"
echo "📝 Navigate to https://www.dia-dev.com and test your scans"
echo ""
echo "Note: This is a temporary Chrome instance with a separate profile."
echo "Your normal Chrome bookmarks/history won't be available."
