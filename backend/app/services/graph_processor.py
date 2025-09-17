"""
Graph processing utilities for network visualization
"""

from typing import Dict, Any, List
import json

class GraphProcessor:
    """
    Utilities for processing and formatting graph data
    """
    
    @staticmethod
    def convert_to_vis_format(graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Convert graph data to vis-network format"""
        vis_nodes = []
        vis_edges = []
        
        # Process nodes
        if "nodes" in graph_data:
            for node in graph_data["nodes"]:
                vis_node = {
                    "id": node["id"],
                    "label": node.get("label", node["id"]),
                    "group": node.get("type", "station"),
                    "x": node.get("x"),
                    "y": node.get("y")
                }
                vis_nodes.append(vis_node)
        elif "stations" in graph_data:
            x_pos = 100
            for station_id, station_data in graph_data["stations"].items():
                vis_node = {
                    "id": station_id,
                    "label": station_data.get("name", station_id),
                    "group": station_data.get("type", "station"),
                    "x": x_pos,
                    "y": 200
                }
                vis_nodes.append(vis_node)
                x_pos += 150
        
        # Process edges
        if "edges" in graph_data:
            for idx, edge in enumerate(graph_data["edges"]):
                vis_edge = {
                    "id": edge.get("id", f"edge_{idx}"),
                    "from": edge["from"],
                    "to": edge["to"],
                    "label": f"{edge.get('travel_time', '')} min",
                    "color": GraphProcessor.get_edge_color(edge.get("status", "operational"))
                }
                vis_edges.append(vis_edge)
        elif "tracks" in graph_data:
            for track_id, track_data in graph_data["tracks"].items():
                vis_edge = {
                    "id": track_id,
                    "from": track_data["from"],
                    "to": track_data["to"],
                    "label": f"{track_data.get('travel_time_minutes', '')} min",
                    "color": GraphProcessor.get_edge_color(track_data.get("status", "operational"))
                }
                vis_edges.append(vis_edge)
        
        return {
            "nodes": vis_nodes,
            "edges": vis_edges
        }
    
    @staticmethod
    def get_edge_color(status: str) -> str:
        """Get edge color based on status"""
        color_map = {
            "operational": "#2ecc71",  # Green
            "delayed": "#f39c12",      # Orange
            "failed": "#e74c3c",       # Red
            "maintenance": "#95a5a6"   # Gray
        }
        return color_map.get(status, "#3498db")  # Default blue
    
    @staticmethod
    def calculate_graph_diff(original: Dict[str, Any], optimized: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate differences between two graphs"""
        diff = {
            "added_edges": [],
            "removed_edges": [],
            "modified_edges": [],
            "train_changes": []
        }
        
        # Compare edges
        original_edges = {e.get("id", f"{e['from']}_{e['to']}"): e 
                         for e in original.get("edges", [])}
        optimized_edges = {e.get("id", f"{e['from']}_{e['to']}"): e 
                          for e in optimized.get("edges", [])}
        
        for edge_id in optimized_edges:
            if edge_id not in original_edges:
                diff["added_edges"].append(optimized_edges[edge_id])
            elif optimized_edges[edge_id].get("status") != original_edges.get(edge_id, {}).get("status"):
                diff["modified_edges"].append(optimized_edges[edge_id])
        
        for edge_id in original_edges:
            if edge_id not in optimized_edges:
                diff["removed_edges"].append(original_edges[edge_id])
        
        # Compare trains
        if "trains" in original and "trains" in optimized:
            original_trains = {t["id"]: t for t in original["trains"]}
            optimized_trains = {t["id"]: t for t in optimized["trains"]}
            
            for train_id in optimized_trains:
                if train_id in original_trains:
                    orig_train = original_trains[train_id]
                    opt_train = optimized_trains[train_id]
                    if orig_train.get("delay", 0) != opt_train.get("delay", 0):
                        diff["train_changes"].append({
                            "train_id": train_id,
                            "original_delay": orig_train.get("delay", 0),
                            "new_delay": opt_train.get("delay", 0),
                            "status": opt_train.get("status", "unknown")
                        })
        
        return diff
