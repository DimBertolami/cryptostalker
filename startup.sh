#!/bin/bash

echo "=== CryptoStalker Startup Script ==="

# Check for preview mode
PREVIEW_MODE=false
if [ "$1" = "preview" ]; then
    PREVIEW_MODE=true
    echo "Running in PREVIEW mode - will build and preview the frontend"
else
    echo "Running in DEVELOPMENT mode - using Vite dev server"
fi

echo "This script will ensure a clean environment and start both backend and frontend"

# Set the correct project directory
PROJECT_DIR="/home/dim/git/cryptostalker_latest"
cd "$PROJECT_DIR"

# First run the shutdown script to ensure a clean start
echo "\n[1/5] Running shutdown script to ensure a clean environment..."
./shutdown.sh

# Install npm dependencies
echo "\n[2/5] Installing npm dependencies..."
npm install

# Wait for ports to be released
sleep 2

# Setup Python Virtual Environment for API and Install Dependencies
API_VENV_DIR="$PROJECT_DIR/api_venv"
echo "\n[*] Setting up Python virtual environment for API..."

if [ ! -d "$API_VENV_DIR" ]; then
    echo "Creating virtual environment in $API_VENV_DIR..."
    python3 -m venv "$API_VENV_DIR"
    if [ $? -ne 0 ]; then
        echo "❌ Failed to create virtual environment. Please ensure python3-venv is installed."
        exit 1
    fi
fi

echo "Activating virtual environment and installing/updating dependencies..."
# shellcheck source=/dev/null
source "$API_VENV_DIR/bin/activate"

# Set Python path to include project root
export PYTHONPATH="$PROJECT_DIR:$PYTHONPATH"

"$API_VENV_DIR/bin/pip" install --upgrade pip > /dev/null
"$API_VENV_DIR/bin/pip" install -r "$PROJECT_DIR/api/requirements.txt"
if [ $? -ne 0 ]; then
    echo "❌ Failed to install Python dependencies from api/requirements.txt."
    deactivate
    exit 1
fi

# Start the Flask backend server using the virtual environment's Python
echo "\n[3/5] Starting Flask backend server..."
PYTHONPATH="$PROJECT_DIR" "$API_VENV_DIR/bin/python3" "$PROJECT_DIR/api/server.py" > "$PROJECT_DIR/api-server.log" 2>&1 &
# Deactivate should happen when the script or server stops, or manage in shutdown.sh
# For now, the subshell running the server will use the venv.
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

# Wait for the backend to initialize
echo "Waiting for backend to initialize..."
sleep 3

# Verify the backend is running
echo "\n[4/5] Verifying backend is running..."
if lsof -i :5001 > /dev/null 2>&1; then
    echo "✅ Backend server is running on port 5001"
else
    echo "❌ Backend server failed to start on port 5001"
    echo "Check api-server.log for details"
    exit 1
fi

# Start the frontend based on mode
if [ "$PREVIEW_MODE" = true ]; then
    echo "\n[5/5] Building frontend for preview..."
    # Use production environment variables
    if VITE_API_URL=/api npm run build; then
        echo "✅ Frontend build completed successfully"
        echo "Starting frontend preview server..."
        npm run preview > ./frontend-server.log 2>&1 &
        FRONTEND_PID=$!
        echo "Frontend preview started with PID: $FRONTEND_PID"
        
        # Wait for the frontend to initialize
        echo "Waiting for frontend preview to initialize..."
        sleep 5
        
        # Verify the frontend is running (preview typically runs on 4173)
        if lsof -i :4173 > /dev/null 2>&1; then
            echo "✅ Frontend preview is running on port 4173"
            echo "Access the preview at: http://localhost:4173"
        else
            echo "⚠ Frontend preview might have issues starting"
            echo "Check frontend-server.log for details"
        fi
    else
        echo "❌ Frontend build failed"
        echo "Check the build output above for errors"
        exit 1
    fi
else
    # Development mode
    echo "\n[5/5] Starting Vite development server..."
    # Use development environment variables
    VITE_API_URL=http://localhost:5001/api npm run dev > ./frontend-server.log 2>&1 &
    FRONTEND_PID=$!
    echo "Frontend dev server started with PID: $FRONTEND_PID"
    
    # Wait for the frontend to initialize
    echo "Waiting for frontend to initialize..."
    sleep 5
    
    # Verify the frontend is running
    if lsof -i :5173 > /dev/null 2>&1; then
        echo "✅ Frontend dev server is running on port 5173"
        echo "Access the development server at: http://localhost:5173"
    else
        echo "❌ Frontend dev server failed to start on port 5173"
        echo "Check frontend-server.log for details"
        exit 1
    fi
fi

# Final verification step
echo "\n[6/6] Verifying API connectivity..."
sleep 2

# Test the API connection
if curl -s http://localhost:5001/api/test > /dev/null 2>&1; then
    echo "✅ API connection successful"
else
    echo "⚠ API connection test failed, but servers are running"
    echo "This may be normal if the /api/test endpoint is not implemented"
fi

# Print success message
echo "\n=== CryptoStalker is now running! ==="
echo "Backend: http://localhost:5001"
echo "Frontend: http://localhost:5173"
echo "\nTo stop all services, run: ./shutdown.sh"
echo "Log files: api-server.log and frontend-server.log"

# Save PIDs for the shutdown script
echo "$BACKEND_PID" > .backend.pid
echo "$FRONTEND_PID" > .frontend.pid
sleep 2
echo "Verifying Flask server..."
curl -s http://localhost:5001/api/new-cryptos >/dev/null && echo "Flask server is running" || echo "Flask server failed to start"