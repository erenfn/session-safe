#!/bin/bash

google-chrome --no-sandbox \
  --disable-infobars \
  --disable-dev-shm-usage \
  --disable-gpu \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --window-size=1280,800 \
  --window-position=0,0 \
  --app="https://www.amazon.com/fmc/pastpurchases/whole-foods-market" \
  --no-first-run \
  --no-default-browser-check \
  --disable-default-apps \
  --disable-extensions \
  --disable-plugins \
  --disable-sync \
  --disable-background-networking \
  --disable-background-timer-throttling \
  --disable-client-side-phishing-detection \
  --disable-component-update \
  --disable-domain-reliability \
  --disable-features=TranslateUI \
  --disable-ipc-flooding-protection \
  --disable-renderer-backgrounding \
  --disable-backgrounding-occluded-windows \
  --metrics-recording-only \
  --no-report-upload \
  --start-fullscreen 