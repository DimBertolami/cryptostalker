#!/bin/bash

echo "=== CryptoStalker Shutdown Script ==="
echo "This script will stop all running services"

# Set the correct project directory
PROJECT_DIR="/home/dim/git/cryptostalker"
cd "$PROJECT_DIR"

# Kill any existing Vite processes
echo "Killing Vite processes..."
pkill -f "vite" || echo "No Vite processes found"

# Kill any existing Flask processes
echo "Killing Flask processes..."
pkill -f "flask run" || pkill -f "python3.*server.py" || echo "No Flask processes found"

# Kill any processes on port 5001 (API server)

echo "Killing Flask processes..."
pkill -9 -f "server.py" || echo "No Flask processes found"

echo "Checking for processes on port 5001..."
if lsof -i :5001 > /dev/null 2>&1; then
    echo "Found processes on port 5001 - killing them..."
    kill $(lsof -t -i :5001) 2>/dev/null || echo "Failed to kill processes on port 5001"
    sleep 1
    if lsof -i :5001 > /dev/null 2>&1; then
        echo "Processes still on port 5001 after normal kill, force killing..."
        kill -9 $(lsof -t -i :5001) 2>/dev/null || echo "Failed to force kill processes on port 5001"
    fi
else
    echo "No processes found on port 5001"
fi

# Kill any processes on port 5173 (Vite dev server)
echo "Checking for processes on port 5173..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo "Found processes on port 5173 - killing them..."
    kill $(lsof -t -i :5173) 2>/dev/null || echo "Failed to kill processes on port 5173"
else
    echo "No processes found on port 5173"
fi

# Also try to kill using saved PIDs if available
if [ -f .backend.pid ]; then
    BACKEND_PID=$(cat .backend.pid)
    echo "Killing backend process with PID: $BACKEND_PID"
    kill $BACKEND_PID 2>/dev/null || echo "Backend process already stopped"
    rm .backend.pid
fi

if [ -f .frontend.pid ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    echo "Killing frontend process with PID: $FRONTEND_PID"
    kill $FRONTEND_PID 2>/dev/null || echo "Frontend process already stopped"
    rm .frontend.pid
fi

# Wait until ports 5001 and 5173 are free
MAX_WAIT=15
WAITED=0
while lsof -i :5001 > /dev/null 2>&1 || lsof -i :5173 > /dev/null 2>&1; do
    if [ $WAITED -ge $MAX_WAIT ]; then
        echo "Timeout: Ports 5001 or 5173 are still in use after $MAX_WAIT seconds."
        break
    fi
    echo "Waiting for ports 5001 and 5173 to be freed... ($WAITED/$MAX_WAIT)"
    sleep 1
    WAITED=$((WAITED+1))
done

# Remove PID files if still present
[ -f .backend.pid ] && rm .backend.pid
[ -f .frontend.pid ] && rm .frontend.pid

echo "=== All CryptoStalker services have been stopped and ports are free ==="
