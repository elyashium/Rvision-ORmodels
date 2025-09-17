"""
Railway Network Optimizer using NetworkX
Implements Dijkstra/A* for rerouting and optimization strategies
"""

import networkx as nx
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import copy
import random

class RailwayOptimizer:
    """
    Main optimization engine for railway network
    """
    
    def __init__(self, original_graph: Dict[str, Any]):
        """Initialize optimizer with original graph data"""
        self.original_graph = copy.deepcopy(original_graph)
        self.network = self._build_networkx_graph(original_graph)
        self.trains = self._extract_trains(original_graph)
        self.stations = self._extract_stations(original_graph)
        
        # Priority weights from existing system
        self.priority_weights = {
            1: 100,  # Express trains (highest)
            2: 80,   # High priority passenger
            3: 50,   # Regular passenger
            4: 20,   # Local/suburban
            5: 5     # Goods trains (lowest)
        }
    
    def _build_networkx_graph(self, graph_data: Dict[str, Any]) -> nx.DiGraph:
        """Convert JSON graph to NetworkX directed graph"""
        G = nx.DiGraph()
        
        # Handle both new format and existing format
        if "nodes" in graph_data:
            # New format with nodes array
            for node in graph_data.get("nodes", []):
                G.add_node(
                    node["id"],
                    label=node.get("label", node["id"]),
                    type=node.get("type", "station"),
                    x=node.get("x", 0),
                    y=node.get("y", 0)
                )
        elif "stations" in graph_data:
            # Existing format with stations dict - create nodes list for output
            x_pos = 100
            y_pos = 200
            self.nodes_list = []  # Store for later conversion
            for station_id, station_data in graph_data.get("stations", {}).items():
                G.add_node(
                    station_id,
                    label=station_data.get("name", station_id),
                    type=station_data.get("type", "station"),
                    platforms=station_data.get("platforms", 1),
                    x=x_pos,
                    y=y_pos
                )
                # Store node data for conversion
                self.nodes_list.append({
                    "id": station_id,
                    "label": station_data.get("name", station_id),
                    "type": station_data.get("type", "station"),
                    "x": x_pos,
                    "y": y_pos + (50 if station_id in ["SBB", "VVB", "SHZM"] else 0)
                })
                x_pos += 150
        
        # Handle edges/tracks
        self.edges_list = []  # Store for later conversion
        if "edges" in graph_data:
            # New format with edges array
            for edge in graph_data.get("edges", []):
                if edge.get("status", "operational") == "operational":
                    G.add_edge(
                        edge["from"],
                        edge["to"],
                        weight=edge.get("travel_time", 30),
                        distance=edge.get("distance", 20),
                        id=edge.get("id", f"{edge['from']}_{edge['to']}"),
                        status=edge.get("status", "operational"),
                        capacity=edge.get("capacity", 4)
                    )
                self.edges_list.append(edge)
        elif "tracks" in graph_data:
            # Existing format with tracks dict - create edges list for output
            for track_id, track_data in graph_data.get("tracks", {}).items():
                if track_data.get("status", "operational") == "operational":
                    G.add_edge(
                        track_data["from"],
                        track_data["to"],
                        weight=track_data.get("travel_time_minutes", 30),
                        distance=track_data.get("distance_km", 20),
                        id=track_id,
                        status=track_data.get("status", "operational"),
                        capacity=track_data.get("capacity_trains_per_hour", 4)
                    )
                # Store edge data for conversion
                self.edges_list.append({
                    "id": track_id,
                    "from": track_data["from"],
                    "to": track_data["to"],
                    "travel_time": track_data.get("travel_time_minutes", 30),
                    "distance": track_data.get("distance_km", 20),
                    "status": track_data.get("status", "operational")
                })
        
        return G
    
    def _extract_trains(self, graph_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract train information from graph data"""
        trains = []
        
        if "trains" in graph_data:
            trains = graph_data["trains"]
        elif "schedule" in graph_data:
            # Convert from existing schedule format
            for train_data in graph_data["schedule"]:
                trains.append({
                    "id": train_data.get("Train_ID", train_data.get("train_id")),
                    "name": train_data.get("Train_Type", "Express"),
                    "current_node": train_data.get("Section_Start", "NDLS"),
                    "destination": train_data.get("Section_End", "GZB"),
                    "priority": train_data.get("priority", 3),
                    "delay": train_data.get("Actual_Delay_Mins", 0)
                })
        
        # Generate sample trains if none exist
        if not trains:
            trains = [
                {"id": "T100", "name": "Express", "current_node": "NDLS", 
                 "destination": "GZB", "priority": 1, "delay": 0},
                {"id": "T200", "name": "Passenger", "current_node": "GZB",
                 "destination": "NDLS", "priority": 3, "delay": 0}
            ]
        
        return trains
    
    def _extract_stations(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract station information"""
        stations = {}
        
        if "stations" in graph_data:
            stations = graph_data["stations"]
        elif "nodes" in graph_data:
            for node in graph_data["nodes"]:
                stations[node["id"]] = {
                    "name": node.get("label", node["id"]),
                    "type": node.get("type", "station")
                }
        
        return stations
    
    def find_shortest_path(self, source: str, target: str, 
                          avoid_edges: List[Tuple[str, str]] = None) -> List[str]:
        """Find shortest path using Dijkstra's algorithm"""
        try:
            # Create a copy of the graph
            G = self.network.copy()
            
            # Remove edges to avoid (for failure scenarios)
            if avoid_edges:
                for edge in avoid_edges:
                    if G.has_edge(edge[0], edge[1]):
                        G.remove_edge(edge[0], edge[1])
            
            # Find shortest path
            path = nx.shortest_path(G, source, target, weight='weight')
            return path
        except nx.NetworkXNoPath:
            return []
    
    def calculate_route_time(self, path: List[str]) -> float:
        """Calculate total travel time for a path"""
        total_time = 0
        for i in range(len(path) - 1):
            if self.network.has_edge(path[i], path[i + 1]):
                total_time += self.network[path[i]][path[i + 1]].get('weight', 0)
        return total_time
    
    def optimize_for_delay(self, disruption: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize network for delay scenario"""
        # Create result with nodes/edges format
        result = {
            "meta": {
                "scenario": "delay",
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "source_graph": "network_graph.json",
                "disruption": disruption,
                "notes": "Optimized for train delays with minimal rerouting"
            },
            "nodes": getattr(self, 'nodes_list', []),
            "edges": copy.deepcopy(getattr(self, 'edges_list', [])),
            "trains": copy.deepcopy(self.trains)
        }
        
        # Get disruption details
        details = disruption.get("details", {})
        delayed_train_id = details.get("train_id", "T100")
        delay_minutes = details.get("delay_minutes", 20)
        
        # Find the delayed train and update its status
        trains_data = result.get("trains", self.trains)
        routes_data = []
        
        for train in trains_data:
            train_id = train.get("id")
            route_info = {
                "train_id": train_id,
                "train_name": train.get("name", "Unknown"),
                "priority": train.get("priority", 3)
            }
            
            if train_id == delayed_train_id:
                # This train is delayed
                train["delay"] = delay_minutes
                train["status"] = "delayed"
                
                # Calculate new arrival time
                current_time = datetime.now()
                expected_arrival = current_time + timedelta(minutes=90 + delay_minutes)
                route_info["expected_arrival"] = expected_arrival.strftime("%H:%M")
                route_info["delay"] = delay_minutes
                route_info["status"] = "delayed"
                
                # Keep original path but mark as delayed
                path = self.find_shortest_path(
                    train.get("current_node", "NDLS"),
                    train.get("destination", "GZB")
                )
                route_info["path"] = path
                
            else:
                # Check if this train needs rerouting due to conflicts
                priority = train.get("priority", 3)
                
                if priority > 3:  # Low priority trains might be rerouted
                    # Find alternative path to avoid congestion
                    path = self.find_shortest_path(
                        train.get("current_node", "NDLS"),
                        train.get("destination", "GZB")
                    )
                    
                    # Add small delay for low priority trains
                    train["delay"] = 5
                    route_info["delay"] = 5
                    route_info["status"] = "rerouted"
                else:
                    # High priority trains maintain schedule
                    path = self.find_shortest_path(
                        train.get("current_node", "NDLS"),
                        train.get("destination", "GZB")
                    )
                    route_info["delay"] = 0
                    route_info["status"] = "on_time"
                
                route_info["path"] = path
                current_time = datetime.now()
                expected_arrival = current_time + timedelta(
                    minutes=self.calculate_route_time(path) + route_info.get("delay", 0)
                )
                route_info["expected_arrival"] = expected_arrival.strftime("%H:%M")
            
            routes_data.append(route_info)
        
        result["routes"] = routes_data
        result["trains"] = trains_data
        
        # Add statistics
        result["meta"]["statistics"] = {
            "total_trains": len(trains_data),
            "delayed_trains": sum(1 for t in trains_data if t.get("delay", 0) > 0),
            "rerouted_trains": sum(1 for r in routes_data if r.get("status") == "rerouted"),
            "average_delay": np.mean([t.get("delay", 0) for t in trains_data])
        }
        
        return result
    
    def optimize_for_failure(self, disruption: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize network for track/station failure scenario"""
        # Create result with nodes/edges format
        result = {
            "meta": {
                "scenario": "failure",
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "source_graph": "network_graph.json",
                "disruption": disruption,
                "notes": "Optimized for infrastructure failures with alternate routing"
            },
            "nodes": getattr(self, 'nodes_list', []),
            "edges": copy.deepcopy(getattr(self, 'edges_list', [])),
            "trains": copy.deepcopy(self.trains)
        }
        
        # Get failure details
        details = disruption.get("details", {})
        failed_track = details.get("track_id", "NDLS_ANVR")
        
        # Mark track as failed
        edges_data = result.get("edges", [])
        tracks_data = result.get("tracks", {})
        
        failed_edges = []
        
        # Handle both formats
        if edges_data:
            for edge in edges_data:
                if edge.get("id") == failed_track or \
                   f"{edge.get('from')}_{edge.get('to')}" == failed_track:
                    edge["status"] = "failed"
                    failed_edges.append((edge["from"], edge["to"]))
        elif tracks_data:
            for track_id, track in tracks_data.items():
                if track_id == failed_track:
                    track["status"] = "failed"
                    failed_edges.append((track["from"], track["to"]))
        
        # Reroute all affected trains
        trains_data = result.get("trains", self.trains)
        routes_data = []
        
        for train in trains_data:
            train_id = train.get("id")
            source = train.get("current_node", "NDLS")
            destination = train.get("destination", "GZB")
            
            # Find alternative path avoiding failed edges
            path = self.find_shortest_path(source, destination, avoid_edges=failed_edges)
            
            route_info = {
                "train_id": train_id,
                "train_name": train.get("name", "Unknown"),
                "priority": train.get("priority", 3),
                "path": path
            }
            
            if not path:
                # No path available
                route_info["status"] = "cancelled"
                route_info["expected_arrival"] = "N/A"
                train["status"] = "cancelled"
            else:
                # Calculate new travel time
                travel_time = self.calculate_route_time(path)
                
                # Add penalty for rerouting
                if len(path) > 3:  # Indirect route
                    travel_time += 15  # Add 15 minutes for indirect route
                    train["delay"] = 15
                    route_info["delay"] = 15
                    route_info["status"] = "rerouted"
                else:
                    train["delay"] = 5
                    route_info["delay"] = 5
                    route_info["status"] = "minor_delay"
                
                current_time = datetime.now()
                expected_arrival = current_time + timedelta(minutes=travel_time)
                route_info["expected_arrival"] = expected_arrival.strftime("%H:%M")
            
            routes_data.append(route_info)
        
        result["routes"] = routes_data
        result["trains"] = trains_data
        
        # Add statistics
        result["meta"]["statistics"] = {
            "failed_tracks": len(failed_edges),
            "affected_trains": len([r for r in routes_data if r.get("status") != "on_time"]),
            "cancelled_trains": len([r for r in routes_data if r.get("status") == "cancelled"]),
            "average_reroute_delay": np.mean([r.get("delay", 0) for r in routes_data])
        }
        
        return result
    
    def optimize_for_priority(self, disruption: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize network for priority trains scenario"""
        # Create result with nodes/edges format
        result = {
            "meta": {
                "scenario": "priority",
                "generated_at": datetime.utcnow().isoformat() + "Z",
                "source_graph": "network_graph.json",
                "disruption": disruption,
                "notes": "Optimized for priority trains with schedule adjustments"
            },
            "nodes": getattr(self, 'nodes_list', []),
            "edges": copy.deepcopy(getattr(self, 'edges_list', [])),
            "trains": copy.deepcopy(self.trains)
        }
        
        trains_data = result.get("trains", self.trains)
        routes_data = []
        
        # Sort trains by priority (highest first)
        sorted_trains = sorted(trains_data, key=lambda x: x.get("priority", 3))
        
        # Track which paths are occupied by high-priority trains
        occupied_paths = {}
        
        for train in sorted_trains:
            train_id = train.get("id")
            priority = train.get("priority", 3)
            source = train.get("current_node", "NDLS")
            destination = train.get("destination", "GZB")
            
            # Find optimal path
            path = self.find_shortest_path(source, destination)
            
            route_info = {
                "train_id": train_id,
                "train_name": train.get("name", "Unknown"),
                "priority": priority,
                "path": path
            }
            
            if priority <= 2:  # High priority (Express)
                # Give direct route with no delays
                train["delay"] = 0
                train["status"] = "priority"
                route_info["delay"] = 0
                route_info["status"] = "priority"
                
                # Mark this path as occupied
                for i in range(len(path) - 1):
                    segment = (path[i], path[i + 1])
                    if segment not in occupied_paths:
                        occupied_paths[segment] = []
                    occupied_paths[segment].append(train_id)
                
            elif priority >= 4:  # Low priority (Goods/Local)
                # Check if path conflicts with high-priority trains
                conflicts = False
                for i in range(len(path) - 1):
                    segment = (path[i], path[i + 1])
                    if segment in occupied_paths:
                        conflicts = True
                        break
                
                if conflicts:
                    # Find alternative path
                    avoid_edges = list(occupied_paths.keys())
                    alt_path = self.find_shortest_path(source, destination, avoid_edges)
                    
                    if alt_path:
                        path = alt_path
                        train["delay"] = 20
                        train["status"] = "rerouted_low_priority"
                        route_info["delay"] = 20
                        route_info["status"] = "rerouted_low_priority"
                    else:
                        train["delay"] = 30
                        train["status"] = "holding"
                        route_info["delay"] = 30
                        route_info["status"] = "holding"
                else:
                    train["delay"] = 10
                    train["status"] = "low_priority"
                    route_info["delay"] = 10
                    route_info["status"] = "low_priority"
                
                route_info["path"] = path
                
            else:  # Medium priority
                train["delay"] = 5
                train["status"] = "normal"
                route_info["delay"] = 5
                route_info["status"] = "normal"
            
            # Calculate arrival time
            travel_time = self.calculate_route_time(path)
            current_time = datetime.now()
            expected_arrival = current_time + timedelta(
                minutes=travel_time + route_info.get("delay", 0)
            )
            route_info["expected_arrival"] = expected_arrival.strftime("%H:%M")
            
            routes_data.append(route_info)
        
        result["routes"] = routes_data
        result["trains"] = trains_data
        
        # Add statistics
        high_priority_count = len([t for t in trains_data if t.get("priority", 3) <= 2])
        low_priority_count = len([t for t in trains_data if t.get("priority", 3) >= 4])
        
        result["meta"]["statistics"] = {
            "high_priority_trains": high_priority_count,
            "low_priority_trains": low_priority_count,
            "rerouted_for_priority": len([r for r in routes_data 
                                         if "rerouted" in r.get("status", "")]),
            "average_low_priority_delay": np.mean([r.get("delay", 0) 
                                                  for r in routes_data 
                                                  if r.get("priority", 3) >= 4])
        }
        
        return result
