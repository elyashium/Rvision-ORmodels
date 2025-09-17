"""
Pydantic models for request/response schemas
"""

from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

class JobStatus(str, Enum):
    """Job status enumeration"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class DisruptionType(str, Enum):
    """Types of disruptions"""
    DELAY = "delay"
    FAILURE = "failure"
    PRIORITY = "priority"

class DisruptionDetails(BaseModel):
    """Details about a disruption"""
    type: DisruptionType
    details: Dict[str, Any] = Field(
        default_factory=dict,
        description="Disruption-specific details"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "delay",
                "details": {
                    "train_id": "T100",
                    "delay_minutes": 20,
                    "location": "NDLS"
                }
            }
        }

class OptimizationRequest(BaseModel):
    """Request model for triggering optimization"""
    disruption: Dict[str, Any] = Field(
        ...,
        description="Disruption information"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional optimization parameters"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "disruption": {
                    "type": "delay",
                    "details": {
                        "train_id": "T100",
                        "delay_minutes": 20
                    }
                },
                "parameters": {
                    "priority_threshold": 3,
                    "max_reroute_distance": 50
                }
            }
        }

class OptimizationJob(BaseModel):
    """Model representing an optimization job"""
    job_id: str
    status: JobStatus = JobStatus.PENDING
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    disruption: Optional[Dict[str, Any]] = None
    parameters: Optional[Dict[str, Any]] = None
    result_files: Optional[Dict[str, str]] = None
    error: Optional[str] = None
    stats: Optional[Dict[str, Any]] = None

class GraphNode(BaseModel):
    """Railway network node (station)"""
    id: str
    label: str
    type: Optional[str] = "station"
    x: Optional[float] = None
    y: Optional[float] = None
    properties: Optional[Dict[str, Any]] = None

class GraphEdge(BaseModel):
    """Railway network edge (track segment)"""
    id: Optional[str] = None
    from_node: str = Field(..., alias="from")
    to_node: str = Field(..., alias="to")
    travel_time: float
    distance: Optional[float] = None
    status: str = "operational"
    properties: Optional[Dict[str, Any]] = None
    
    class Config:
        populate_by_name = True

class TrainRoute(BaseModel):
    """Train route information"""
    train_id: str
    train_name: Optional[str] = None
    path: List[str]
    current_position: Optional[str] = None
    expected_arrival: Optional[str] = None
    delay: int = 0
    priority: int = 3
    status: str = "on_time"

class GraphMetadata(BaseModel):
    """Graph metadata"""
    scenario: str
    generated_at: str
    source_graph: str = "network_graph.json"
    disruption: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    statistics: Optional[Dict[str, Any]] = None

class GraphData(BaseModel):
    """Complete graph data structure"""
    meta: GraphMetadata
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    trains: Optional[List[Dict[str, Any]]] = None
    routes: Optional[List[Dict[str, Any]]] = None

class GraphResponse(BaseModel):
    """Response model for graph endpoints"""
    status: str = "success"
    data: Dict[str, Any]
    filename: str
    timestamp: Optional[str] = None

class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str
    timestamp: str
    services: Dict[str, str]

class JobStatusResponse(BaseModel):
    """Job status response"""
    job_id: str
    status: str
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    progress: Optional[int] = None
    message: Optional[str] = None

class JobResultResponse(BaseModel):
    """Job result response"""
    job_id: str
    status: str
    result_files: Dict[str, str]
    stats: Optional[Dict[str, Any]] = None
    disruption: Optional[Dict[str, Any]] = None

class WebSocketMessage(BaseModel):
    """WebSocket message structure"""
    type: str  # status, progress, completed, error
    status: Optional[str] = None
    progress: Optional[int] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
