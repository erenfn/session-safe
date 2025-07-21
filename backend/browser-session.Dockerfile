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

# Install minimal dependencies and Firefox (deb package, not snap)
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        wget \
        gnupg \
        software-properties-common \
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
        sudo && \
    add-apt-repository -y ppa:mozillateam/ppa && \
    echo "Package: firefox*" > /etc/apt/preferences.d/mozilla-firefox && \
    echo "Pin: release o=LP-PPA-mozillateam" >> /etc/apt/preferences.d/mozilla-firefox && \
    echo "Pin-Priority: 1001" >> /etc/apt/preferences.d/mozilla-firefox && \
    apt-get update && \
    apt-get install -y --no-install-recommends firefox && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python dependencies for cookie extraction
RUN pip3 install requests cryptography

# Copy cookie extractor script and set permissions
COPY cookie_extractor.py /usr/local/bin/cookie_extractor.py
RUN chmod +x /usr/local/bin/cookie_extractor.py

# Copy cookie injector script and set permissions
COPY cookie_injector.py /app/cookie_injector.py
RUN chmod +x /app/cookie_injector.py

# Set up Fluxbox configuration for the browser user
RUN mkdir -p /home/browser/.fluxbox
COPY docker/fluxbox-init /home/browser/.fluxbox/init

# Set up Firefox preferences to avoid first-run prompts for browser user
# (Optional: Add a user.js if needed)

# Copy and make firefox command script executable
COPY docker/firefox-command.sh /app/firefox-command.sh
RUN chmod +x /app/firefox-command.sh

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
    chown browser:browser /app/firefox-command.sh && \
    chmod 755 /var/log/supervisor && \
    chmod 755 /var/run

# Add browser user to necessary groups for X11 and device access
RUN usermod -a -G audio,video,dialout browser

# Expose VNC and noVNC ports
EXPOSE 5901 6080

# Start supervisord as root but with explicit config path for security
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"] 