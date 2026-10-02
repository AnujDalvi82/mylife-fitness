#!/usr/bin/env python3
"""
Launcher script for Fitness & Recomposition App.
Detects Mac's LAN IP address, displays access URLs for Phone and Mac,
and launches the Uvicorn/FastAPI server on 0.0.0.0:8000.
"""

import socket
import sys
import os
import uvicorn

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Does not actually connect, just determines route to external interface
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip

def main():
    local_ip = get_local_ip()
    port = 8000

    print("=" * 65)
    print("🚀 ANTIGRAVITY FIT: LOCAL LAN & PWA SERVER RUNNING")
    print("=" * 65)
    print(f"💻 On your Mac Browser:    http://localhost:{port}")
    print(f"📱 On your Mobile Phone:   http://{local_ip}:{port}")
    print("=" * 65)
    print("📲 Mobile Instructions:")
    print("   1. Connect your phone to the SAME Wi-Fi network as this Mac.")
    print(f"   2. Open Chrome or Safari and visit: http://{local_ip}:{port}")
    print("   3. Tap 'Share' (iOS) or 'Menu' (Android) ➔ 'Add to Home Screen'.")
    print("   4. The app will work 100% offline at college/gym and auto-sync")
    print("      all data and ML biofeedback to your Mac when you're home!")
    print("=" * 65 + "\n")

    # Scope reload directory strictly to fitness_planner to prevent watching entire home directory
    planner_dir = os.path.dirname(os.path.abspath(__file__))
    uvicorn.run(
        "server.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        reload_dirs=[planner_dir]
    )

if __name__ == "__main__":
    main()
