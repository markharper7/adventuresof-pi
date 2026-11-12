"""Tiny static file server for the game.

Usage: python scripts/server.py [PORT] [PID_FILE]

Serves the game directory (the parent of this script) on 127.0.0.1 and writes
"<pid> <platform>" to PID_FILE so `make stop` knows how to stop it.
"""
import atexit
import functools
import http.server
import os
import sys

GAME_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8005
pid_file = os.path.join(GAME_DIR, sys.argv[2] if len(sys.argv) > 2 else ".server.pid")


class Handler(http.server.SimpleHTTPRequestHandler):
    # Windows' registry sometimes maps .js to text/plain, which breaks ES modules.
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".json": "application/json",
    }

    def end_headers(self):
        # Always serve fresh files so edits show up on refresh.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass


def cleanup():
    try:
        os.remove(pid_file)
    except OSError:
        pass


def main():
    handler = functools.partial(Handler, directory=GAME_DIR)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    with open(pid_file, "w", newline="\n") as f:
        f.write(f"{os.getpid()} {sys.platform}\n")
    atexit.register(cleanup)
    print(f"Serving {GAME_DIR} at http://localhost:{port}/", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
