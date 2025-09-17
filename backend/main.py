"""
FastAPI Railway Optimization Backend
Main application entry point with all API endpoints
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from contextlib import asynccontextmanager
import json
import os
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List
import uuid
from pathlib import Path

from app.models.schemas import (
    OptimizationRequest, 
    OptimizationJob,
    JobStatus,
    GraphResponse,
    HealthResponse
)
from app.services.optimizer import RailwayOptimizer
from app.services.graph_processor import GraphProcessor
from app.utils.websocket_manager import WebSocketManager

# Initialize directories
DATA_DIR = Path("./data")
ORIGINAL_DIR = DATA_DIR / "original"
OPTIMISED_DIR = DATA_DIR / "optimised"

for dir_path in [DATA_DIR, ORIGINAL_DIR, OPTIMISED_DIR]:
    dir_path.mkdir(parents=True, exist_ok=True)

# Job storage (in production, use Redis or database)
jobs_store: Dict[str, OptimizationJob] = {}

# WebSocket connection manager
ws_manager = WebSocketManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle management for the application"""
    # Startup
    print("🚀 Starting FastAPI Railway Optimization Backend...")
    
    # Check if network_graph.json exists
    original_graph_path = ORIGINAL_DIR / "network_graph.json"
    if not original_graph_path.exists():
        print("⚠️  network_graph.json not found, creating demo graph...")
        create_demo_graph(original_graph_path)
    
    print("✅ Backend ready!")
    yield
    
    # Shutdown
    print("🛑 Shutting down backend...")

app = FastAPI(
    title="Railway Network Optimization API",
    version="1.0.0",
    description="Real-time railway network optimization with decision support",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_demo_graph(filepath: Path):
    """Create a minimal demo graph if original is missing"""
    demo_graph = {
        "meta": {
            "name": "Demo Railway Network",
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "source": "auto-generated"
        },
        "nodes": [
            {"id": "NDLS", "label": "New Delhi", "type": "junction", "x": 100, "y": 200},
            {"id": "ANVR", "label": "Anand Vihar", "type": "terminal", "x": 300, "y": 200},
            {"id": "GZB", "label": "Ghaziabad", "type": "junction", "x": 500, "y": 200},
            {"id": "SBB", "label": "Sahibabad", "type": "station", "x": 400, "y": 100}
        ],
        "edges": [
            {"from": "NDLS", "to": "ANVR", "id": "NDLS_ANVR", "travel_time": 25, "distance": 15.2, "status": "operational"},
            {"from": "ANVR", "to": "GZB", "id": "ANVR_GZB", "travel_time": 30, "distance": 18.7, "status": "operational"},
            {"from": "NDLS", "to": "SBB", "id": "NDLS_SBB", "travel_time": 35, "distance": 22.1, "status": "operational"},
            {"from": "SBB", "to": "GZB", "id": "SBB_GZB", "travel_time": 20, "distance": 12.3, "status": "operational"}
        ],
        "trains": [
            {"id": "T100", "name": "Express", "current_node": "NDLS", "destination": "GZB", "priority": 1},
            {"id": "T200", "name": "Passenger", "current_node": "GZB", "destination": "NDLS", "priority": 3}
        ]
    }
    
    with open(filepath, 'w') as f:
        json.dump(demo_graph, f, indent=2)

@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "service": "Railway Network Optimization API",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/api/health",
            "graph": "/api/graph/original",
            "optimize": "/api/optimise",
            "docs": "/docs"
        }
    }

@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="ok",
        version="1.0.0",
        timestamp=datetime.utcnow().isoformat() + "Z",
        services={
            "optimizer": "operational",
            "graph_processor": "operational",
            "websocket": "operational"
        }
    )

@app.get("/api/graph/original", response_model=GraphResponse, tags=["Graph"])
async def get_original_graph():
    """Get the original network graph"""
    try:
        graph_path = ORIGINAL_DIR / "network_graph.json"
        if not graph_path.exists():
            raise HTTPException(status_code=404, detail="Original graph not found")
        
        with open(graph_path, 'r') as f:
            graph_data = json.load(f)
        
        # Convert to nodes/edges format if needed
        if "stations" in graph_data and "nodes" not in graph_data:
            # Initialize optimizer to get converted format
            optimizer = RailwayOptimizer(graph_data)
            
            # Create converted graph with nodes and edges
            converted_data = {
                "meta": graph_data.get("meta", {}),
                "nodes": getattr(optimizer, 'nodes_list', []),
                "edges": getattr(optimizer, 'edges_list', []),
                "trains": graph_data.get("trains", [])
            }
            
            return GraphResponse(
                status="success",
                data=converted_data,
                filename="network_graph.json"
            )
        
        return GraphResponse(
            status="success",
            data=graph_data,
            filename="network_graph.json"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph/{filename}", response_model=GraphResponse, tags=["Graph"])
async def get_graph_by_filename(filename: str):
    """Get any graph by filename"""
    try:
        # Check in both original and optimised directories
        for directory in [ORIGINAL_DIR, OPTIMISED_DIR]:
            graph_path = directory / filename
            if graph_path.exists():
                with open(graph_path, 'r') as f:
                    graph_data = json.load(f)
                
                return GraphResponse(
                    status="success",
                    data=graph_data,
                    filename=filename
                )
        
        raise HTTPException(status_code=404, detail=f"Graph '{filename}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimise", tags=["Optimization"])
async def trigger_optimization(
    request: OptimizationRequest,
    background_tasks: BackgroundTasks
):
    """Trigger optimization job"""
    try:
        # Create job
        job_id = str(uuid.uuid4())
        job = OptimizationJob(
            job_id=job_id,
            status=JobStatus.PENDING,
            created_at=datetime.utcnow(),
            disruption=request.disruption,
            parameters=request.parameters
        )
        
        jobs_store[job_id] = job
        
        # Start optimization in background
        background_tasks.add_task(
            run_optimization,
            job_id,
            request.disruption
        )
        
        return {
            "job_id": job_id,
            "status": "accepted",
            "message": "Optimization job started"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_optimization(job_id: str, disruption: Dict[str, Any]):
    """Run the optimization process"""
    try:
        # Update job status
        jobs_store[job_id].status = JobStatus.RUNNING
        jobs_store[job_id].started_at = datetime.utcnow()
        
        # Notify via WebSocket
        await ws_manager.send_to_job(job_id, {
            "type": "status",
            "status": "running",
            "progress": 10,
            "message": "Loading original graph..."
        })
        
        # Load original graph
        original_path = ORIGINAL_DIR / "network_graph.json"
        with open(original_path, 'r') as f:
            original_graph = json.load(f)
        
        # Initialize optimizer and processor
        optimizer = RailwayOptimizer(original_graph)
        processor = GraphProcessor()
        
        # Generate optimized graphs based on disruption type
        disruption_type = disruption.get("type", "delay")
        
        # Progress updates
        await ws_manager.send_to_job(job_id, {
            "type": "status",
            "status": "running",
            "progress": 30,
            "message": f"Running {disruption_type} optimization..."
        })
        
        # Simulate processing time for realistic feel
        await asyncio.sleep(1)
        
        # Generate three optimized versions
        optimized_graphs = {}
        
        # 1. Delay optimization
        await ws_manager.send_to_job(job_id, {
            "type": "status",
            "status": "running", 
            "progress": 50,
            "message": "Generating delay-optimized graph..."
        })
        delay_graph = optimizer.optimize_for_delay(disruption)
        delay_filename = f"network_graph_opt_delay_{job_id[:8]}.json"
        delay_path = OPTIMISED_DIR / delay_filename
        with open(delay_path, 'w') as f:
            json.dump(delay_graph, f, indent=2)
        optimized_graphs["delay"] = delay_filename
        
        await asyncio.sleep(0.5)
        
        # 2. Failure optimization
        await ws_manager.send_to_job(job_id, {
            "type": "status",
            "status": "running",
            "progress": 70,
            "message": "Generating failure-optimized graph..."
        })
        failure_graph = optimizer.optimize_for_failure(disruption)
        failure_filename = f"network_graph_opt_failure_{job_id[:8]}.json"
        failure_path = OPTIMISED_DIR / failure_filename
        with open(failure_path, 'w') as f:
            json.dump(failure_graph, f, indent=2)
        optimized_graphs["failure"] = failure_filename
        
        await asyncio.sleep(0.5)
        
        # 3. Priority optimization
        await ws_manager.send_to_job(job_id, {
            "type": "status",
            "status": "running",
            "progress": 90,
            "message": "Generating priority-optimized graph..."
        })
        priority_graph = optimizer.optimize_for_priority(disruption)
        priority_filename = f"network_graph_opt_priority_{job_id[:8]}.json"
        priority_path = OPTIMISED_DIR / priority_filename
        with open(priority_path, 'w') as f:
            json.dump(priority_graph, f, indent=2)
        optimized_graphs["priority"] = priority_filename
        
        # Update job with results
        jobs_store[job_id].status = JobStatus.COMPLETED
        jobs_store[job_id].completed_at = datetime.utcnow()
        jobs_store[job_id].result_files = optimized_graphs
        jobs_store[job_id].stats = {
            "processing_time": (
                jobs_store[job_id].completed_at - jobs_store[job_id].started_at
            ).total_seconds(),
            "graphs_generated": 3,
            "disruption_type": disruption_type
        }
        
        # Final notification
        await ws_manager.send_to_job(job_id, {
            "type": "completed",
            "status": "done",
            "progress": 100,
            "message": "Optimization completed successfully",
            "result_files": optimized_graphs
        })
        
    except Exception as e:
        # Handle errors
        jobs_store[job_id].status = JobStatus.FAILED
        jobs_store[job_id].error = str(e)
        
        await ws_manager.send_to_job(job_id, {
            "type": "error",
            "status": "failed",
            "message": f"Optimization failed: {str(e)}"
        })

@app.get("/api/optimise/status/{job_id}", tags=["Optimization"])
async def get_job_status(job_id: str):
    """Get optimization job status"""
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_store[job_id]
    return {
        "job_id": job_id,
        "status": job.status.value,
        "created_at": job.created_at.isoformat() + "Z",
        "started_at": job.started_at.isoformat() + "Z" if job.started_at else None,
        "completed_at": job.completed_at.isoformat() + "Z" if job.completed_at else None,
        "stats": job.stats
    }

@app.get("/api/optimise/result/{job_id}", tags=["Optimization"])
async def get_job_results(job_id: str):
    """Get optimization job results"""
    if job_id not in jobs_store:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job = jobs_store[job_id]
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=400, 
            detail=f"Job is {job.status.value}. Results only available for completed jobs."
        )
    
    return {
        "job_id": job_id,
        "status": "completed",
        "result_files": job.result_files,
        "stats": job.stats,
        "disruption": job.disruption
    }

@app.websocket("/api/optimise/stream/{job_id}")
async def websocket_stream(websocket: WebSocket, job_id: str):
    """WebSocket endpoint for streaming optimization progress"""
    await ws_manager.connect(websocket, job_id)
    
    try:
        # Send initial status
        if job_id in jobs_store:
            job = jobs_store[job_id]
            await websocket.send_json({
                "type": "connected",
                "job_id": job_id,
                "current_status": job.status.value
            })
        
        # Keep connection alive
        while True:
            # Wait for messages (heartbeat)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, job_id)

@app.get("/api/jobs", tags=["Optimization"])
async def list_jobs(limit: int = 10):
    """List recent optimization jobs"""
    jobs_list = sorted(
        jobs_store.values(),
        key=lambda x: x.created_at,
        reverse=True
    )[:limit]
    
    return {
        "jobs": [
            {
                "job_id": job.job_id,
                "status": job.status.value,
                "created_at": job.created_at.isoformat() + "Z",
                "disruption_type": job.disruption.get("type") if job.disruption else None
            }
            for job in jobs_list
        ],
        "total": len(jobs_store)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
