#!/bin/bash
echo "VNC_PASSWORD is: $VNC_PASSWORD"
/usr/bin/x11vnc -display :1 -passwd "$VNC_PASSWORD" -listen localhost -xkb -forever -nevershared 