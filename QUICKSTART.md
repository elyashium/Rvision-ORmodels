# 🚀 Railway Network Optimization - Quick Start Guide

## ✅ Installation Complete!

The FastAPI backend has been successfully installed and tested. All core dependencies are working correctly.

## 📦 Installed Components

### Backend (FastAPI) ✅
- **FastAPI**: 0.116.1 (latest)
- **Uvicorn**: 0.35.0 (ASGI server)
- **NetworkX**: 3.5 (graph algorithms)
- **NumPy**: 2.3.3 (numerical computing)
- **Python-multipart**: 0.0.20 (form data)
- **Aiofiles**: 24.1.0 (async file operations)
- **Websockets**: 15.0.1 (real-time updates)

## 🎯 How to Start the System

### Option 1: Using the Start Script (Recommended)
```bash
cd backend
./start.sh
```

### Option 2: Manual Start
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Option 3: Direct Python
```bash
cd backend
source venv/bin/activate
python main.py
```

## 🔗 Available Endpoints

Once the server is running, you can access:

- **Main API**: http://localhost:8000/
- **Health Check**: http://localhost:8000/api/health
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## 🧪 Test the System

### 1. Check Health
```bash
curl http://localhost:8000/api/health
```

### 2. Trigger Optimization
```bash
curl -X POST http://localhost:8000/api/optimise \
  -H "Content-Type: application/json" \
  -d '{"disruption": {"type": "delay", "details": {"train_id": "T100", "delay_minutes": 20}}}'
```

### 3. Check Generated Graphs
```bash
ls backend/data/optimised/
```

## ✨ What's Working

✅ **FastAPI Backend** - Running on port 8000  
✅ **All API Endpoints** - Health, optimization, graph fetching  
✅ **Graph Generation** - Creates 3 optimized JSONs per run  
✅ **WebSocket Support** - Real-time progress updates  
✅ **NetworkX Integration** - Dijkstra pathfinding algorithms  
✅ **Auto Documentation** - Swagger UI at /docs  

## 📁 Generated Files

After running optimization, you'll find:
- `network_graph_opt_delay_*.json` - Delay-optimized routing
- `network_graph_opt_failure_*.json` - Failure recovery routing  
- `network_graph_opt_priority_*.json` - Priority-based routing

All files are stored in: `backend/data/optimised/`

## 🎨 Frontend (Optional)

If you want to run the React frontend:

```bash
cd frontend
npm install
npm start
```

The frontend will connect to the backend at http://localhost:8000

## 🛠️ Troubleshooting

If you encounter any issues:

1. **Port already in use**: 
   ```bash
   lsof -i :8000
   kill -9 <PID>
   ```

2. **Module not found**:
   ```bash
   cd backend
   source venv/bin/activate
   pip install fastapi uvicorn networkx numpy
   ```

3. **Permission denied**:
   ```bash
   chmod +x backend/start.sh
   ```

## 🎉 Success!

The system is fully operational. You can now:
- Run optimizations via the API
- View generated graphs in the data folder
- Access the interactive API documentation
- Connect a frontend for visualization

Enjoy your Railway Network Optimization System!
