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

echo -e "${BOLD}${CYAN}=============================="
echo -e "  🚀 ${BOLD}CryptoStalker Startup Script${RESET}${CYAN}  "
echo -e "==============================${RESET}"

# Check for preview mode
PREVIEW_MODE=false
if [ "$1" = "preview" ]; then
    PREVIEW_MODE=true
    echo -e "${YELLOW}${INFO} Running in PREVIEW mode - will build and preview the frontend${RESET}"
else
    echo -e "${BLUE}${INFO} Running in DEVELOPMENT mode - using Vite dev server${RESET}"
fi

echo -e "${CYAN}This script will ensure a clean environment and start both backend and frontend${RESET}"

# Set the correct project directory
PROJECT_DIR="/home/dim/git/cryptostalker"
cd "$PROJECT_DIR"

# First run the shutdown script to ensure a clean start
echo -e "\n${BOLD}${BLUE}[1/5] Running shutdown script to ensure a clean environment...${RESET}"
./shutdown.sh

# Install npm dependencies (suppress output unless error)
echo -e "\n${BOLD}${BLUE}[2/5] Installing npm dependencies...${RESET}"
npm install > /dev/null 2>npm-install-error.log
if [ $? -ne 0 ]; then
    echo -e "${RED}${CROSS} npm install failed. See npm-install-error.log for details.${RESET}"
    exit 1
fi

# Wait for ports to be released
sleep 2

# Setup Python Virtual Environment for API and Install Dependencies
API_VENV_DIR="$PROJECT_DIR/api_venv"
echo -e "\n${BOLD}${BLUE}[*] Setting up Python virtual environment for API...${RESET}"

if [ ! -d "$API_VENV_DIR" ]; then
    echo -e "${CYAN}Creating virtual environment in $API_VENV_DIR...${RESET}"
    python3 -m venv "$API_VENV_DIR" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${RED}${CROSS} Failed to create virtual environment. Please ensure python3-venv is installed.${RESET}"
        exit 1
    fi
fi

echo -e "${CYAN}Activating virtual environment and installing/updating dependencies...${RESET}"
# shellcheck source=/dev/null
source "$API_VENV_DIR/bin/activate"

# Set Python path to include project root
export PYTHONPATH="$PROJECT_DIR:$PYTHONPATH"

"$API_VENV_DIR/bin/pip" install --upgrade pip > /dev/null 2>&1
"$API_VENV_DIR/bin/pip" install -r "$PROJECT_DIR/api/requirements.txt" > /dev/null 2>pip-install-error.log
if [ $? -ne 0 ]; then
    echo -e "${RED}${CROSS} Failed to install Python dependencies from api/requirements.txt. See pip-install-error.log for details.${RESET}"
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
    echo -e "${CYAN}Backend started with PID: $BACKEND_PID${RESET}"
    echo -e "${CYAN}Waiting for backend to initialize...${RESET}"
    sleep $RETRY_DELAY

    echo -e "\n${BOLD}${BLUE}[4/5] Verifying backend is running...${RESET}"
    if lsof -i :5001 > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Backend server is running on port 5001${RESET}"
        break
    else
        echo -e "${RED}${CROSS} Backend server failed to start on port 5001 (Attempt $i/$MAX_RETRIES)${RESET}"
        if [ $i -eq $MAX_RETRIES ]; then
            echo -e "${YELLOW}Check api-server.log for details${RESET}"
            exit 1
        else
            echo -e "${YELLOW}Retrying in $RETRY_DELAY seconds...${RESET}"
            sleep $RETRY_DELAY
        fi
    fi
done

# Start the frontend based on mode
if [ "$PREVIEW_MODE" = true ]; then
    echo -e "\n${BOLD}${BLUE}[5/5] Building frontend for preview...${RESET}"
    # Use production environment variables
    if VITE_API_URL=/api npm run build; then
        echo -e "${GREEN}${CHECK} Frontend build completed successfully${RESET}"
        echo -e "${CYAN}Starting frontend preview server...${RESET}"
        npm run preview > ./frontend-server.log 2>&1 &
        FRONTEND_PID=$!
        echo -e "${CYAN}Frontend preview started with PID: $FRONTEND_PID${RESET}"
        
        # Wait for the frontend to initialize
        echo -e "${CYAN}Waiting for frontend preview to initialize...${RESET}"
        sleep 5
        
        # Verify the frontend is running (preview typically runs on 4173)
        if lsof -i :4173 > /dev/null 2>&1; then
            echo -e "${GREEN}${CHECK} Frontend preview is running on port 4173${RESET}"
            echo -e "${BOLD}${CYAN}Access the preview at: http://localhost:4173${RESET}"
        else
            echo -e "${YELLOW}${WARN} Frontend preview might have issues starting${RESET}"
            echo "Check frontend-server.log for details"
        fi
    else
        echo -e "${RED}${CROSS} Frontend build failed${RESET}"
        echo -e "${YELLOW}Check the build output above for errors${RESET}"
        exit 1
    fi
else
    # Development mode
    echo -e "\n${BOLD}${BLUE}[5/5] Starting Vite development server...${RESET}"
    # Use development environment variables
    VITE_API_URL=http://localhost:5001/api npm run dev > ./frontend-server.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${CYAN}Frontend dev server started with PID: $FRONTEND_PID${RESET}"
    
    # Wait for the frontend to initialize
    echo -e "${CYAN}Waiting for frontend to initialize...${RESET}"
    sleep 5
    
    # Verify the frontend is running
    if lsof -i :5173 > /dev/null 2>&1; then
        echo -e "${GREEN}${CHECK} Frontend dev server is running on port 5173${RESET}"
        echo -e "${BOLD}${CYAN}Access the development server at: http://localhost:5173${RESET}"
    else
        echo -e "${RED}${CROSS} Frontend dev server failed to start on port 5173${RESET}"
        echo "Check frontend-server.log for details"
        exit 1
    fi
fi

# Final verification step
echo -e "\n${BOLD}${BLUE}[6/6] Verifying API connectivity...${RESET}"
sleep 2

# Test the API connection
if curl -s http://localhost:5001/api/test > /dev/null 2>&1; then
    echo -e "${GREEN}${CHECK} API connection successful${RESET}"
else
    echo -e "${YELLOW}${WARN} API connection test failed, but servers are running${RESET}"
    echo -e "${CYAN}This may be normal if the /api/test endpoint is not implemented${RESET}"
fi

# Print success message
echo -e "\n${BOLD}${GREEN}🎉 CryptoStalker is now running! 🎉${RESET}"
echo -e "${BOLD}${CYAN}Backend:${RESET} http://localhost:5001"
echo -e "${BOLD}${CYAN}Frontend:${RESET} http://localhost:5173"
echo "\nTo stop all services, run: ./shutdown.sh"
echo "Log files: api-server.log and frontend-server.log"

# Save PIDs for the shutdown script
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid
sleep 2
echo "Verifying Flask server..."
curl -s http://localhost:5001/api/new-cryptos >/dev/null && echo "Flask server is running" || echo "Flask server failed to start"