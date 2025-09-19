# models.py
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from pathfinding import NetworkGraph, RouteOptimizer, Route

class Train:
    """Represents a train in the railway network with its current state and schedule."""
    
    def __init__(self, train_data: Dict):
        # Core identifiers
        self.id: str = train_data['Train_ID']
        self.train_type: str = train_data.get('Train_Type', 'Express')  # Express, Goods, Local
        
        # Journey details - handle both old and new formats
        if 'Route' in train_data and train_data['Route']:
            # New enhanced format with Route array
            route = train_data['Route']
            self.section_start: str = route[0]['Station_ID']
            self.section_end: str = route[-1]['Station_ID']
            # Use first departure and last arrival for schedule times
            self.scheduled_departure_time: str = route[0]['Departure_Time']
            self.scheduled_arrival_time: str = route[-1]['Arrival_Time']
        else:
            # Old format
            self.section_start: str = train_data['Section_Start']
            self.section_end: str = train_data['Section_End']
            self.scheduled_departure_time: str = train_data['Scheduled_Departure_Time']
            self.scheduled_arrival_time: str = train_data['Scheduled_Arrival_Time']
        self.day_of_week: str = train_data.get('Day_of_Week', 'Monday')
        self.time_of_day: str = train_data.get('Time_of_Day', 'Morning_Peak')
        
        # Operational factors
        self.weather: str = train_data.get('Weather', 'Clear')
        self.track_condition: str = train_data.get('Track_Condition', 'Normal')
        
        # Current state
        self.status: str = "On-Time"
        self.initial_reported_delay_mins: int = train_data.get('Initial_Reported_Delay_Mins', 0)
        self.actual_delay_mins: int = train_data.get('Actual_Delay_Mins', 0)
        self.current_location: str = self.section_start
        
        # Route information
        self.primary_route: Optional[Route] = None
        self.alternative_routes: List[Route] = []
        self.current_route: Optional[Route] = None
        
        # Derived priority based on train type
        self.priority: int = self._calculate_priority()
        
    def _calculate_priority(self) -> int:
        """Calculate priority based on train type and other factors."""
        priority_map = {
            'Express': 1,      # Highest priority (Rajdhani, Shatabdi)
            'Passenger': 3,    # Medium priority
            'Goods': 5,        # Lowest priority
            'Local': 4         # Low priority
        }
        
        base_priority = priority_map.get(self.train_type, 3)
        
        # Adjust based on time of day (peak hours get higher priority)
        if self.time_of_day in ['Morning_Peak', 'Evening_Peak']:
            base_priority = max(1, base_priority - 1)
            
        return base_priority

    def __repr__(self) -> str:
        return f"<Train {self.id} ({self.train_type}) - Status: {self.status}, Delay: {self.actual_delay_mins}min>"

    def get_name(self) -> str:
        """Generate a display name for the train."""
        return f"{self.train_type} {self.id}"

    def get_eta_at_destination(self) -> Dict:
        """
        Calculate the estimated time of arrival at destination.
        Uses scheduled time plus current delays and operational factors.
        """
        try:
            # Parse scheduled arrival time
            scheduled_time = datetime.strptime(self.scheduled_arrival_time, "%Y-%m-%d %H:%M:%S")
            
            # Calculate total delay considering various factors
            weather_delay = 5 if self.weather in ['Rain', 'Fog'] else 0
            track_delay = 10 if self.track_condition == 'Maintenance' else 0
            
            total_delay = self.actual_delay_mins + weather_delay + track_delay
            
            # Calculate ETA
            eta = scheduled_time + timedelta(minutes=total_delay)
            
            return {
                "destination": self.section_end,
                "scheduled_time": scheduled_time,
                "eta": eta,
                "total_delay_mins": total_delay,
                "delay_factors": {
                    "reported_delay": self.actual_delay_mins,
                    "weather_delay": weather_delay,
                    "track_delay": track_delay
                }
            }
        except Exception as e:
            # Fallback for invalid time formats
            return {
                "destination": self.section_end,
                "scheduled_time": self.scheduled_arrival_time,
                "eta": None,
                "total_delay_mins": self.actual_delay_mins,
                "error": str(e)
            }

    def get_current_status_info(self) -> Dict:
        """Returns detailed status information about the train."""
        return {
            "train_id": self.id,
            "train_name": self.get_name(),
            "train_type": self.train_type,
            "priority": self.priority,
            "status": self.status,
            "section_start": self.section_start,
            "section_end": self.section_end,
            "scheduled_departure": self.scheduled_departure_time,
            "scheduled_arrival": self.scheduled_arrival_time,
            "current_delay_mins": self.actual_delay_mins,
            "initial_reported_delay": self.initial_reported_delay_mins,
            "current_location": self.current_location,
            "day_of_week": self.day_of_week,
            "time_of_day": self.time_of_day,
            "weather": self.weather,
            "track_condition": self.track_condition
        }

    def apply_delay(self, additional_delay_mins: int, reason: str = "Unknown") -> None:
        """Apply additional delay to the train."""
        self.actual_delay_mins += additional_delay_mins
        self.status = f"Delayed ({reason})" if reason != "Unknown" else "Delayed"
        
    def update_weather_condition(self, weather: str) -> None:
        """Update weather condition which may affect travel time."""
        self.weather = weather
        
    def update_track_condition(self, condition: str) -> None:
        """Update track condition which may affect travel time."""
        self.track_condition = condition
    
    def set_routes(self, primary_route: Route, alternative_routes: List[Route] = None) -> None:
        """Set the primary and alternative routes for this train."""
        self.primary_route = primary_route
        self.alternative_routes = alternative_routes or []
        self.current_route = primary_route
    
    def switch_to_alternative_route(self, route_index: int = 0) -> bool:
        """Switch to an alternative route."""
        if route_index < len(self.alternative_routes):
            self.current_route = self.alternative_routes[route_index]
            additional_delay = max(0, self.current_route.total_time_minutes - (self.primary_route.total_time_minutes if self.primary_route else 0))
            self.actual_delay_mins += additional_delay
            self.status = f"Rerouted via {self.current_route.route_type} route"
            
            print(f"🔀 {self.get_name()} switched to alternative route {route_index + 1}")
            print(f"   New route: {self.current_route.route_type} via {len(self.current_route.stations)} stations")
            print(f"   Additional delay: {additional_delay} minutes")
            
            return True
        return False

    def apply_halt(self, halt_duration_mins: int, reason: str = "Optimization") -> bool:
        """Apply a halt to the train for a specified duration."""
        self.actual_delay_mins += halt_duration_mins
        self.status = f"Halted ({reason}) - {halt_duration_mins} min"
        
        print(f"⏸️ {self.get_name()} halted for {halt_duration_mins} minutes")
        print(f"   Reason: {reason}")
        print(f"   Total delay now: {self.actual_delay_mins} minutes")
        
        return True

    def apply_cancellation(self, reason: str = "Optimization") -> bool:
        """Cancel the train service."""
        self.status = f"Cancelled ({reason})"
        
        print(f"❌ {self.get_name()} cancelled")
        print(f"   Reason: {reason}")
        
        return True

    def apply_speed_adjustment(self, adjustment_factor: float, reason: str = "Optimization") -> bool:
        """Apply speed adjustment to the train."""
        # Adjust the scheduled times based on speed factor
        if adjustment_factor > 1.0:
            # Slower - add delay
            additional_delay = int((adjustment_factor - 1.0) * 60)  # Convert factor to minutes
            self.actual_delay_mins += additional_delay
            self.status = f"Speed Reduced ({reason})"
        elif adjustment_factor < 1.0:
            # Faster - potentially reduce delay
            time_saved = int((1.0 - adjustment_factor) * 60)
            self.actual_delay_mins = max(0, self.actual_delay_mins - time_saved)
            self.status = f"Speed Increased ({reason})"
        
        print(f"🚅 {self.get_name()} speed adjusted by {adjustment_factor:.2f}x")
        print(f"   Reason: {reason}")
        print(f"   Current delay: {self.actual_delay_mins} minutes")
        
        return True
    
    def get_current_route_info(self) -> Dict[str, Any]:
        """Get information about the current route."""
        if not self.current_route:
            return {
                "route_status": "no_route",
                "origin": self.section_start,
                "destination": self.section_end
            }
        
        return {
            "route_status": "active",
            "route_type": self.current_route.route_type,
            "stations": self.current_route.stations,
            "total_time_minutes": self.current_route.total_time_minutes,
            "total_distance_km": self.current_route.total_distance_km,
            "segment_count": len(self.current_route.segments),
            "alternative_routes_available": len(self.alternative_routes)
        }


class RailwayNetwork:
    """
    The main class representing the state of the railway network (the Digital Twin).
    This is the 'world' that contains all trains and infrastructure.
    """
    
    def __init__(self, schedule_data: List[Dict]):
        # Initialize network graph and route optimizer
        self.network_graph = NetworkGraph("network_graph.json")
        self.route_optimizer = RouteOptimizer(self.network_graph)
        
        # Initialize all trains from the schedule data
        self.trains: Dict[str, Train] = {
            train_data['Train_ID']: Train(train_data) 
            for train_data in schedule_data
        }
        
        # Initialize routes for all trains
        self._initialize_train_routes()
        
        # Model the physical infrastructure (simplified for demo)
        self.platforms: Dict[str, Dict[int, Optional[str]]] = {
            station_code: {i: None for i in range(1, station_data.get("platforms", 4) + 1)}
            for station_code, station_data in self.network_graph.stations.items()
        }
        
        # Track occupancy (which train is currently on which track)
        self.track_occupancy: Dict[str, Optional[str]] = {
            track_id: None for track_id in self.network_graph.tracks.keys()
        }

    def _initialize_train_routes(self):
        """Initialize primary and alternative routes for all trains."""
        print("🗺️  NETWORK: Initializing routes for all trains...")
        
        for train in self.trains.values():
            # Find primary route
            primary_route = self.route_optimizer.find_best_route(
                train.section_start, 
                train.section_end, 
                train.train_type, 
                "time"
            )
            
            # Find alternative routes
            alternative_routes = self.route_optimizer.find_alternative_routes(
                train.section_start, 
                train.section_end, 
                train.train_type, 
                max_alternatives=2
            )
            
            # Remove primary route from alternatives if it appears there
            alternative_routes = [r for r in alternative_routes if r != primary_route]
            
            if primary_route:
                train.set_routes(primary_route, alternative_routes)
                print(f"   ✅ {train.id}: {len(alternative_routes)} alternative routes found")
            else:
                print(f"   ⚠️  {train.id}: No route found from {train.section_start} to {train.section_end}")

    def get_train(self, train_id: str) -> Optional[Train]:
        """Retrieve a train by its ID."""
        return self.trains.get(train_id)

    def apply_event(self, event_data: Dict) -> bool:
        """
        Apply a disruption event to the network state.
        This handles both train-specific events and network-wide events.
        """
        event_type = event_data.get('event_type', 'delay')
        
        if event_type == 'track_failure':
            return self._handle_track_failure_event(event_data)
        elif event_type == 'track_repair':
            return self._handle_track_repair_event(event_data)
        else:
            return self._handle_train_event(event_data)
    
    def _handle_train_event(self, event_data: Dict) -> bool:
        """Handle train-specific events (delays, etc.)."""
        train_id = event_data.get('train_id')
        train = self.get_train(train_id)
        
        if not train:
            print(f"ERROR: Train {train_id} not found in network.")
            return False
        
        # Apply the delay
        delay_minutes = event_data.get('delay_minutes', 0)
        reason = event_data.get('description', 'Reported disruption')
        
        train.apply_delay(delay_minutes, reason)
        
        # Update environmental conditions if provided
        if 'weather' in event_data:
            train.update_weather_condition(event_data['weather'])
        
        if 'track_condition' in event_data:
            train.update_track_condition(event_data['track_condition'])
        
        # Log the event for debugging
        print(f"EVENT APPLIED: Train {train.id} ({train.get_name()}) is now delayed by {train.actual_delay_mins} minutes.")
        print(f"   Reason: {reason}")
        
        return True

    def apply_action(self, action_data: Dict) -> bool:
        """
        Apply a recommended action from the optimizer to the network.
        This implements the actual action (Halt, Reroute, Cancel, etc.)
        """
        action_type = action_data.get('action_type')
        train_id = action_data.get('train_id')
        
        if not train_id:
            print(f"ERROR: No train_id provided in action data")
            return False
            
        train = self.get_train(train_id)
        if not train:
            print(f"ERROR: Train {train_id} not found in network.")
            return False
        
        print(f"🔧 APPLYING ACTION: {action_type} to {train.get_name()}")
        
        success = False
        
        if action_type == "Halt":
            duration_mins = action_data.get('duration_mins', 10)
            success = train.apply_halt(duration_mins, "AI Optimization")
            
        elif action_type == "Reroute":
            route_index = action_data.get('route_index', 0)
            success = train.switch_to_alternative_route(route_index)
            
        elif action_type == "Cancel":
            success = train.apply_cancellation("AI Optimization")
            
        elif action_type == "SpeedAdjust":
            speed_factor = action_data.get('speed_factor', 1.0)
            success = train.apply_speed_adjustment(speed_factor, "AI Optimization")
            
        else:
            print(f"ERROR: Unknown action type: {action_type}")
            return False
        
        if success:
            print(f"✅ ACTION APPLIED: {action_type} successfully applied to {train.get_name()}")
        else:
            print(f"❌ ACTION FAILED: Could not apply {action_type} to {train.get_name()}")
            
        return success

    def save_current_schedule(self, filename: str = "modified_schedule.json") -> bool:
        """
        Save the current network state as a schedule file.
        This creates a new schedule reflecting all applied actions.
        """
        try:
            import json
            
            # Convert current network state to schedule format
            schedule_data = []
            
            for train in self.trains.values():
                train_entry = {
                    "train_id": train.id,
                    "train_name": train.get_name(),
                    "train_type": train.train_type,
                    "priority": train.priority,
                    "section_start": train.section_start,
                    "section_end": train.section_end,
                    "scheduled_departure": train.scheduled_departure_time,
                    "scheduled_arrival": train.scheduled_arrival_time,
                    "current_delay_mins": train.actual_delay_mins,
                    "status": train.status,
                    "weather": train.weather,
                    "track_condition": train.track_condition,
                    "day_of_week": train.day_of_week,
                    "time_of_day": train.time_of_day,
                    "current_location": train.current_location
                }
                
                # Add route information if available
                if train.current_route:
                    train_entry["current_route"] = {
                        "route_type": train.current_route.route_type,
                        "stations": train.current_route.stations,
                        "total_time_minutes": train.current_route.total_time_minutes,
                        "total_distance_km": train.current_route.total_distance_km
                    }
                
                schedule_data.append(train_entry)
            
            # Save to file
            with open(filename, 'w') as f:
                json.dump(schedule_data, f, indent=2)
            
            print(f"💾 SCHEDULE SAVED: Current network state saved to {filename}")
            print(f"   {len(schedule_data)} trains included in schedule")
            
            return True
            
        except Exception as e:
            print(f"❌ ERROR SAVING SCHEDULE: {str(e)}")
            return False
    
    def _handle_track_failure_event(self, event_data: Dict) -> bool:
        """Handle track failure events that affect the entire network."""
        track_id = event_data.get('track_id')
        reason = event_data.get('description', 'Track failure')
        
        if not track_id:
            print("ERROR: Track failure event must specify track_id")
            return False
        
        # Disable the track in the network graph
        success = self.network_graph.disable_track(track_id, reason)
        
        if success:
            # Find all trains that might be affected and recalculate their routes
            affected_trains = self._find_trains_using_track(track_id)
            
            for train in affected_trains:
                # Try to find alternative routes
                alternative_routes = self.route_optimizer.find_alternative_routes(
                    train.section_start, 
                    train.section_end, 
                    train.train_type, 
                    max_alternatives=3
                )
                
                if alternative_routes:
                    train.alternative_routes = alternative_routes
                    print(f"   🔄 {train.id}: {len(alternative_routes)} alternative routes found after track failure")
                else:
                    print(f"   ⚠️  {train.id}: No alternative routes available!")
            
            print(f"🚫 TRACK FAILURE: {track_id} - {len(affected_trains)} trains affected")
            return True
        
        return False
    
    def _handle_track_repair_event(self, event_data: Dict) -> bool:
        """Handle track repair events that restore network capacity."""
        track_id = event_data.get('track_id')
        
        if not track_id:
            print("ERROR: Track repair event must specify track_id")
            return False
        
        success = self.network_graph.enable_track(track_id)
        
        if success:
            # Recalculate routes for all trains to take advantage of restored capacity
            self._initialize_train_routes()
            print(f"✅ TRACK REPAIRED: {track_id} - Routes recalculated for all trains")
            return True
        
        return False
    
    def _find_trains_using_track(self, track_id: str) -> List[Train]:
        """Find all trains whose current route uses the specified track."""
        affected_trains = []
        
        for train in self.trains.values():
            if train.current_route:
                for segment in train.current_route.segments:
                    if segment.track_id == track_id:
                        affected_trains.append(train)
                        break
        
        return affected_trains

    def get_state_snapshot(self) -> Dict:
        """
        Returns a complete, serializable snapshot of the current network state.
        This is useful for APIs and debugging.
        """
        # Get train information with routing details
        trains_info = {}
        for train_id, train in self.trains.items():
            train_info = train.get_current_status_info()
            train_info["route_info"] = train.get_current_route_info()
            trains_info[train_id] = train_info
        
        # Get network status
        operational_tracks = sum(1 for track_data in self.network_graph.tracks.values() 
                               if track_data.get("status") == "operational")
        failed_tracks = sum(1 for track_data in self.network_graph.tracks.values() 
                          if track_data.get("status") == "disabled")
        
        return {
            "trains": trains_info,
            "platforms": self.platforms,
            "track_occupancy": self.track_occupancy,
            "network_status": {
                "total_stations": len(self.network_graph.stations),
                "total_tracks": len(self.network_graph.tracks),
                "operational_tracks": operational_tracks,
                "failed_tracks": failed_tracks,
                "network_health": "healthy" if failed_tracks == 0 else "degraded"
            },
            "timestamp": datetime.now().isoformat()
        }

    def get_all_train_etas(self) -> List[Dict]:
        """
        Get ETAs for all trains at their destinations.
        This is used by the optimizer for conflict detection.
        """
        etas = []
        for train in self.trains.values():
            eta_info = train.get_eta_at_destination()
            if eta_info.get("eta"):  # Only include trains with valid ETAs
                etas.append({
                    "train_id": train.id,
                    "train_name": train.get_name(),
                    "train_type": train.train_type,
                    "priority": train.priority,
                    "destination": eta_info["destination"],
                    "eta": eta_info["eta"],
                    "scheduled_time": eta_info["scheduled_time"],
                    "total_delay_mins": eta_info["total_delay_mins"],
                    "weather": train.weather,
                    "track_condition": train.track_condition
                })
        return etas

    def reset_to_initial_state(self, schedule_data: List[Dict]) -> None:
        """Reset the entire network to its initial state (useful for testing)."""
        self.__init__(schedule_data)
        print("Network reset to initial state.")
