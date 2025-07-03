#!/bin/bash
echo "VNC_PASSWORD is: $VNC_PASSWORD"
/usr/bin/x11vnc -display :1 -passwd "$VNC_PASSWORD" -listen localhost -xkb -ncache 10 -ncache_cr -forever -nevershared 