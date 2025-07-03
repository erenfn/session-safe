# Use a lightweight Ubuntu base
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Accept build arguments for environment variables
ARG VNC_PASSWORD

# Set environment variables from build arguments
ENV VNC_PASSWORD=$VNC_PASSWORD

# Create a non-root user for better security
RUN groupadd -g 1000 browser && \
    useradd -u 1000 -g browser -m -s /bin/bash browser

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
    sudo \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for cookie extraction
RUN pip3 install requests cryptography

# Copy cookie extractor script and set permissions
COPY cookie_extractor.py /usr/local/bin/cookie_extractor.py
RUN chmod +x /usr/local/bin/cookie_extractor.py

# Set up Fluxbox configuration for the browser user
RUN mkdir -p /home/browser/.fluxbox
COPY docker/fluxbox-init /home/browser/.fluxbox/init

# Set up Chrome preferences to avoid first-run prompts for browser user
COPY docker/chrome_preferences.json /tmp/chrome_preferences.json
RUN mkdir -p /home/browser/.config/google-chrome/Default && \
    cp /tmp/chrome_preferences.json /home/browser/.config/google-chrome/Default/Preferences

# Copy and make chrome command script executable
COPY docker/chrome-command.sh /app/chrome-command.sh
RUN chmod +x /app/chrome-command.sh

# Copy and make x11vnc start script executable
COPY docker/start-x11vnc.sh /usr/local/bin/start-x11vnc.sh
RUN chmod +x /usr/local/bin/start-x11vnc.sh

# Set up supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create necessary directories and set proper ownership
RUN mkdir -p /var/log/supervisor && \
    mkdir -p /var/run && \
    chown -R browser:browser /home/browser && \
    chown browser:browser /usr/local/bin/cookie_extractor.py && \
    chown browser:browser /app/chrome-command.sh && \
    chmod 755 /var/log/supervisor && \
    chmod 755 /var/run

# Add browser user to necessary groups for X11 and device access
RUN usermod -a -G audio,video,dialout browser

# Expose VNC and noVNC ports
EXPOSE 5901 6080

# Start supervisord as root but with explicit config path for security
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 