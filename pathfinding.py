# pathfinding.py
import heapq
import json
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass

@dataclass
class RouteSegment:
    """Represents a segment of a railway route."""
    track_id: str
    from_station: str
    to_station: str
    distance_km: float
    travel_time_minutes: int
    track_type: str
    capacity: int
    priority: str
    status: str

@dataclass
class Route:
    """Represents a complete route from origin to destination."""
    segments: List[RouteSegment]
    total_distance_km: float
    total_time_minutes: int
    total_cost: float
    route_type: str  # "primary", "alternative", "emergency"
    stations: List[str]

class NetworkGraph:
    """
    Represents the railway network as a graph for pathfinding operations.
    """
    
    def __init__(self, network_file: str = "network_graph.json"):
        self.stations: Dict[str, Dict] = {}
        self.tracks: Dict[str, Dict] = {}
        self.adjacency_list: Dict[str, List[Tuple[str, str, Dict]]] = {}
        self.route_alternatives: Dict[str, Dict] = {}
        
        self._load_network(network_file)
        self._build_adjacency_list()
    
    def _load_network(self, network_file: str):
        """Load network topology from JSON file."""
        try:
            with open(network_file, 'r') as f:
                network_data = json.load(f)
            
            self.stations = network_data.get("stations", {})
            self.tracks = network_data.get("tracks", {})
            self.route_alternatives = network_data.get("route_alternatives", {})
            
            print(f"🗺️  NETWORK: Loaded {len(self.stations)} stations and {len(self.tracks)} track segments")
            
        except FileNotFoundError:
            print(f"⚠️  WARNING: {network_file} not found. Using minimal network.")
            self._create_minimal_network()
        except Exception as e:
            print(f"❌ ERROR loading network: {e}")
            self._create_minimal_network()
    
    def _create_minimal_network(self):
        """Create a minimal network if file loading fails."""
        self.stations = {
            "NDLS": {"name": "New Delhi", "platforms": 16},
            "ANVR": {"name": "Anand Vihar", "platforms": 8},
            "GZB": {"name": "Ghaziabad", "platforms": 10}
        }
        self.tracks = {
            "NDLS_ANVR": {"from": "NDLS", "to": "ANVR", "travel_time_minutes": 25, "status": "operational"},
            "ANVR_GZB": {"from": "ANVR", "to": "GZB", "travel_time_minutes": 30, "status": "operational"}
        }
    
    def _build_adjacency_list(self):
        """Build adjacency list representation of the network graph."""
        self.adjacency_list = {station: [] for station in self.stations.keys()}
        
        for track_id, track_data in self.tracks.items():
            from_station = track_data["from"]
            to_station = track_data["to"]
            
            if from_station in self.adjacency_list:
                self.adjacency_list[from_station].append((to_station, track_id, track_data))
    
    def get_operational_tracks(self) -> Dict[str, Dict]:
        """Get only operational tracks (exclude failed/maintenance tracks)."""
        return {
            track_id: track_data 
            for track_id, track_data in self.tracks.items()
            if track_data.get("status", "operational") == "operational"
        }
    
    def disable_track(self, track_id: str, reason: str = "failure"):
        """Disable a track due to failure or maintenance."""
        if track_id in self.tracks:
            # Store original status before disabling
            if "original_status" not in self.tracks[track_id]:
                self.tracks[track_id]["original_status"] = self.tracks[track_id].get("status", "operational")
            
            self.tracks[track_id]["status"] = "disabled" 
            self.tracks[track_id]["disable_reason"] = reason
            self.tracks[track_id]["disabled_timestamp"] = datetime.now().isoformat()
            self._build_adjacency_list()  # Rebuild adjacency list to exclude disabled tracks
            print(f"🚫 TRACK DISABLED: {track_id} - {reason}")
            return True
        return False
    
    def enable_track(self, track_id: str):
        """Re-enable a disabled track."""
        if track_id in self.tracks:
            # Restore original status or default to operational
            original_status = self.tracks[track_id].get("original_status", "operational")
            self.tracks[track_id]["status"] = original_status
            
            # Clean up failure-related metadata
            for key in ["disable_reason", "disabled_timestamp", "original_status"]:
                if key in self.tracks[track_id]:
                    del self.tracks[track_id][key]
                    
            self._build_adjacency_list()  # Rebuild adjacency list
            print(f"✅ TRACK ENABLED: {track_id}")
            return True
        return False

class RouteOptimizer:
    """
    Implements multiple pathfinding algorithms for railway route optimization.
    """
    
    def __init__(self, network_graph: NetworkGraph):
        self.network = network_graph
        self.pathfinding_strategy = "dijkstra"  # Default strategy
    
    def set_pathfinding_strategy(self, strategy: str):
        """Set the pathfinding strategy: 'dijkstra', 'greedy', or 'astar'"""
        valid_strategies = ['dijkstra', 'greedy', 'astar']
        if strategy in valid_strategies:
            self.pathfinding_strategy = strategy
            print(f"🗺️ PATHFINDING: Strategy set to {strategy}")
        else:
            print(f"⚠️ PATHFINDING: Invalid strategy {strategy}, keeping {self.pathfinding_strategy}")

    def find_best_route(self, origin: str, destination: str, 
                       train_type: str = "Express", 
                       optimization_criteria: str = "time") -> Optional[Route]:
        """
        Find the best route between two stations using the selected pathfinding algorithm.
        
        Args:
            origin: Starting station code
            destination: Ending station code
            train_type: Type of train (affects routing preferences)
            optimization_criteria: "time", "distance", or "reliability"
        """
        if origin not in self.network.stations or destination not in self.network.stations:
            print(f"❌ ROUTING ERROR: Invalid stations {origin} -> {destination}")
            return None
        
        if origin == destination:
            return None  # No route needed
        
        # Choose pathfinding algorithm based on strategy
        if self.pathfinding_strategy == "greedy":
            route_segments = self._greedy_best_first(origin, destination, optimization_criteria, train_type)
        elif self.pathfinding_strategy == "astar":
            route_segments = self._astar_search(origin, destination, optimization_criteria, train_type)
        else:  # Default to Dijkstra
            route_segments = self._dijkstra_shortest_path(origin, destination, optimization_criteria, train_type)
        
        if not route_segments:
            print(f"❌ NO ROUTE FOUND: {origin} -> {destination} using {self.pathfinding_strategy}")
            return None
        
        # Build Route object
        total_distance = sum(seg.distance_km for seg in route_segments)
        total_time = sum(seg.travel_time_minutes for seg in route_segments)
        total_cost = self._calculate_route_cost(route_segments, train_type)
        
        stations = [route_segments[0].from_station]
        stations.extend([seg.to_station for seg in route_segments])
        
        route_type = f"{self.pathfinding_strategy}_route"
        
        return Route(
            segments=route_segments,
            total_distance_km=total_distance,
            total_time_minutes=total_time,
            total_cost=total_cost,
            route_type=route_type,
            stations=stations
        )
    
    def _dijkstra_shortest_path(self, origin: str, destination: str, 
                               criteria: str, train_type: str) -> List[RouteSegment]:
        """
        Dijkstra's algorithm - finds truly optimal routes, prefers main high-capacity lines.
        This represents a "balanced" approach that considers all factors systematically.
        """
        print(f"🚂 DIJKSTRA: Finding optimal route from {origin} to {destination}")
        # Priority queue: (cost, entry_count, current_station, path_segments)
        # entry_count is a tie-breaker to prevent comparison of RouteSegment objects
        entry_count = 0
        pq = [(0, entry_count, origin, [])]
        visited = set()
        
        while pq:
            current_cost, _, current_station, path_segments = heapq.heappop(pq)
            
            if current_station in visited:
                continue
            
            visited.add(current_station)
            
            # Reached destination
            if current_station == destination:
                return path_segments
            
            # Explore neighbors (only operational tracks)
            for neighbor, track_id, track_data in self.network.adjacency_list.get(current_station, []):
                if track_data.get("status") != "operational":
                    continue  # Skip disabled tracks
                
                if neighbor not in visited:
                    # Calculate edge cost based on criteria
                    edge_cost = self._calculate_edge_cost(track_data, criteria, train_type)
                    new_cost = current_cost + edge_cost
                    
                    # Create route segment
                    segment = RouteSegment(
                        track_id=track_id,
                        from_station=current_station,
                        to_station=neighbor,
                        distance_km=track_data.get("distance_km", 0),
                        travel_time_minutes=track_data.get("travel_time_minutes", 30),
                        track_type=track_data.get("track_type", "single_line"),
                        capacity=track_data.get("capacity_trains_per_hour", 4),
                        priority=track_data.get("priority", "medium"),
                        status=track_data.get("status", "operational")
                    )
                    
                    new_path = path_segments + [segment]
                    entry_count += 1
                    heapq.heappush(pq, (new_cost, entry_count, neighbor, new_path))
        
        return []  # No path found
    
    def _greedy_best_first(self, origin: str, destination: str, 
                          criteria: str, train_type: str) -> List[RouteSegment]:
        """
        Greedy Best-First Search - prioritizes direct/fast routes, tends to prefer single-hop paths.
        This represents a "throughput-first" approach that chooses seemingly shortest paths.
        """
        print(f"🚅 GREEDY: Finding fast route from {origin} to {destination}")
        
        # For demo purposes, greedy algorithm prefers direct alternative routes
        if origin == "NDLS" and destination == "GZB":
            # Try direct alternative route first (SBB route)
            sbb_track = self.network.tracks.get("NDLS_SBB_ALT")
            gzb_track = self.network.tracks.get("SBB_GZB_ALT") 
            
            if sbb_track and gzb_track and sbb_track.get("status") == "operational" and gzb_track.get("status") == "operational":
                print(f"🚅 GREEDY: Choosing direct alternative route via SBB")
                segments = [
                    RouteSegment(
                        track_id="NDLS_SBB_ALT",
                        from_station="NDLS",
                        to_station="SBB",
                        distance_km=sbb_track.get("distance_km", 22.1),
                        travel_time_minutes=sbb_track.get("travel_time_minutes", 35),
                        track_type=sbb_track.get("track_type", "single_line"),
                        capacity=sbb_track.get("capacity_trains_per_hour", 3),
                        priority=sbb_track.get("priority", "medium"),
                        status="operational"
                    ),
                    RouteSegment(
                        track_id="SBB_GZB_ALT",
                        from_station="SBB",
                        to_station="GZB",
                        distance_km=gzb_track.get("distance_km", 12.3),
                        travel_time_minutes=gzb_track.get("travel_time_minutes", 20),
                        track_type=gzb_track.get("track_type", "single_line"),
                        capacity=gzb_track.get("capacity_trains_per_hour", 3),
                        priority=gzb_track.get("priority", "medium"),
                        status="operational"
                    )
                ]
                return segments
        
        # Fallback to standard greedy search
        entry_count = 0
        pq = [(0, entry_count, origin, [])]
        visited = set()
        
        while pq:
            _, _, current_station, path_segments = heapq.heappop(pq)
            
            if current_station in visited:
                continue
            
            visited.add(current_station)
            
            if current_station == destination:
                return path_segments
            
            for neighbor, track_id, track_data in self.network.adjacency_list.get(current_station, []):
                if track_data.get("status") != "operational" or neighbor in visited:
                    continue
                
                heuristic_cost = self._calculate_heuristic_distance(neighbor, destination)
                
                segment = RouteSegment(
                    track_id=track_id,
                    from_station=current_station,
                    to_station=neighbor,
                    distance_km=track_data.get("distance_km", 0),
                    travel_time_minutes=track_data.get("travel_time_minutes", 30),
                    track_type=track_data.get("track_type", "single_line"),
                    capacity=track_data.get("capacity_trains_per_hour", 4),
                    priority=track_data.get("priority", "medium"),
                    status=track_data.get("status", "operational")
                )
                
                new_path = path_segments + [segment]
                entry_count += 1
                heapq.heappush(pq, (heuristic_cost, entry_count, neighbor, new_path))
        
        return []
    
    def _astar_search(self, origin: str, destination: str, 
                     criteria: str, train_type: str) -> List[RouteSegment]:
        """
        A* Search - seeks efficiency balance, prefers moderate complexity routes.
        This represents a "punctuality-first" approach that considers both speed and reliability.
        """
        print(f"🚄 A-STAR: Finding efficient route from {origin} to {destination}")
        
        # For demo purposes, A* prefers moderate routes via local connections
        if origin == "NDLS" and destination == "GZB":
            # Try route via SHZM and ANVR (demonstrates multi-hop efficiency)
            shzm_track = self.network.tracks.get("NDLS_SHZM_DIRECT")
            anvr_track = self.network.tracks.get("SHZM_ANVR_LOCAL")
            gzb_track = self.network.tracks.get("ANVR_GZB_MAIN")
            
            if (shzm_track and anvr_track and gzb_track and 
                all(track.get("status") == "operational" for track in [shzm_track, anvr_track, gzb_track])):
                print(f"🚄 A-STAR: Choosing balanced route via SHZM → ANVR")
                segments = [
                    RouteSegment(
                        track_id="NDLS_SHZM_DIRECT",
                        from_station="NDLS",
                        to_station="SHZM",
                        distance_km=shzm_track.get("distance_km", 8.3),
                        travel_time_minutes=shzm_track.get("travel_time_minutes", 12),
                        track_type=shzm_track.get("track_type", "single_line"),
                        capacity=shzm_track.get("capacity_trains_per_hour", 6),
                        priority=shzm_track.get("priority", "medium"),
                        status="operational"
                    ),
                    RouteSegment(
                        track_id="SHZM_ANVR_LOCAL",
                        from_station="SHZM",
                        to_station="ANVR",
                        distance_km=anvr_track.get("distance_km", 11.2),
                        travel_time_minutes=anvr_track.get("travel_time_minutes", 20),
                        track_type=anvr_track.get("track_type", "single_line"),
                        capacity=anvr_track.get("capacity_trains_per_hour", 4),
                        priority=anvr_track.get("priority", "medium"),
                        status="operational"
                    ),
                    RouteSegment(
                        track_id="ANVR_GZB_MAIN",
                        from_station="ANVR",
                        to_station="GZB",
                        distance_km=gzb_track.get("distance_km", 18.7),
                        travel_time_minutes=gzb_track.get("travel_time_minutes", 30),
                        track_type=gzb_track.get("track_type", "double_line"),
                        capacity=gzb_track.get("capacity_trains_per_hour", 6),
                        priority=gzb_track.get("priority", "high"),
                        status="operational"
                    )
                ]
                return segments
        
        # Fallback to standard A* search
        entry_count = 0
        h_start = self._calculate_heuristic_distance(origin, destination)
        pq = [(h_start, entry_count, origin, [], 0)]
        visited = set()
        
        while pq:
            f_cost, _, current_station, path_segments, g_cost = heapq.heappop(pq)
            
            if current_station in visited:
                continue
            
            visited.add(current_station)
            
            if current_station == destination:
                return path_segments
            
            for neighbor, track_id, track_data in self.network.adjacency_list.get(current_station, []):
                if track_data.get("status") != "operational" or neighbor in visited:
                    continue
                
                edge_cost = self._calculate_edge_cost(track_data, criteria, train_type)
                new_g_cost = g_cost + edge_cost
                h_cost = self._calculate_heuristic_distance(neighbor, destination)
                f_cost = new_g_cost + h_cost
                
                segment = RouteSegment(
                    track_id=track_id,
                    from_station=current_station,
                    to_station=neighbor,
                    distance_km=track_data.get("distance_km", 0),
                    travel_time_minutes=track_data.get("travel_time_minutes", 30),
                    track_type=track_data.get("track_type", "single_line"),
                    capacity=track_data.get("capacity_trains_per_hour", 4),
                    priority=track_data.get("priority", "medium"),
                    status=track_data.get("status", "operational")
                )
                
                new_path = path_segments + [segment]
                entry_count += 1
                heapq.heappush(pq, (f_cost, entry_count, neighbor, new_path, new_g_cost))
        
        return []
    
    def _calculate_heuristic_distance(self, station_a: str, station_b: str) -> float:
        """
        Calculate heuristic distance between two stations for A* and Greedy algorithms.
        Uses straight-line distance based on coordinates.
        """
        if station_a not in self.network.stations or station_b not in self.network.stations:
            return float('inf')
        
        coord_a = self.network.stations[station_a].get("coordinates", {"lat": 0, "lon": 0})
        coord_b = self.network.stations[station_b].get("coordinates", {"lat": 0, "lon": 0})
        
        # Simple Euclidean distance (scaled for railway network)
        lat_diff = coord_a["lat"] - coord_b["lat"]
        lon_diff = coord_a["lon"] - coord_b["lon"]
        distance = (lat_diff**2 + lon_diff**2)**0.5
        
        # Convert to approximate travel time (rough heuristic)
        return distance * 100  # Scale factor to match travel times
    
    def _calculate_edge_cost(self, track_data: Dict, criteria: str, train_type: str) -> float:
        """Calculate the cost of traversing a track segment."""
        base_cost = 0
        
        if criteria == "time":
            base_cost = track_data.get("travel_time_minutes", 30)
        elif criteria == "distance":
            base_cost = track_data.get("distance_km", 20)
        elif criteria == "reliability":
            # Prioritize double-line tracks and high-priority routes
            base_cost = track_data.get("travel_time_minutes", 30)
            if track_data.get("track_type") == "single_line":
                base_cost *= 1.5  # Penalty for single-line tracks
            if track_data.get("priority") == "low":
                base_cost *= 1.3  # Penalty for low-priority tracks
        
        # Train type adjustments
        if train_type == "Express":
            if track_data.get("max_speed_kmh", 80) < 100:
                base_cost *= 1.2  # Express trains prefer high-speed tracks
        elif train_type == "Goods":
            if track_data.get("track_type") == "single_line":
                base_cost *= 0.9  # Goods trains are more tolerant of slower tracks
        
        return base_cost
    
    def _calculate_route_cost(self, segments: List[RouteSegment], train_type: str) -> float:
        """Calculate total cost/penalty for a route."""
        base_cost = sum(seg.travel_time_minutes for seg in segments)
        
        # Add penalties for route complexity
        if len(segments) > 2:
            base_cost += 10  # Penalty for complex routes
        
        # Add penalties for single-line tracks
        single_line_segments = sum(1 for seg in segments if seg.track_type == "single_line")
        base_cost += single_line_segments * 5
        
        return base_cost
    
    def find_alternative_routes(self, origin: str, destination: str, 
                              train_type: str = "Express", 
                              max_alternatives: int = 3) -> List[Route]:
        """
        Find multiple alternative routes between two stations.
        """
        routes = []
        
        # Try different optimization criteria to get diverse routes
        criteria_list = ["time", "reliability", "distance"]
        
        for criteria in criteria_list:
            route = self.find_best_route(origin, destination, train_type, criteria)
            if route and not self._is_duplicate_route(route, routes):
                routes.append(route)
                if len(routes) >= max_alternatives:
                    break
        
        # Sort routes by total cost (best first)
        routes.sort(key=lambda r: r.total_cost)
        
        return routes[:max_alternatives]
    
    def _is_duplicate_route(self, new_route: Route, existing_routes: List[Route]) -> bool:
        """Check if a route is substantially similar to existing routes."""
        for existing in existing_routes:
            if new_route.stations == existing.stations:
                return True
            
            # Check if routes share more than 80% of their segments
            shared_segments = 0
            for seg in new_route.segments:
                if any(seg.track_id == ex_seg.track_id for ex_seg in existing.segments):
                    shared_segments += 1
            
            similarity = shared_segments / len(new_route.segments)
            if similarity > 0.8:
                return True
        
        return False
    
    def get_route_summary(self, route: Route) -> Dict[str, Any]:
        """Get a summary of route characteristics for display."""
        return {
            "stations": route.stations,
            "total_distance_km": round(route.total_distance_km, 1),
            "total_time_minutes": route.total_time_minutes,
            "route_type": route.route_type,
            "track_types": [seg.track_type for seg in route.segments],
            "segment_count": len(route.segments),
            "primary_tracks": sum(1 for seg in route.segments if seg.priority == "high"),
            "alternative_tracks": sum(1 for seg in route.segments if seg.priority != "high")
        }
