#!/bin/bash
set -e

PROFILE_DIR="/home/browser/.mozilla/firefox/session.default"

# ------------------------------------------------------------------
# 1) ensure a profile exists
# ------------------------------------------------------------------
if [ ! -d "${PROFILE_DIR}" ]; then
  echo "DEBUG: Creating first-run Firefox profile in ${PROFILE_DIR}"
  firefox --headless --CreateProfile "session ${PROFILE_DIR}"
fi

# If the cookie database doesn't exist yet (first container run), spawn headless Firefox once to generate it
if [ ! -f "${PROFILE_DIR}/cookies.sqlite" ]; then
  echo "DEBUG: Initializing Firefox profile databases..."
  firefox --headless --profile "${PROFILE_DIR}" "about:blank" &
  INIT_PID=$!
  # Wait up to 20 seconds for cookies.sqlite to be generated
  for i in {1..40}; do
    if [ -f "${PROFILE_DIR}/cookies.sqlite" ]; then
      break
    fi
    sleep 0.5
  done
  # Terminate the headless Firefox process
  kill -TERM "$INIT_PID" 2>/dev/null || true
  wait "$INIT_PID" 2>/dev/null || true
  echo "DEBUG: Firefox profile initialization complete"
fi

# ------------------------------------------------------------------
# 2) inject cookies (if supplied)
# ------------------------------------------------------------------
if [[ -n "$PRELOAD_COOKIES" ]]; then
  echo "DEBUG: Injecting preloaded cookies..."
  echo "$PRELOAD_COOKIES" | base64 -d > /tmp/cookies.json
  if python3 /app/cookie_injector.py --cookies-file /tmp/cookies.json --profile-path "${PROFILE_DIR}"; then
    echo "DEBUG: Cookie injection completed"
  else
    echo "WARNING: Cookie injection failed, continuing without cookies"
  fi
fi

# ------------------------------------------------------------------
# 3) launch Firefox with that profile
# ------------------------------------------------------------------
exec firefox \
     --kiosk \
     --profile "${PROFILE_DIR}" \
     --width=1280 --height=800 \
     "https://www.amazon.com/fmc/pastpurchases/whole-foods-market" 