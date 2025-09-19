# optimizer.py
import copy
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from models import RailwayNetwork, Train

# Core AI "personality" constants - these define how the system makes decisions
PRIORITY_WEIGHTS = {
    1: 100,  # Highest priority trains (e.g., Rajdhani, Shatabdi)
    2: 80,   # High priority
    3: 50,   # Medium priority
    4: 20,   # Low priority
    5: 5     # Lowest priority (e.g., goods trains)
}

ACTION_PENALTIES = {
    "Halt": 1,         # Base cost for halting a train
    "Reroute": 20,     # Cost for changing platform/route
    "Cancel": 100,     # Very high cost for cancellation
}

class Optimizer:
    """
    The Brain of the R-Vision system.
    This class implements the Operations Research logic to find optimal solutions
    to railway traffic conflicts.
    """
    
    def __init__(self, priority_weights: Dict[int, int] = None, action_penalties: Dict[str, int] = None):
        self.priority_weights = priority_weights or PRIORITY_WEIGHTS
        self.action_penalties = action_penalties or ACTION_PENALTIES
        
    def run(self, network_model: RailwayNetwork) -> Dict[str, Any]:
        """
        Main entry point for the optimization process.
        This orchestrates the three key steps of conflict resolution.
        
        Returns:
            Dict containing status, conflict info, and recommendations
        """
        print("🧠 OPTIMIZER: Starting analysis...")
        
        # Create a deep copy to run simulations without affecting the real state
        sim_network = copy.deepcopy(network_model)
        
        # Step 1: Project forward in time and detect conflicts
        conflicts = self._detect_conflicts(sim_network, projection_horizon_mins=60)
        
        if not conflicts:
            print("✅ OPTIMIZER: No conflicts detected in the next 60 minutes.")
            return {
                "status": "NoConflict", 
                "recommendation": None,
                "message": "No conflicts detected. All trains are running smoothly."
            }

        print(f"⚠️  OPTIMIZER: {len(conflicts)} conflict(s) detected.")
        
        # For the prototype, we solve the first detected conflict
        primary_conflict = conflicts[0]
        
        # Step 2: Generate possible solutions for the conflict
        solutions = self._generate_solutions(primary_conflict, sim_network)
        
        if not solutions:
            return {
                "status": "NoSolution",
                "conflict_info": primary_conflict,
                "message": "Conflict detected but no viable solutions found."
            }
        
        # Step 3: Evaluate solutions and select the best one
        best_solution = self._evaluate_and_select_best(solutions, sim_network)
        
        print(f"💡 OPTIMIZER: Best solution found with score {best_solution.get('score', 'N/A')}")
        
        return {
            "status": "ConflictFound",
            "conflict_info": primary_conflict,
            "recommendation": best_solution,
            "total_conflicts": len(conflicts)
        }

    def _detect_conflicts(self, network: RailwayNetwork, projection_horizon_mins: int) -> List[Dict[str, Any]]:
        """
        Enhanced conflict detection using realistic railway data.
        Detects section capacity conflicts and considers operational factors.
        """
        print(f"🔍 OPTIMIZER: Scanning for conflicts in next {projection_horizon_mins} minutes...")
        
        # Get all train ETAs
        train_etas = network.get_all_train_etas()
        
        if len(train_etas) < 2:
            return []  # Need at least 2 trains to have a conflict
        
        conflicts = []
        
        # Group trains by section (route conflicts)
        section_bookings: Dict[str, List[Dict]] = {}
        
        for eta_info in train_etas:
            # Create section key from start-end or end-start for bidirectional conflicts
            section_key = f"{eta_info.get('train_id', '').split('_')[0]}_section"  # Simplified for demo
            destination = eta_info['destination']
            
            if destination not in section_bookings:
                section_bookings[destination] = []
            section_bookings[destination].append(eta_info)
        
        # Check each destination for potential conflicts
        for destination, arriving_trains in section_bookings.items():
            if len(arriving_trains) > 1:
                # Sort trains by ETA
                arriving_trains.sort(key=lambda x: x['eta'])
                
                # Dynamic conflict window based on train types and conditions
                for i in range(len(arriving_trains) - 1):
                    train1 = arriving_trains[i]
                    train2 = arriving_trains[i + 1]
                    
                    # Calculate dynamic buffer time based on train characteristics
                    buffer_time = self._calculate_required_buffer(train1, train2)
                    
                    time_diff = (train2['eta'] - train1['eta']).total_seconds() / 60
                    
                    if time_diff < buffer_time:
                        conflict_id = f"C_{destination}_{datetime.now().strftime('%H%M%S')}"
                        
                        # Enhanced conflict severity calculation
                        severity = self._calculate_conflict_severity(train1, train2, time_diff, buffer_time)
                        
                        conflict = {
                            "conflict_id": conflict_id,
                            "type": "SectionCapacityConflict",
                            "location": destination,
                            "affected_trains": [train1['train_id'], train2['train_id']],
                            "train_details": [train1, train2],
                            "time_gap_minutes": round(time_diff, 1),
                            "required_buffer_minutes": buffer_time,
                            "severity": severity,
                            "environmental_factors": {
                                "weather_impact": train1.get('weather') != 'Clear' or train2.get('weather') != 'Clear',
                                "track_maintenance": train1.get('track_condition') == 'Maintenance' or train2.get('track_condition') == 'Maintenance'
                            },
                            "details": f"Trains {train1['train_name']} and {train2['train_name']} will arrive at {destination} within {round(time_diff, 1)} minutes (need {buffer_time} min buffer)."
                        }
                        
                        conflicts.append(conflict)
                        print(f"🚨 CONFLICT DETECTED: {conflict['details']}")
                        print(f"   Severity: {severity} | Environmental factors: Weather={train1.get('weather')}, Track={train1.get('track_condition')}")
        
        return conflicts

    def _calculate_required_buffer(self, train1: Dict, train2: Dict) -> int:
        """Calculate required buffer time between trains based on their characteristics."""
        base_buffer = 10  # Base 10 minutes
        
        # Express trains need less buffer (faster operations)
        if train1.get('train_type') == 'Express' and train2.get('train_type') == 'Express':
            base_buffer = 8
        
        # Goods trains need more buffer (slower operations)
        if train1.get('train_type') == 'Goods' or train2.get('train_type') == 'Goods':
            base_buffer = 20
        
        # Weather conditions increase buffer
        if train1.get('weather') in ['Rain', 'Fog'] or train2.get('weather') in ['Rain', 'Fog']:
            base_buffer += 5
        
        # Track maintenance increases buffer
        if train1.get('track_condition') == 'Maintenance' or train2.get('track_condition') == 'Maintenance':
            base_buffer += 10
        
        return base_buffer

    def _calculate_conflict_severity(self, train1: Dict, train2: Dict, time_diff: float, required_buffer: int) -> str:
        """Calculate conflict severity based on multiple factors."""
        severity_score = 0
        
        # Time gap severity
        if time_diff < required_buffer * 0.3:
            severity_score += 3  # Critical
        elif time_diff < required_buffer * 0.6:
            severity_score += 2  # High
        else:
            severity_score += 1  # Medium
        
        # Priority impact
        if train1.get('priority', 3) <= 2 or train2.get('priority', 3) <= 2:
            severity_score += 1  # High priority trains involved
        
        # Environmental factors
        if train1.get('weather') != 'Clear' or train2.get('weather') != 'Clear':
            severity_score += 1
        
        if train1.get('track_condition') == 'Maintenance' or train2.get('track_condition') == 'Maintenance':
            severity_score += 1
        
        # Peak time impact
        if train1.get('time_of_day') in ['Morning_Peak', 'Evening_Peak'] or train2.get('time_of_day') in ['Morning_Peak', 'Evening_Peak']:
            severity_score += 1
        
        if severity_score >= 5:
            return "Critical"
        elif severity_score >= 3:
            return "High"
        elif severity_score >= 2:
            return "Medium"
        else:
            return "Low"

    def _generate_solutions(self, conflict: Dict[str, Any], network: RailwayNetwork) -> List[Dict[str, Any]]:
        """
        Enhanced solution generation considering train types, priorities, and operational factors.
        """
        print("🛠️  OPTIMIZER: Generating possible solutions...")
        
        solutions = []
        affected_trains = conflict['affected_trains']
        required_buffer = conflict.get('required_buffer_minutes', 15)
        
        # For each affected train, generate context-aware solutions
        for train_id in affected_trains:
            train = network.get_train(train_id)
            if not train:
                continue
            
            # Calculate intelligent halt durations based on train characteristics
            halt_durations = self._calculate_optimal_halt_durations(train, required_buffer)
            
            # Solution: Halt this train for different durations
            for halt_duration in halt_durations:
                solution = {
                    "solution_id": f"HALT_{train_id}_{halt_duration}",
                    "action_type": "Halt",
                    "train_id": train_id,
                    "duration_mins": halt_duration,
                    "description": f"Halt {train.get_name()} for {halt_duration} minutes",
                    "environmental_adjustment": self._get_environmental_adjustment(train)
                }
                solutions.append(solution)
            
            # Advanced solution: Speed adjustment (for express trains)
            if train.train_type == 'Express' and train.priority <= 2:
                solution = {
                    "solution_id": f"SPEED_ADJUST_{train_id}",
                    "action_type": "SpeedAdjust",
                    "train_id": train_id,
                    "duration_mins": required_buffer // 2,  # Reduce speed to create buffer
                    "description": f"Reduce speed of {train.get_name()} to create {required_buffer // 2} min buffer"
                }
                solutions.append(solution)
            
            # Intelligent rerouting (for goods trains and lower priority)
            if (train.train_type in ['Goods', 'Local'] or train.priority >= 4) and len(train.alternative_routes) > 0:
                for i, alt_route in enumerate(train.alternative_routes):
                    # Calculate additional time for alternative route
                    additional_time = max(0, alt_route.total_time_minutes - train.current_route.total_time_minutes) if train.current_route else alt_route.total_time_minutes
                    
                    solution = {
                        "solution_id": f"REROUTE_{train_id}_{i}",
                        "action_type": "Reroute",
                        "train_id": train_id,
                        "duration_mins": additional_time,
                        "route_index": i,
                        "description": f"Reroute {train.get_name()} via {alt_route.route_type} route (+{additional_time} min)",
                        "alternative_route": {
                            "stations": alt_route.stations,
                            "total_time": alt_route.total_time_minutes,
                            "total_distance": alt_route.total_distance_km,
                            "route_type": alt_route.route_type
                        }
                    }
                    solutions.append(solution)
        
        # Emergency solution: Temporary cancellation (only for very low priority trains)
        for train_id in affected_trains:
            train = network.get_train(train_id)
            if train and train.priority == 5 and train.train_type == 'Goods':
                solution = {
                    "solution_id": f"CANCEL_{train_id}",
                    "action_type": "Cancel",
                    "train_id": train_id,
                    "duration_mins": 0,  # Cancellation removes the conflict entirely
                    "description": f"Temporarily cancel {train.get_name()} (reschedule later)"
                }
                solutions.append(solution)
        
        print(f"💭 OPTIMIZER: Generated {len(solutions)} intelligent solutions.")
        return solutions
    
    def _calculate_optimal_halt_durations(self, train: Train, required_buffer: int) -> List[int]:
        """Calculate optimal halt durations based on train characteristics."""
        base_durations = []
        
        # Express trains: shorter halts preferred
        if train.train_type == 'Express':
            base_durations = [5, 10, required_buffer]
        
        # Passenger trains: moderate halts
        elif train.train_type == 'Passenger':
            base_durations = [10, 15, required_buffer + 5]
        
        # Goods trains: longer halts acceptable
        elif train.train_type == 'Goods':
            base_durations = [15, 20, 30, required_buffer + 10]
        
        # Local trains: flexible halts
        else:
            base_durations = [10, 15, 20]
        
        # Adjust for environmental conditions
        if train.weather in ['Rain', 'Fog']:
            base_durations = [d + 5 for d in base_durations]
        
        if train.track_condition == 'Maintenance':
            base_durations = [d + 10 for d in base_durations]
        
        return base_durations
    
    def _get_environmental_adjustment(self, train: Train) -> Dict[str, Any]:
        """Get environmental adjustments that affect the solution."""
        adjustment = {
            "weather_factor": 0,
            "track_factor": 0,
            "time_factor": 0
        }
        
        if train.weather in ['Rain', 'Fog']:
            adjustment["weather_factor"] = 5
        
        if train.track_condition == 'Maintenance':
            adjustment["track_factor"] = 10
        
        if train.time_of_day in ['Morning_Peak', 'Evening_Peak']:
            adjustment["time_factor"] = -2  # Reduce delays during peak hours
        
        return adjustment

    def _evaluate_and_select_best(self, solutions: List[Dict[str, Any]], network: RailwayNetwork) -> Dict[str, Any]:
        """
        Evaluate each solution using the priority weights and action penalties.
        Returns the solution with the lowest (best) score.
        """
        print("📊 OPTIMIZER: Evaluating solutions...")
        
        scored_solutions = []
        
        for solution in solutions:
            train = network.get_train(solution['train_id'])
            if not train:
                continue
            
            # Calculate the score based on our optimization function
            score = self._calculate_solution_score(solution, train)
            
            scored_solution = {
                "solution": solution,
                "score": score,
                "train_priority": train.priority,
                "train_name": train.name
            }
            
            scored_solutions.append(scored_solution)
            print(f"   📈 {solution['description']}: Score = {score}")
        
        if not scored_solutions:
            return {}

        # Select the solution with the lowest score (best option)
        best = min(scored_solutions, key=lambda x: x['score'])
        
        # Format the recommendation for the user
        best_action = best['solution']
        recommendation = {
            "recommendation_id": f"R_{datetime.now().strftime('%H%M%S')}",
            "action": best_action,
            "score": best['score'],
            "confidence": self._calculate_confidence(best['score'], [s['score'] for s in scored_solutions]),
            "recommendation_text": self._format_recommendation_text(best_action, best['train_name']),
            "reasoning": self._generate_reasoning(best_action, best['train_priority'], best['score'])
        }
        
        return recommendation

    def _calculate_solution_score(self, solution: Dict[str, Any], train: Train) -> float:
        """
        Enhanced scoring function considering multiple operational factors.
        Lower scores are better.
        
        Formula: (Base Action Cost + Duration Penalty + Environmental Factors) × Priority Multiplier × Context Adjustments
        """
        action_type = solution['action_type']
        duration = solution.get('duration_mins', 0)
        
        # Get base costs with enhanced action penalties
        enhanced_penalties = {
            "Halt": 1,
            "SpeedAdjust": 0.5,    # Less disruptive than full halt
            "Reroute": 5,          # Lower base cost for rerouting (actual cost depends on route)
            "Cancel": 50           # High cost for cancellation
        }
        
        action_cost = enhanced_penalties.get(action_type, self.action_penalties.get(action_type, 1))
        
        # Enhanced priority calculation considering train type
        priority_multiplier = self._calculate_enhanced_priority_multiplier(train)
        
        # Environmental adjustments
        environmental_adjustment = solution.get('environmental_adjustment', {})
        weather_penalty = environmental_adjustment.get('weather_factor', 0)
        track_penalty = environmental_adjustment.get('track_factor', 0)
        time_adjustment = environmental_adjustment.get('time_factor', 0)
        
        # Duration penalty with train type consideration
        duration_penalty = self._calculate_duration_penalty(duration, train)
        
        # Special handling for rerouting solutions
        reroute_penalty = 0
        if action_type == "Reroute":
            reroute_penalty = self._calculate_reroute_penalty(solution, train)
        
        # Calculate base score
        base_score = action_cost + duration_penalty + weather_penalty + track_penalty + reroute_penalty
        
        # Apply time adjustment (can be negative for peak hours)
        base_score += time_adjustment
        
        # Apply priority multiplier
        total_score = base_score * priority_multiplier
        
        # Passenger impact multiplier (peak hours are more critical)
        if train.time_of_day in ['Morning_Peak', 'Evening_Peak']:
            if train.train_type in ['Express', 'Passenger']:
                total_score *= 1.2  # 20% penalty for disrupting passenger services in peak hours
        
        return round(total_score, 2)
    
    def _calculate_enhanced_priority_multiplier(self, train: Train) -> float:
        """Calculate enhanced priority multiplier considering train type and context."""
        base_multiplier = self.priority_weights.get(train.priority, 50)
        
        # Train type adjustments
        type_adjustments = {
            'Express': 1.2,     # Express trains get higher weight
            'Passenger': 1.0,   # Standard weight
            'Local': 0.8,       # Local trains slightly less critical
            'Goods': 0.6        # Goods trains less critical
        }
        
        type_multiplier = type_adjustments.get(train.train_type, 1.0)
        
        # Time of day adjustments
        if train.time_of_day in ['Morning_Peak', 'Evening_Peak']:
            if train.train_type in ['Express', 'Passenger']:
                type_multiplier *= 1.3  # Peak hour passenger services are critical
        
        return base_multiplier * type_multiplier
    
    def _calculate_duration_penalty(self, duration: int, train: Train) -> float:
        """Calculate duration penalty based on train type and operational context."""
        # Base penalty per minute
        base_penalty_per_min = 0.5
        
        # Train type adjustments
        if train.train_type == 'Express':
            base_penalty_per_min = 1.0  # Express trains penalized more for delays
        elif train.train_type == 'Goods':
            base_penalty_per_min = 0.2  # Goods trains less sensitive to delays
        elif train.train_type == 'Local':
            base_penalty_per_min = 0.3  # Local trains moderately sensitive
        
        # Peak hour adjustment
        if train.time_of_day in ['Morning_Peak', 'Evening_Peak']:
            base_penalty_per_min *= 1.5  # Peak hours are more critical
        
        return duration * base_penalty_per_min
    
    def _calculate_reroute_penalty(self, solution: Dict[str, Any], train: Train) -> float:
        """Calculate penalty for rerouting based on route characteristics."""
        if 'alternative_route' not in solution:
            return 10  # Default penalty if no route info
        
        alt_route = solution['alternative_route']
        penalty = 0
        
        # Distance penalty - longer routes get higher penalty
        if train.current_route:
            distance_increase = alt_route.get('total_distance', 0) - train.current_route.total_distance_km
            penalty += max(0, distance_increase) * 0.5  # 0.5 penalty per extra km
        
        # Route complexity penalty
        station_count = len(alt_route.get('stations', []))
        if station_count > 3:  # More than direct route
            penalty += (station_count - 3) * 2  # 2 penalty per extra stop
        
        # Route type penalty
        route_type = alt_route.get('route_type', 'alternative')
        if route_type == 'emergency':
            penalty += 15  # High penalty for emergency routes
        elif route_type == 'alternative':
            penalty += 5   # Moderate penalty for alternative routes
        
        # Train type adjustments for rerouting
        if train.train_type == 'Express':
            penalty *= 1.5  # Express trains are more sensitive to rerouting
        elif train.train_type == 'Goods':
            penalty *= 0.7  # Goods trains are more tolerant of rerouting
        
        return penalty

    def _calculate_confidence(self, best_score: float, all_scores: List[float]) -> str:
        """Calculate confidence level based on score distribution."""
        if len(all_scores) <= 1:
            return "Medium"
        
        sorted_scores = sorted(all_scores)
        score_gap = sorted_scores[1] - sorted_scores[0] if len(sorted_scores) > 1 else 0
        
        if score_gap > 50:
            return "High"
        elif score_gap > 20:
            return "Medium"
        else:
            return "Low"

    def _format_recommendation_text(self, action: Dict[str, Any], train_name: str) -> str:
        """Generate user-friendly recommendation text."""
        action_type = action['action_type']
        
        if action_type == "Halt":
            duration = action['duration_mins']
            return f"Halt {train_name} for {duration} minutes to resolve platform conflict."
        elif action_type == "Reroute":
            return f"Reroute {train_name} to an alternative platform."
        else:
            return f"Apply {action_type} action to {train_name}."

    def _generate_reasoning(self, action: Dict[str, Any], train_priority: int, score: float) -> str:
        """Generate explanation for why this solution was chosen."""
        priority_desc = {1: "highest", 2: "high", 3: "medium", 4: "low", 5: "lowest"}
        priority_text = priority_desc.get(train_priority, "unknown")
        
        reasoning = f"This solution was selected because it has the lowest impact score ({score}). "
        reasoning += f"The affected train has {priority_text} priority (level {train_priority}), "
        reasoning += f"making this action optimal for minimizing overall network disruption."
        
        return reasoning


class MultiStrategyOptimizer:
    """
    Enhanced optimizer that can run multiple strategies to provide different solutions
    for the same disruption event.
    """
    
    def __init__(self, priority_weights: Dict[int, int] = None, action_penalties: Dict[str, int] = None):
        self.priority_weights = priority_weights or PRIORITY_WEIGHTS
        self.action_penalties = action_penalties or ACTION_PENALTIES
        self.strategies = {
            "balanced": {
                "name": "Balanced Approach",
                "description": "A balanced approach to minimize overall network disruption while considering all train types equally.",
                "weights": self._get_balanced_weights()
            },
            "punctuality": {
                "name": "Punctuality First",
                "description": "Prioritizes on-time performance for passenger trains, especially high-priority services like Express trains.",
                "weights": self._get_punctuality_weights()
            },
            "throughput": {
                "name": "Maximum Throughput",
                "description": "Focuses on network efficiency, keeping the maximum number of trains moving and prioritizing goods flow.",
                "weights": self._get_throughput_weights()
            }
        }
    
    def _get_balanced_weights(self) -> Dict[str, float]:
        """Standard balanced weights - no adjustments."""
        return {
            "express_priority_multiplier": 1.0,
            "passenger_priority_multiplier": 1.0,
            "goods_priority_multiplier": 1.0,
            "halt_penalty_multiplier": 1.0,
            "reroute_penalty_multiplier": 1.0,
            "cancel_penalty_multiplier": 1.0,
            "peak_hour_multiplier": 1.0
        }
    
    def _get_punctuality_weights(self) -> Dict[str, float]:
        """Punctuality-first weights - heavily favor passenger trains."""
        return {
            "express_priority_multiplier": 0.6,    # Much lower penalty for disrupting express
            "passenger_priority_multiplier": 0.7,  # Lower penalty for passenger trains
            "goods_priority_multiplier": 1.5,      # Higher penalty for disrupting goods
            "halt_penalty_multiplier": 1.3,        # Higher cost for halting any train
            "reroute_penalty_multiplier": 0.8,     # Prefer rerouting over halting
            "cancel_penalty_multiplier": 0.9,      # Slightly prefer cancellation over long delays
            "peak_hour_multiplier": 0.5            # Very low penalty during peak (keep passengers moving)
        }
    
    def _get_throughput_weights(self) -> Dict[str, float]:
        """Throughput-first weights - prioritize overall network flow."""
        return {
            "express_priority_multiplier": 1.3,    # Higher penalty for disrupting express
            "passenger_priority_multiplier": 1.2,  # Higher penalty for passenger trains
            "goods_priority_multiplier": 0.5,      # Much lower penalty for goods (keep them moving)
            "halt_penalty_multiplier": 0.8,        # Lower cost for strategic halts
            "reroute_penalty_multiplier": 1.1,     # Slight penalty for complex rerouting
            "cancel_penalty_multiplier": 1.0,      # Standard cancellation cost
            "peak_hour_multiplier": 1.2            # Higher penalty during peak (maximize capacity)
        }
    
    def run_all_strategies(self, network_model: RailwayNetwork) -> Dict[str, Any]:
        """
        Run all three optimization strategies and return comparative results.
        
        Returns:
            Dict containing results for all strategies with benefits/drawbacks analysis
        """
        print("🧠 MULTI-STRATEGY OPTIMIZER: Running all optimization strategies...")
        
        # Create a deep copy for each simulation
        results = {}
        
        for strategy_key, strategy_config in self.strategies.items():
            print(f"\n🎯 Running '{strategy_config['name']}' strategy...")
            
            # Create fresh copy of the network for this strategy
            sim_network = copy.deepcopy(network_model)
            
            # Run optimization with strategy-specific weights
            strategy_result = self._run_strategy(sim_network, strategy_key, strategy_config)
            
            # Add benefits and drawbacks analysis
            strategy_result["benefits_drawbacks"] = self._analyze_benefits_drawbacks(
                strategy_result, strategy_key, strategy_config
            )
            
            results[strategy_key] = strategy_result
        
        print("✅ MULTI-STRATEGY ANALYSIS COMPLETED")
        return results

    def generate_strategy_schedules(self, network_model: RailwayNetwork) -> Dict[str, Any]:
        """
        Generate actual schedule data for each strategy by applying the recommendations.
        Returns strategy results with generated schedule data for simulation.
        """
        print("📋 GENERATING STRATEGY SCHEDULES...")
        
        # First run all strategies to get recommendations
        strategy_results = self.run_all_strategies(network_model)
        
        # Now generate schedule data for each strategy
        for strategy_key, strategy_result in strategy_results.items():
            print(f"\n📊 Generating schedule for {strategy_key} strategy...")
            
            # Create a copy of the network for this strategy
            strategy_network = copy.deepcopy(network_model)
            
            # Apply the strategy's recommendation if it exists
            if (strategy_result.get("status") == "ConflictFound" and 
                strategy_result.get("recommendation") and 
                strategy_result["recommendation"].get("action")):
                
                action = strategy_result["recommendation"]["action"]
                print(f"   Applying {action.get('action_type')} to {action.get('train_id')}")
                
                # Apply the action to the strategy network
                strategy_network.apply_action(action)
                
                # Save the strategy-specific schedule
                filename = f"strategy_{strategy_key}_schedule.json"
                strategy_network.save_current_schedule(filename)
                
                # Read the saved schedule file to get the simulation-ready data
                import json
                try:
                    with open(filename, 'r') as f:
                        schedule_data = json.load(f)
                    
                    # Add the schedule data to the strategy result
                    strategy_result["schedule_data"] = schedule_data  # Direct schedule array
                    strategy_result["schedule_file"] = filename
                    strategy_result["applied_action"] = action
                except Exception as e:
                    print(f"   ⚠️ Could not load schedule file {filename}: {e}")
                    # Fallback to network state
                    strategy_state = strategy_network.get_state_snapshot()
                    strategy_result["schedule_data"] = strategy_state
                    strategy_result["schedule_file"] = filename
                    strategy_result["applied_action"] = action
                
                print(f"   ✅ {strategy_key} schedule generated: {filename}")
                
            else:
                # No action needed - use baseline schedule
                filename = "baseline_schedule.json"
                strategy_network.save_current_schedule(filename)
                
                # Read the saved schedule file
                import json
                try:
                    with open(filename, 'r') as f:
                        schedule_data = json.load(f)
                    
                    strategy_result["schedule_data"] = schedule_data  # Direct schedule array
                    strategy_result["schedule_file"] = filename
                    strategy_result["applied_action"] = None
                except Exception as e:
                    print(f"   ⚠️ Could not load baseline schedule file: {e}")
                    # Fallback to network state
                    baseline_state = strategy_network.get_state_snapshot()
                    strategy_result["schedule_data"] = baseline_state
                    strategy_result["schedule_file"] = filename
                    strategy_result["applied_action"] = None
                
                print(f"   ✅ {strategy_key} using baseline schedule")
        
        print("📋 ALL STRATEGY SCHEDULES GENERATED")
        return strategy_results
    
    def _run_strategy(self, network: RailwayNetwork, strategy_key: str, strategy_config: Dict) -> Dict[str, Any]:
        """Run optimization with a specific strategy."""
        
        # Step 1: Detect conflicts
        conflicts = self._detect_conflicts(network, projection_horizon_mins=60)
        
        if not conflicts:
            return {
                "status": "NoConflict",
                "strategy": strategy_key,
                "strategy_name": strategy_config["name"],
                "recommendation": None,
                "message": "No conflicts detected. All trains are running smoothly."
            }
        
        # For the prototype, solve the first detected conflict
        primary_conflict = conflicts[0]
        
        # Step 2: Generate solutions
        solutions = self._generate_solutions(primary_conflict, network)
        
        if not solutions:
            return {
                "status": "NoSolution",
                "strategy": strategy_key,
                "strategy_name": strategy_config["name"],
                "conflict_info": primary_conflict,
                "message": "Conflict detected but no viable solutions found."
            }
        
        # Step 3: Evaluate with strategy-specific weights
        best_solution = self._evaluate_with_strategy(solutions, network, strategy_config)
        
        return {
            "status": "ConflictFound",
            "strategy": strategy_key,
            "strategy_name": strategy_config["name"],
            "strategy_description": strategy_config["description"],
            "conflict_info": primary_conflict,
            "recommendation": best_solution,
            "total_conflicts": len(conflicts)
        }
    
    def _detect_conflicts(self, network: RailwayNetwork, projection_horizon_mins: int) -> List[Dict[str, Any]]:
        """
        Enhanced conflict detection (reusing the logic from the main Optimizer).
        """
        print(f"🔍 STRATEGY OPTIMIZER: Scanning for conflicts in next {projection_horizon_mins} minutes...")
        
        # Get all train ETAs
        train_etas = network.get_all_train_etas()
        
        if len(train_etas) < 2:
            return []
        
        conflicts = []
        section_bookings: Dict[str, List[Dict]] = {}
        
        for eta_info in train_etas:
            section_key = f"{eta_info.get('train_id', '').split('_')[0]}_section"
            destination = eta_info['destination']
            
            if destination not in section_bookings:
                section_bookings[destination] = []
            section_bookings[destination].append(eta_info)
        
        # Check each destination for conflicts
        for destination, arriving_trains in section_bookings.items():
            if len(arriving_trains) > 1:
                arriving_trains.sort(key=lambda x: x['eta'])
                
                for i in range(len(arriving_trains) - 1):
                    train1 = arriving_trains[i]
                    train2 = arriving_trains[i + 1]
                    
                    buffer_time = self._calculate_required_buffer(train1, train2)
                    time_diff = (train2['eta'] - train1['eta']).total_seconds() / 60
                    
                    if time_diff < buffer_time:
                        conflict_id = f"C_{destination}_{datetime.now().strftime('%H%M%S')}"
                        severity = self._calculate_conflict_severity(train1, train2, time_diff, buffer_time)
                        
                        conflict = {
                            "conflict_id": conflict_id,
                            "type": "SectionCapacityConflict",
                            "location": destination,
                            "affected_trains": [train1['train_id'], train2['train_id']],
                            "train_details": [train1, train2],
                            "time_gap_minutes": round(time_diff, 1),
                            "required_buffer_minutes": buffer_time,
                            "severity": severity,
                            "details": f"Trains {train1['train_name']} and {train2['train_name']} will arrive at {destination} within {round(time_diff, 1)} minutes (need {buffer_time} min buffer)."
                        }
                        
                        conflicts.append(conflict)
        
        return conflicts
    
    def _calculate_required_buffer(self, train1: Dict, train2: Dict) -> int:
        """Calculate required buffer time between trains."""
        base_buffer = 10
        
        if train1.get('train_type') == 'Express' and train2.get('train_type') == 'Express':
            base_buffer = 8
        
        if train1.get('train_type') == 'Goods' or train2.get('train_type') == 'Goods':
            base_buffer = 20
        
        if train1.get('weather') in ['Rain', 'Fog'] or train2.get('weather') in ['Rain', 'Fog']:
            base_buffer += 5
        
        if train1.get('track_condition') == 'Maintenance' or train2.get('track_condition') == 'Maintenance':
            base_buffer += 10
        
        return base_buffer
    
    def _calculate_conflict_severity(self, train1: Dict, train2: Dict, time_diff: float, required_buffer: int) -> str:
        """Calculate conflict severity."""
        severity_score = 0
        
        if time_diff < required_buffer * 0.3:
            severity_score += 3
        elif time_diff < required_buffer * 0.6:
            severity_score += 2
        else:
            severity_score += 1
        
        if train1.get('priority', 3) <= 2 or train2.get('priority', 3) <= 2:
            severity_score += 1
        
        if train1.get('weather') != 'Clear' or train2.get('weather') != 'Clear':
            severity_score += 1
        
        if severity_score >= 5:
            return "Critical"
        elif severity_score >= 3:
            return "High"
        elif severity_score >= 2:
            return "Medium"
        else:
            return "Low"
    
    def _generate_solutions(self, conflict: Dict[str, Any], network: RailwayNetwork) -> List[Dict[str, Any]]:
        """Generate possible solutions for the conflict."""
        solutions = []
        affected_trains = conflict['affected_trains']
        required_buffer = conflict.get('required_buffer_minutes', 15)
        
        for train_id in affected_trains:
            train = network.get_train(train_id)
            if not train:
                continue
            
            # Halt solutions
            halt_durations = self._calculate_optimal_halt_durations(train, required_buffer)
            for halt_duration in halt_durations:
                solution = {
                    "solution_id": f"HALT_{train_id}_{halt_duration}",
                    "action_type": "Halt",
                    "train_id": train_id,
                    "duration_mins": halt_duration,
                    "description": f"Halt {train.get_name()} for {halt_duration} minutes"
                }
                solutions.append(solution)
            
            # Speed adjustment for express trains
            if train.train_type == 'Express' and train.priority <= 2:
                solution = {
                    "solution_id": f"SPEED_ADJUST_{train_id}",
                    "action_type": "SpeedAdjust",
                    "train_id": train_id,
                    "duration_mins": required_buffer // 2,
                    "description": f"Reduce speed of {train.get_name()} to create {required_buffer // 2} min buffer"
                }
                solutions.append(solution)
            
            # Rerouting solutions
            if (train.train_type in ['Goods', 'Local'] or train.priority >= 4) and len(train.alternative_routes) > 0:
                for i, alt_route in enumerate(train.alternative_routes):
                    additional_time = max(0, alt_route.total_time_minutes - (train.current_route.total_time_minutes if train.current_route else 0))
                    
                    solution = {
                        "solution_id": f"REROUTE_{train_id}_{i}",
                        "action_type": "Reroute",
                        "train_id": train_id,
                        "duration_mins": additional_time,
                        "route_index": i,
                        "description": f"Reroute {train.get_name()} via {alt_route.route_type} route (+{additional_time} min)",
                        "alternative_route": {
                            "stations": alt_route.stations,
                            "total_time": alt_route.total_time_minutes,
                            "total_distance": alt_route.total_distance_km,
                            "route_type": alt_route.route_type
                        }
                    }
                    solutions.append(solution)
            
            # Emergency cancellation for low priority trains
            if train and train.priority == 5 and train.train_type == 'Goods':
                solution = {
                    "solution_id": f"CANCEL_{train_id}",
                    "action_type": "Cancel",
                    "train_id": train_id,
                    "duration_mins": 0,
                    "description": f"Temporarily cancel {train.get_name()} (reschedule later)"
                }
                solutions.append(solution)
        
        return solutions
    
    def _calculate_optimal_halt_durations(self, train, required_buffer: int) -> List[int]:
        """Calculate optimal halt durations based on train characteristics."""
        if train.train_type == 'Express':
            base_durations = [5, 10, required_buffer]
        elif train.train_type == 'Passenger':
            base_durations = [10, 15, required_buffer + 5]
        elif train.train_type == 'Goods':
            base_durations = [15, 20, 30, required_buffer + 10]
        else:
            base_durations = [10, 15, 20]
        
        # Adjust for environmental conditions
        if train.weather in ['Rain', 'Fog']:
            base_durations = [d + 5 for d in base_durations]
        
        if train.track_condition == 'Maintenance':
            base_durations = [d + 10 for d in base_durations]
        
        return base_durations
    
    def _evaluate_with_strategy(self, solutions: List[Dict[str, Any]], network: RailwayNetwork, strategy_config: Dict) -> Dict[str, Any]:
        """Evaluate solutions using strategy-specific weights."""
        weights = strategy_config["weights"]
        scored_solutions = []
        
        for solution in solutions:
            train = network.get_train(solution['train_id'])
            if not train:
                continue
            
            score = self._calculate_strategy_score(solution, train, weights)
            
            scored_solution = {
                "solution": solution,
                "score": score,
                "train_priority": train.priority,
                "train_name": train.name,
                "train_type": train.train_type
            }
            
            scored_solutions.append(scored_solution)
        
        if not scored_solutions:
            return {}
        
        # Select best solution
        best = min(scored_solutions, key=lambda x: x['score'])
        
        best_action = best['solution']
        recommendation = {
            "recommendation_id": f"R_{datetime.now().strftime('%H%M%S')}",
            "action": best_action,
            "score": best['score'],
            "confidence": self._calculate_confidence(best['score'], [s['score'] for s in scored_solutions]),
            "recommendation_text": self._format_recommendation_text(best_action, best['train_name']),
            "reasoning": self._generate_reasoning(best_action, best['train_priority'], best['score'], strategy_config["name"])
        }
        
        return recommendation
    
    def _calculate_strategy_score(self, solution: Dict[str, Any], train, weights: Dict[str, float]) -> float:
        """Calculate solution score with strategy-specific weights."""
        action_type = solution['action_type']
        duration = solution.get('duration_mins', 0)
        
        # Base action costs
        action_costs = {"Halt": 1, "SpeedAdjust": 0.5, "Reroute": 5, "Cancel": 50}
        action_cost = action_costs.get(action_type, 1)
        
        # Apply action penalty multipliers
        if action_type == "Halt":
            action_cost *= weights["halt_penalty_multiplier"]
        elif action_type == "Reroute":
            action_cost *= weights["reroute_penalty_multiplier"]
        elif action_type == "Cancel":
            action_cost *= weights["cancel_penalty_multiplier"]
        
        # Train type priority adjustments
        priority_multiplier = self.priority_weights.get(train.priority, 50)
        
        if train.train_type == 'Express':
            priority_multiplier *= weights["express_priority_multiplier"]
        elif train.train_type in ['Passenger']:
            priority_multiplier *= weights["passenger_priority_multiplier"]
        elif train.train_type == 'Goods':
            priority_multiplier *= weights["goods_priority_multiplier"]
        
        # Duration penalty
        duration_penalty = duration * 0.5
        if train.train_type == 'Express':
            duration_penalty *= 1.5
        elif train.train_type == 'Goods':
            duration_penalty *= 0.5
        
        # Peak hour adjustments
        peak_adjustment = 1.0
        if train.time_of_day in ['Morning_Peak', 'Evening_Peak']:
            peak_adjustment = weights["peak_hour_multiplier"]
        
        total_score = (action_cost + duration_penalty) * priority_multiplier * peak_adjustment
        
        return round(total_score, 2)
    
    def _analyze_benefits_drawbacks(self, strategy_result: Dict, strategy_key: str, strategy_config: Dict) -> Dict[str, List[str]]:
        """Analyze benefits and drawbacks of the recommended solution."""
        if strategy_result["status"] != "ConflictFound":
            return {"benefits": [], "drawbacks": []}
        
        recommendation = strategy_result.get("recommendation", {})
        action = recommendation.get("action", {})
        action_type = action.get("action_type", "")
        
        benefits = []
        drawbacks = []
        
        # Strategy-specific benefits and drawbacks
        if strategy_key == "punctuality":
            benefits.extend([
                "Prioritizes on-time performance for high-value passenger services",
                "Minimizes cascading delays for time-sensitive trains",
                "Maintains passenger satisfaction and service reliability"
            ])
            if action_type == "Halt" and action.get("train_id", "").endswith("GOODS"):
                benefits.append("Preserves premium train schedules by delaying lower-priority services")
            drawbacks.extend([
                "May significantly impact goods transportation schedules",
                "Could create bottlenecks in freight corridors",
                "Higher operational costs due to priority given to passenger services"
            ])
        
        elif strategy_key == "throughput":
            benefits.extend([
                "Maximizes overall network capacity utilization",
                "Keeps goods and freight moving efficiently",
                "Optimizes infrastructure usage across the entire network"
            ])
            if action_type == "Halt" and "EXPRESS" in action.get("train_id", ""):
                drawbacks.append("Delays high-priority passenger services")
            benefits.append("Maintains steady flow of economic freight traffic")
            drawbacks.extend([
                "May cause delays for individual passenger trains",
                "Potential reduction in passenger service quality",
                "Could impact premium service reputation"
            ])
        
        else:  # balanced
            benefits.extend([
                "Provides a fair compromise between all service types",
                "Minimizes overall network disruption",
                "Maintains operational stability across passenger and freight services"
            ])
            drawbacks.extend([
                "May not fully optimize for any specific priority",
                "Moderate impact on both passenger and freight services",
                "Compromise solution may not satisfy specialized operational goals"
            ])
        
        # Action-specific impacts
        if action_type == "Halt":
            duration = action.get("duration_mins", 0)
            if duration > 30:
                drawbacks.append(f"Extended {duration}-minute halt may cause significant passenger inconvenience")
            else:
                benefits.append(f"Short {duration}-minute halt minimizes overall disruption")
        
        elif action_type == "Reroute":
            benefits.append("Maintains train movement while avoiding conflict zones")
            alt_route = action.get("alternative_route", {})
            if alt_route.get("total_time", 0) > 0:
                additional_time = alt_route["total_time"]
                drawbacks.append(f"Alternative route adds approximately {additional_time} minutes to journey")
        
        elif action_type == "Cancel":
            benefits.append("Completely eliminates the conflict and frees up network capacity")
            drawbacks.extend([
                "Complete service cancellation affects all scheduled passengers",
                "Requires passenger rebooking and potential compensation",
                "May damage service reliability reputation"
            ])
        
        return {"benefits": benefits, "drawbacks": drawbacks}
    
    def _calculate_confidence(self, best_score: float, all_scores: List[float]) -> str:
        """Calculate confidence level based on score distribution."""
        if len(all_scores) <= 1:
            return "Medium"
        
        sorted_scores = sorted(all_scores)
        score_gap = sorted_scores[1] - sorted_scores[0] if len(sorted_scores) > 1 else 0
        
        if score_gap > 50:
            return "High"
        elif score_gap > 20:
            return "Medium"
        else:
            return "Low"
    
    def _format_recommendation_text(self, action: Dict[str, Any], train_name: str) -> str:
        """Generate user-friendly recommendation text."""
        action_type = action['action_type']
        
        if action_type == "Halt":
            duration = action['duration_mins']
            return f"Halt {train_name} for {duration} minutes to resolve platform conflict."
        elif action_type == "Reroute":
            return f"Reroute {train_name} to an alternative platform/route."
        elif action_type == "SpeedAdjust":
            return f"Reduce speed of {train_name} to create buffer time."
        elif action_type == "Cancel":
            return f"Temporarily cancel {train_name} and reschedule."
        else:
            return f"Apply {action_type} action to {train_name}."
    
    def _generate_reasoning(self, action: Dict[str, Any], train_priority: int, score: float, strategy_name: str) -> str:
        """Generate explanation for why this solution was chosen."""
        priority_desc = {1: "highest", 2: "high", 3: "medium", 4: "low", 5: "lowest"}
        priority_text = priority_desc.get(train_priority, "unknown")
        
        reasoning = f"This solution was selected using the '{strategy_name}' strategy "
        reasoning += f"because it has the optimal impact score ({score}). "
        reasoning += f"The affected train has {priority_text} priority (level {train_priority}), "
        reasoning += f"making this action strategically aligned with the chosen optimization approach."
        
        return reasoning