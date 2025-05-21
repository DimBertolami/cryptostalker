#!/bin/bash

# Kill any existing processes on port 5001
echo "Checking for existing processes on port 5001..."
if lsof -i :5001; then
    echo "Found existing process(es) on port 5001 - killing them..."
    kill $(lsof -t -i :5001)
    sleep 2  # Give time for the port to be released
fi

# Navigate to project directory
cd /home/dim/Downloads/cryptostalker

# Install dependencies
echo "Installing Python dependencies..."
pip install -r api/requirements.txt

echo "Installing Node.js dependencies..."
cd src && npm install && cd ..

# Start Redis (uncomment if using Redis)
# echo "Starting Redis..."
# sudo systemctl start redis-server

# Start Flask backend with Gunicorn with proper process management
echo "Starting Gunicorn server..."
cd api
# Stop any existing gunicorn process
pkill -f "gunicorn.*5001" || true
sleep 1
# Start new process with PID file
gunicorn -w 4 -b 127.0.0.1:5001 server:app --pid /tmp/gunicorn.pid --access-logfile /tmp/gunicorn.access.log --error-logfile /tmp/gunicorn.error.log &
cd ..

# Start Vite frontend with PM2
echo "Starting PM2 process for Vite..."
cd src 
pm2 delete cryptostalker-frontend 2>/dev/null || true
pm2 start npm --name "cryptostalker-frontend" -- run dev
cd ..

# Save PM2 process list
pm2 save

# Display status
echo "Current server status:"
pm2 status
echo "Gunicorn processes:"
pgrep -fl "gunicorn.*5001" || echo "No Gunicorn processes found"

# Verify Flask server is running
sleep 2
echo "Verifying Flask server..."
curl -s http://localhost:5001/api/new-cryptos >/dev/null && echo "Flask server is running" || echo "Flask server failed to start"