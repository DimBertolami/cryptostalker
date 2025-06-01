#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# Emoji helpers
CHECK="\xE2\x9C\x85"       # ✅
CROSS="\xE2\x9D\x8C"       # ❌
WARN="\xE2\x9A\xA0"        # ⚠
INFO="\xE2\x84\xB9"        # ℹ
STAR="\xE2\xAD\x90"        # ⭐

echo -e "${BOLD}${YELLOW}== Dimi Bertolami's CryptoStalker =="
echo -e "  🚀 ${BOLD}Launching ...${RESET}${YELLOW}  "
#echo -e "==============================${RESET}"

# Check for preview mode
PREVIEW_MODE=false
if [ "$1" = "preview" ]; then
    PREVIEW_MODE=true
    echo -e "${CYAN}${STAR} Running in PREVIEW mode - will build and preview the frontend${RESET}"
else
    echo -e "${CYAN}${STAR} Running in DEVELOPMENT mode - using Vite dev server${RESET}"
fi

echo -e "${CYAN}${STAR} This script will ensure a clean environment and start both backend and frontend${RESET}"

# Set the correct project directory
PROJECT_DIR="/home/dim/git/cryptostalker"
cd "$PROJECT_DIR"

# First run the shutdown script to ensure a clean start
echo -e "\n${BOLD}${BLUE}[1/5] shutdown script ...${RESET}"
./shutdown.sh

# Install npm dependencies (suppress output unless error)
#echo -e "\n${BOLD}${BLUE}[2/5] Installing npm dependencies...${RESET}"
npm install > /dev/null 2>npm-install-error.log
if [ $? -ne 0 ]; then
    echo -e "${RED}${CROSS} cat npm-install-error.log ${RESET}"
    exit 1
fi

# Wait for ports to be released
sleep 2

# Setup Python Virtual Environment for API and Install Dependencies
API_VENV_DIR="$PROJECT_DIR/api_venv"
echo -e "\n${BOLD}${BLUE}[*] Python virtual environment...${RESET}"

if [ ! -d "$API_VENV_DIR" ]; then
    echo -e "${CYAN}in $API_VENV_DIR...${RESET}"
    python3 -m venv "$API_VENV_DIR" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}${CROSS} pip install python3-venv"
        pip install python3-venv
        echo -e "${RESET}"
        exit 1
    fi
fi

#echo -e "${CYAN}Activating virtual environment...${RESET}"
# shellcheck source=/dev/null
source "$API_VENV_DIR/bin/activate"

# Set Python path to include project root
export PYTHONPATH="$PROJECT_DIR:$PYTHONPATH"

"$API_VENV_DIR/bin/pip" install --upgrade pip > /dev/null 2>&1
"$API_VENV_DIR/bin/pip" install -r "$PROJECT_DIR/api/requirements.txt" > /dev/null 2>pip-install-error.log
if [ $? -ne 0 ]; then
    echo -e "${RED}${CROSS} Failed to upgrade pip and install requirements.txt. details:${RESET}"
    cat pip-install-error.log
    deactivate
    exit 1
fi

# Start the Flask backend server with retry logic
MAX_RETRIES=3
RETRY_DELAY=3
for ((i=1; i<=MAX_RETRIES; i++)); do
    echo -e "\n${BOLD}${BLUE}[3/5] Starting Flask backend server... (Attempt $i/$MAX_RETRIES)${RESET}"
    PYTHONPATH="$PROJECT_DIR" "$API_VENV_DIR/bin/python3" "$PROJECT_DIR/api/server.py" > "$PROJECT_DIR/api-server.log" 2>&1 &
    BACKEND_PID=$!
    echo -e "${CYAN}Backend PID: $BACKEND_PID${RESET}"
    echo -e "${CYAN}backend initializing...${RESET}"
    sleep $RETRY_DELAY

    echo -e "\n${BOLD}${BLUE}[4/5] backend on port 5001${RESET}"
    if lsof -i :5001 > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} running${RESET}"
        break
    else
        echo -e "${RED}${CROSS} failed ($i/$MAX_RETRIES)${RESET}"
        if [ $i -eq $MAX_RETRIES ]; then
            echo -e "${YELLOW}cat api-server.log${RESET}"
            exit 1
        else
            echo -e "${YELLOW}Retrying in $RETRY_DELAY seconds...${RESET}"
            sleep $RETRY_DELAY
        fi
    fi
done

# Start the frontend based on mode
if [ "$PREVIEW_MODE" = true ]; then
    echo -e "\n${BOLD}${BLUE}[5/5] Building...${RESET}"
    # Use production environment variables
    if VITE_API_URL=/api npm run build; then
        echo -e "${GREEN}${CHECK} completed${RESET}"
        echo -e "${CYAN}Starting preview...${RESET}"
        npm run preview > ./frontend-server.log 2>&1 &
        FRONTEND_PID=$!
        echo -e "${CYAN}started with PID: $FRONTEND_PID${RESET}"
        
        # Wait for the frontend to initialize
        echo -e "${CYAN}Waiting to initialize...${RESET}"
        sleep 5
        
        # Verify the frontend is running (preview typically runs on 4173)
        if lsof -i :4173 > /dev/null 2>&1; then
            echo -e "${GREEN}${CHECK} running on port 4173${RESET}"
            echo -e "${BOLD}${CYAN} at: http://localhost:4173${RESET}"
        else
            echo -e "${RED}${CROSS} failed"
            cat frontend-server.log
            echo -e "${RESET}"
            exit 1
        fi
    else
        echo -e "${RED}${CROSS} failed${RESET}"
        echo -e "${YELLOW}Check for errors${RESET}"
        exit 1
    fi
else
    # Development mode
    echo -e "\n${BOLD}${BLUE}[5/5] Vite dev server...${RESET}"
    # Use development environment variables
    VITE_API_URL=http://localhost:5001/api npm run dev > ./frontend-server.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${CYAN}started with PID: $FRONTEND_PID${RESET}"
    
    # Wait for the frontend to initialize
    echo -e "${CYAN}initializing...${RESET}"
    sleep 5
    
    # Verify the frontend is running
    if lsof -i :5173 > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} running${RESET}"
        echo -e "${BOLD}${CYAN}http://localhost:5173${RESET}"
    else
        echo -e "${RED}${CROSS} failed${RESET}"
        cat frontend-server.log
        exit 1
    fi
fi

# Final verification step
echo -e "\n${BOLD}${BLUE}[6/6]connectivity check${RESET}"
sleep 2

# Test the API connection
if curl -s http://localhost:5001/api/test > /dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} API connection OK${RESET}"
else
    echo -e "${YELLOW}${WARN} API connection NOK${RESET}"
#    echo -e "${CYAN}This may be normal if the /api/test endpoint is not implemented${RESET}"
fi

# Print success message
echo -e "\n${BOLD}${GREEN}\ud83c\udf89 CryptoStalker is running! \ud83c\udf89${RESET}"
echo -e "${BOLD}${CYAN}Backend:${RESET} http://localhost:5001"
echo -e "${BOLD}${CYAN}Frontend:${RESET} http://localhost:5173"
echo "To stop: ./shutdown.sh"
echo "Log files: cat api-server.log and cat frontend-server.log"

# Save PIDs for the shutdown script
echo "$BACKEND_PID" > .backend.pid > /dev/null 2>&1;
echo "$FRONTEND_PID" > .frontend.pid > /dev/null 2>&1;
sleep 2

# Automated proxy test
PROXY_TEST_URL="http://localhost:5173/api/ccxt/exchanges"
PROXY_TEST_RESULT=$(curl -s -w "%{http_code}" -o /tmp/proxy_test_response.txt "$PROXY_TEST_URL")
if [ "$PROXY_TEST_RESULT" = "200" ]; then
    echo -e "${GREEN}${CHECK} Vite proxy to backend is WORKING: $PROXY_TEST_URL${RESET}"
else
    echo -e "${RED}${CROSS} Vite proxy to backend FAILED (HTTP $PROXY_TEST_RESULT): $PROXY_TEST_URL${RESET}"
    echo -e "${YELLOW}${WARN} Printing backend and frontend logs for debugging:${RESET}"
    #echo -e "${BOLD}--- api-server.log ---${RESET}"
    tail -n 20 api-server.log
    #echo -e "${BOLD}--- frontend-server.log ---${RESET}"
    tail -n 20 frontend-server.log
    echo -e "${RED}proxy or port issue?${RESET}"
fi

echo "Verifying Flask ..."
curl -s http://localhost:5001/api/new-cryptos >/dev/null && echo "server is running" || echo "server launch failed"