#!/usr/bin/env python3
# Simple static server at 0.0.0.0:8080
import http.server, socketserver
PORT=8080
Handler=http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(('',PORT),Handler) as httpd:
    print(f"Serving at http://0.0.0.0:{PORT}")
    httpd.serve_forever()
