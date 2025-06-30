# Use a lightweight Ubuntu base
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install minimal dependencies for browser-only setup
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    xvfb \
    x11vnc \
    fluxbox \
    novnc \
    websockify \
    supervisor \
    python3 \
    python3-pip \
    dbus-x11 \
    wmctrl \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for cookie extraction
RUN pip3 install requests cryptography

# Copy cookie extractor script
COPY cookie_extractor.py /usr/local/bin/cookie_extractor.py

# Set up Fluxbox configuration for a single workspace
COPY fluxbox-init /root/.fluxbox/init

# Set up supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy and make chrome command script executable
COPY chrome-command.sh /app/chrome-command.sh
RUN chmod +x /app/chrome-command.sh

# Set up Chrome preferences to avoid first-run prompts
COPY chrome_preferences.json /tmp/chrome_preferences.json
RUN mkdir -p /root/.config/google-chrome/Default && \
    cp /tmp/chrome_preferences.json /root/.config/google-chrome/Default/Preferences

# Expose VNC and noVNC ports
EXPOSE 5901 6080

CMD ["/usr/bin/supervisord"] 