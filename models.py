# models.py
from datetime import datetime, timedelta
from typing import Dict, List, Optional

class Train:
    """Represents a train in the railway network with its current state and schedule."""
    
    def __init__(self, train_data: Dict):
        # Core identifiers
        self.id: str = train_data['Train_ID']
        self.train_type: str = train_data.get('Train_Type', 'Express')  # Express, Goods, Local
        
        # Journey details
        self.section_start: str = train_data['Section_Start']
        self.section_end: str = train_data['Section_End']
        
        # Schedule information
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


class RailwayNetwork:
    """
    The main class representing the state of the railway network (the Digital Twin).
    This is the 'world' that contains all trains and infrastructure.
    """
    
    def __init__(self, schedule_data: List[Dict]):
        # Initialize all trains from the schedule data
        self.trains: Dict[str, Train] = {
            train_data['Train_ID']: Train(train_data) 
            for train_data in schedule_data
        }
        
        # Model the physical infrastructure
        # In a real system, this would be much more complex
        self.platforms: Dict[str, Dict[int, Optional[str]]] = {
            "NDLS": {1: None, 2: None, 3: None},  # New Delhi Station
            "ANVR": {1: None, 2: None, 3: None},  # Anand Vihar
            "GZB": {1: None, 2: None, 3: None},   # Ghaziabad
        }
        
        # Track segments between stations
        self.tracks: Dict[str, Optional[str]] = {
            "NDLS-ANVR": None,  # Value will be train_id if occupied
            "ANVR-GZB": None,
            "GZB-ANVR": None,   # Reverse direction
            "ANVR-NDLS": None,
        }

    def get_train(self, train_id: str) -> Optional[Train]:
        """Retrieve a train by its ID."""
        return self.trains.get(train_id)

    def apply_event(self, event_data: Dict) -> bool:
        """
        Apply a disruption event to the network state.
        This is how external events (reported by railway staff) affect the digital twin.
        """
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

    def get_state_snapshot(self) -> Dict:
        """
        Returns a complete, serializable snapshot of the current network state.
        This is useful for APIs and debugging.
        """
        return {
            "trains": {
                train_id: train.get_current_status_info() 
                for train_id, train in self.trains.items()
            },
            "platforms": self.platforms,
            "tracks": self.tracks,
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
