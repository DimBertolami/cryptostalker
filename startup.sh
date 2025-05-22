#!/bin/bash

# Kill any existing processes on port 5001
echo "Checking for existing processes on port 5001..."
if lsof -i :5001; then
    echo "Found existing process(es) on port 5001 - killing them..."
    kill $(lsof -t -i :5001)
    sleep 2  # Give time for the port to be released
fi

# Install dependencies
echo "Installing Python dependencies..."
pip install -r api/requirements.txt

echo "Installing Node.js dependencies..."
cd src && npm install && cd ..

# Start Flask backend with Gunicorn
echo "Starting Gunicorn server..."
cd api
# Stop any existing gunicorn process
pkill -f "gunicorn.*5001" || true
sleep 1
# Start new process with PID file - binding to 0.0.0.0 to allow external connections
gunicorn -w 4 -b 0.0.0.0:5001 server:app --pid /tmp/gunicorn.pid --access-logfile /tmp/gunicorn.access.log --error-logfile /tmp/gunicorn.error.log --timeout 120 &
cd ..

# Start Vite frontend
echo "Starting Vite frontend..."
cd src
npm run dev &
cd ..

# Verify Flask server is running and accessible
echo "Verifying Flask server..."
max_retries=10
retry_count=0
while [ $retry_count -lt $max_retries ]; do
    if curl -s http://localhost:5001/api/health >/dev/null; then
        echo "Flask server is running and accessible"
        break
    else
        echo "Waiting for Flask server to become available..."
        sleep 2
        retry_count=$((retry_count + 1))
    fi
done

if [ $retry_count -eq $max_retries ]; then
    echo "WARNING: Flask server could not be verified after $max_retries attempts"
fi