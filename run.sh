#!/usr/bin/env bash

# ═══════════════════════════════════════════════════════════════════
#  MR_VIVASAYI — FRONTEND
# ═══════════════════════════════════════════════════════════════════

set -e

BOLD='\033[1m'
CYAN='\033[36m'
GREEN='\033[32m'
RED='\033[31m'
NC='\033[0m'

# Frontend absolute path
PROJECT_DIR="/home/ai/Desktop/Project/MR_VIVASAYI"

echo -e "${CYAN}${BOLD}"
echo "  ================================================================"
echo "                    MR_VIVASAYI"
echo "  ================================================================"
echo -e "${NC}"

# Check frontend folder
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}[✗] Folder path not found:${NC}"
    echo "    $PROJECT_DIR"
    exit 1
fi

echo -e "${GREEN}[✓] Folder found:${NC}"
echo "    $PROJECT_DIR"

# Go to frontend folder
cd "$PROJECT_DIR"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${CYAN}➜ Installing MR_VIVASAYI dependencies...${NC}"
    npm install
fi

echo -e "${GREEN}[✓] Dependencies ready.${NC}"

# Create logs directory
mkdir -p logs

LOG_FILE="$PROJECT_DIR/logs/mr_vivasayi.log"

echo -e "${GREEN}[✓] Log file:${NC}"
echo "    $LOG_FILE"

echo -e "\n${CYAN}➜ Starting MR_VIVASAYI frontend...${NC}"
echo -e "${CYAN}➜ Logs are being saved to:${NC}"
echo "    $LOG_FILE"
echo ""

# Start frontend and save logs while displaying them
npm run dev 2>&1 | tee -a "$LOG_FILE"


#watch
#tail -f MR_VIVASAYI/logs/mr_vivasayi.log
#remove
#rm -f MR_VIVASAYI/logs/mr_vivasayi.log