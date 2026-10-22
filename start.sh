#!/bin/sh
# ═══════════════════════════════════════════════════════════════════
#  MR. VIVASAYI / LIFORA — Local Development Launcher (POSIX / sh / bash)
#  Runs: Vite Frontend + Local JSON Store Engine (port 5173)
#  Offline Store: JSON Engine (orders.json, products.json, users.json)
#  Usage: ./start.sh or bash start.sh or sh start.sh
# ═══════════════════════════════════════════════════════════════════

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/.logs"

# ── Colours ─────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
YELLOW='\033[1;33m'; BOLD='\033[1m'; RESET='\033[0m'
EMERALD='\033[38;5;35m'; AMBER='\033[38;5;214m'

# ── Detect Node & NPM binary ─────────────────────────────────────────
NODE_BIN=""
for p in \
    "/home/ai/Desktop/Personal/ied_project/node-env/bin/node" \
    "/home/ai/Desktop/Project/Flight_Scraping_Dashboard_Platform/.local-node/bin/node" \
    "$(which node 2>/dev/null)" \
    "/usr/local/bin/node" "/usr/bin/node"; do
    if [ -x "$p" ] 2>/dev/null; then
        NODE_BIN="$p"
        break
    fi
done

if [ -z "$NODE_BIN" ]; then
    printf "${RED}  ✗ Node.js binary not found. Please install Node.js (v18+)${RESET}\n"
    exit 1
fi

NODE_DIR="$(dirname "$NODE_BIN")"
NPM_BIN="$NODE_DIR/npm"
export PATH="$NODE_DIR:$PATH"

# ── Banner ───────────────────────────────────────────────────────────
printf "${BOLD}${EMERALD}\n"
cat << 'EOF'
  ███╗   ███╗██████╗     ██╗   ██╗██╗██╗   ██╗ █████╗ ███████╗ █████╗ ██╗   ██╗██╗
  ████╗ ████║██╔══██╗    ██║   ██║██║██║   ██║██╔══██╗██╔════╝██╔══██╗╚██╗ ██╔╝██║
  ██╔████╔██║██████╔╝    ██║   ██║██║██║   ██║███████║███████╗███████║ ╚████╔╝ ██║
  ██║╚██╔╝██║██╔══██╗    ╚██╗ ██╔╝██║╚██╗ ██╔╝██╔══██║╚════██║██╔══██║  ╚██╔╝  ██║
  ██║ ╚═╝ ██║██║  ██║     ╚████╔╝ ██║ ╚████╔╝ ██║  ██║███████║██║  ██║   ██║   ██║
  ╚═╝     ╚═╝╚═╝  ╚═╝      ╚═══╝  ╚═╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚═╝
EOF
printf "${RESET}${BOLD}  Organic Agri-Produce Commerce & Business Intelligence Platform${RESET}\n"
printf "  ${AMBER}Local Dev Launcher${RESET} — Dual Engine (Supabase DB + Offline JSON Store)\n\n"

mkdir -p "$LOG_DIR"

# ════════════════════════════════════════════════════════════════════
#  STEP 1 – Verify Node & Environment Setup
# ════════════════════════════════════════════════════════════════════
printf "${BOLD}[1/3] Checking environment & Node.js runtime...${RESET}\n"
NODE_VER=$("$NODE_BIN" -v 2>/dev/null)
printf "${GREEN}  ✓ Node runtime found: %s (%s)${RESET}\n" "$NODE_BIN" "$NODE_VER"

# Verify environment configuration
if [ ! -f "$ROOT_DIR/.env" ]; then
    printf "${YELLOW}  ! .env file not found. Copying .env.example to .env${RESET}\n"
    if [ -f "$ROOT_DIR/.env.example" ]; then
        cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
    fi
else
    printf "${GREEN}  ✓ Environment config .env verified${RESET}\n"
fi

# ════════════════════════════════════════════════════════════════════
#  STEP 2 – Check dependencies
# ════════════════════════════════════════════════════════════════════
printf "\n${BOLD}[2/3] Checking dependencies & offline JSON stores...${RESET}\n"

if [ ! -d "$ROOT_DIR/node_modules" ]; then
    printf "  Installing dependencies (one-time setup)...\n"
    (cd "$ROOT_DIR" && "$NPM_BIN" install)
    printf "${GREEN}  ✓ Dependencies installed successfully${RESET}\n"
else
    printf "${GREEN}  ✓ node_modules verified${RESET}\n"
fi

# Verify offline JSON data files (POSIX compatible loop without bash array)
for store in users.json products.json orders.json customers.json expenses.json inventory.json; do
    if [ -f "$ROOT_DIR/public/offline_data/$store" ]; then
        printf "${GREEN}  ✓ public/offline_data/%s ready${RESET}\n" "$store"
    else
        printf "${YELLOW}  ⚠ Warning: public/offline_data/%s not found${RESET}\n" "$store"
    fi
done

# ════════════════════════════════════════════════════════════════════
#  STEP 3 – Launch Development Server
# ════════════════════════════════════════════════════════════════════
printf "\n${BOLD}[3/3] Starting Vite application server...${RESET}\n"

# Free up port 5173 if busy
BUSY_PID=$(lsof -t -i:5173 2>/dev/null)
if [ -n "$BUSY_PID" ]; then
    printf "${YELLOW}  Freeing up port 5173 (killing PID: %s)...${RESET}\n" "$BUSY_PID"
    kill -9 $BUSY_PID 2>/dev/null || true
    sleep 1
fi

# Cleanup handler on Ctrl+C
cleanup() {
    printf "\n${YELLOW}  Shutting down server...${RESET}\n"
    [ -n "$VITE_PID" ] && kill "$VITE_PID" 2>/dev/null
    [ -n "$TAIL_PID" ] && kill "$TAIL_PID" 2>/dev/null
    printf "${GREEN}  ✓ Server stopped safely${RESET}\n"
    exit 0
}
trap cleanup INT TERM

cd "$ROOT_DIR"
"$NODE_BIN" ./node_modules/.bin/vite --host 0.0.0.0 --port 5173 > "$LOG_DIR/app.log" 2>&1 &
VITE_PID=$!

# Wait for server to respond
printf "  Waiting for dev server to boot "
i=1
while [ $i -le 30 ]; do
    sleep 0.5
    if curl -s -o /dev/null http://localhost:5173/ 2>/dev/null; then
        break
    fi
    printf "."
    i=$((i + 1))
done
printf "\n\n"

printf "  ${GREEN}✓ Platform App   ${RESET}→ ${BOLD}http://localhost:5173${RESET}\n"
printf "  ${GREEN}✓ Admin Portal   ${RESET}→ ${BOLD}http://localhost:5173/admin${RESET}\n"
printf "  ${GREEN}✓ Master Reports ${RESET}→ ${BOLD}http://localhost:5173/admin/reports${RESET}\n"
printf "  ${GREEN}✓ User Store     ${RESET}→ ${BOLD}public/offline_data/users.json${RESET}\n\n"

printf "  ${CYAN}Live app logs (Press Ctrl+C to stop):${RESET}\n"
printf "  ───────────────────────────────────────────────────────\n\n"

tail -f "$LOG_DIR/app.log" &
TAIL_PID=$!

wait "$VITE_PID"
kill "$TAIL_PID" 2>/dev/null
