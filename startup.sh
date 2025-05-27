#!/bin/bash

echo "=== CryptoStalker Startup Script ==="
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

# Start the Flask backend server
echo "\n[3/5] Starting Flask backend server..."
python3 api/server.py > ./api-server.log 2>&1 &
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

# Start the Vite frontend server
echo "\n[5/5] Starting Vite frontend server..."
npm run dev > ./frontend-server.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

# Wait for the frontend to initialize
echo "Waiting for frontend to initialize..."
sleep 5

# Verify the frontend is running
if lsof -i :5173 > /dev/null 2>&1; then
    echo "✅ Frontend server is running on port 5173"
else
    echo "❌ Frontend server failed to start on port 5173"
    echo "Check frontend-server.log for details"
    exit 1
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