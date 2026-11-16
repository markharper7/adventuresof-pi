# π: Lost in Space — run / stop / restart the game's local web server.
# Works in Linux shells and Git Bash on Windows.
#
#   make run       start the server and open the game in a browser
#   make start     start the server only
#   make stop      stop the server
#   make restart   stop + start
#   make status    is it running?
#   make open      open the game in a browser
#
# Change the port with e.g.  make run PORT=9000
# Run a different game directory with e.g.  make run GAME=game2

GAME     ?= game
PORT     ?= 8005
PID_NAME := .server.pid
PID_FILE := $(GAME)/$(PID_NAME)
LOG_FILE := $(GAME)/.server.log
URL      := http://localhost:$(PORT)/

# Pick a working Python 3 (python3 on Linux, often just python on Windows).
PYTHON ?= $(shell for p in python3 python py; do \
	if $$p -c "import sys; sys.exit(0 if sys.version_info[0] == 3 else 1)" >/dev/null 2>&1; then echo $$p; break; fi; \
	done)

PORT_OPEN = $(PYTHON) -c "import socket,sys; s=socket.socket(); s.settimeout(0.5); sys.exit(0 if s.connect_ex(('127.0.0.1', $(PORT))) == 0 else 1)"

.PHONY: help run start stop restart status open

help:
	@echo "make run      - start the server and open the game ($(URL))"
	@echo "make start    - start the server only"
	@echo "make stop     - stop the server"
	@echo "make restart  - restart the server"
	@echo "make status   - show whether the server is running"
	@echo "make open     - open the game in your browser"

run: start open

start:
	@if [ -z "$(PYTHON)" ]; then echo "Python 3 not found - please install it."; exit 1; fi
	@if [ ! -f "$(GAME)/scripts/server.py" ]; then echo "No game found in '$(GAME)/' (missing $(GAME)/scripts/server.py)"; exit 1; fi
	@if $(PORT_OPEN); then \
		echo "Server already running at $(URL)"; \
	else \
		nohup $(PYTHON) $(GAME)/scripts/server.py $(PORT) $(PID_NAME) > $(LOG_FILE) 2>&1 & \
		for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do \
			if $(PORT_OPEN); then break; fi; sleep 0.3; \
		done; \
		if $(PORT_OPEN); then echo "Pi: Lost in Space is running at $(URL)"; \
		else echo "Server failed to start. Log:"; cat $(LOG_FILE); exit 1; fi; \
	fi

stop:
	@if [ -f $(PID_FILE) ]; then \
		pid=$$(cut -d' ' -f1 $(PID_FILE) | tr -d '\r'); \
		platform=$$(cut -d' ' -f2 $(PID_FILE) | tr -d '\r'); \
		if [ "$$platform" = "win32" ]; then taskkill //PID $$pid //F >/dev/null 2>&1 || true; \
		else kill $$pid 2>/dev/null || true; fi; \
		rm -f $(PID_FILE); \
		echo "Stopped server (PID $$pid)"; \
	else \
		echo "No server PID file found - nothing to stop."; \
	fi

restart: stop start

status:
	@if $(PORT_OPEN); then echo "Running at $(URL)"; else echo "Not running"; fi

open:
	@if command -v xdg-open >/dev/null 2>&1; then xdg-open "$(URL)" >/dev/null 2>&1 & \
	elif command -v open >/dev/null 2>&1; then open "$(URL)"; \
	elif command -v start >/dev/null 2>&1; then start "$(URL)"; \
	elif command -v cmd.exe >/dev/null 2>&1; then cmd.exe //c start "$(URL)"; \
	else echo "Open $(URL) in your browser"; fi
