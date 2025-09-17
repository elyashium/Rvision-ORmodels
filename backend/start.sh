#!/bin/bash

# FastAPI Backend Startup Script

echo "🚀 Starting Railway Network Optimization Backend..."
echo "=================================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Check if dependencies are installed
if ! python -c "import fastapi" 2>/dev/null; then
    echo "📦 Installing dependencies..."
    pip install --upgrade pip
    pip install fastapi uvicorn networkx numpy python-multipart aiofiles websockets
fi

# Create data directories if they don't exist
mkdir -p data/original data/optimised

# Start the FastAPI server
echo ""
echo "✅ Backend ready! Starting server..."
echo "📡 API available at: http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🔄 Swagger UI: http://localhost:8000/redoc"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="

# Run the server with auto-reload for development
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
