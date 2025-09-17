"""
WebSocket connection manager for real-time updates
"""

from fastapi import WebSocket
from typing import Dict, List, Any
import json

class WebSocketManager:
    """
    Manages WebSocket connections for optimization job updates
    """
    
    def __init__(self):
        # Map job_id to list of active WebSocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, job_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        
        if job_id not in self.active_connections:
            self.active_connections[job_id] = []
        
        self.active_connections[job_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, job_id: str):
        """Remove a WebSocket connection"""
        if job_id in self.active_connections:
            if websocket in self.active_connections[job_id]:
                self.active_connections[job_id].remove(websocket)
            
            # Clean up empty lists
            if not self.active_connections[job_id]:
                del self.active_connections[job_id]
    
    async def send_to_job(self, job_id: str, message: Dict[str, Any]):
        """Send message to all connections watching a specific job"""
        if job_id in self.active_connections:
            # Create a copy of the list to avoid modification during iteration
            connections = self.active_connections[job_id].copy()
            
            for websocket in connections:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    # Connection might be closed, remove it
                    self.disconnect(websocket, job_id)
    
    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected clients"""
        all_websockets = set()
        for connections in self.active_connections.values():
            all_websockets.update(connections)
        
        for websocket in all_websockets:
            try:
                await websocket.send_json(message)
            except:
                # Ignore failed sends
                pass
