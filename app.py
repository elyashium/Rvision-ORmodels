# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from models import RailwayNetwork
from optimizer import Optimizer, MultiStrategyOptimizer, PRIORITY_WEIGHTS, ACTION_PENALTIES
import json
import os
from typing import Dict, Any

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Global variables to hold our system components
network: RailwayNetwork = None
optimizer: Optimizer = None
multi_strategy_optimizer: MultiStrategyOptimizer = None
initial_schedule_data = None

def initialize_system():
    """Initialize the railway network and optimizer from schedule data."""
    global network, optimizer, multi_strategy_optimizer, initial_schedule_data
    
    try:
        # Load the initial schedule from file (try enhanced first, fallback to basic)
        schedule_file = 'enhanced_schedule.json'
        if not os.path.exists(schedule_file):
            print(f"⚠️  Warning: {schedule_file} not found. Trying basic schedule...")
            schedule_file = 'schedule.json'
            if not os.path.exists(schedule_file):
                print(f"⚠️  Warning: No schedule files found. Creating sample data...")
                create_sample_schedule()
        
        with open(schedule_file, 'r') as f:
            initial_schedule_data = json.load(f)
        
        # Create our "World" (Digital Twin) and "Brain" (Optimizer)
        network = RailwayNetwork(initial_schedule_data)
        optimizer = Optimizer(PRIORITY_WEIGHTS, ACTION_PENALTIES)
        multi_strategy_optimizer = MultiStrategyOptimizer(PRIORITY_WEIGHTS, ACTION_PENALTIES)
        
        print("🚂 R-Vision System Initialized Successfully!")
        print(f"   📊 Loaded {len(network.trains)} trains")
        print(f"   🧠 Standard Optimizer ready with {len(PRIORITY_WEIGHTS)} priority levels")
        print(f"   🎯 Multi-Strategy Optimizer ready with 3 strategies")
        
    except Exception as e:
        print(f"❌ Error initializing system: {e}")
        raise

def create_sample_schedule():
    """Create a sample schedule.json file for demonstration."""
    sample_data = [
        {
            "train_id": "12301",
            "train_name": "Rajdhani Express",
            "priority": 1,
            "route": [
                {"station_code": "NDLS", "arrival_time": "06:00", "departure_time": "06:00"},
                {"station_code": "ANVR", "arrival_time": "06:45", "departure_time": "06:47"},
                {"station_code": "GZB", "arrival_time": "07:30", "departure_time": "07:32"}
            ]
        },
        {
            "train_id": "12302",
            "train_name": "Shatabdi Express",
            "priority": 2,
            "route": [
                {"station_code": "GZB", "arrival_time": "06:30", "departure_time": "06:30"},
                {"station_code": "ANVR", "arrival_time": "07:15", "departure_time": "07:17"},
                {"station_code": "NDLS", "arrival_time": "08:00", "departure_time": "08:00"}
            ]
        }
    ]
    
    with open('schedule.json', 'w') as f:
        json.dump(sample_data, f, indent=2)
    
    print("📝 Created sample schedule.json file")

# --- API Endpoints ---

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "R-Vision Decision Support System",
        "version": "1.0.0",
        "description": "AI-powered railway traffic optimization system"
    })

@app.route('/api/state', methods=['GET'])
def get_current_state():
    """Get the current state of the railway network simulation."""
    try:
        if not network:
            return jsonify({"error": "System not initialized"}), 500
        
        state = network.get_state_snapshot()
        return jsonify({
            "status": "success",
            "data": state
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to get state: {str(e)}"}), 500

@app.route('/api/report-event', methods=['POST'])
def report_event():
    """
    Main endpoint: Report a disruption event and get multi-strategy AI recommendations.
    
    Expected JSON payload:
    {
        "train_id": "12301",
        "delay_minutes": 30,
        "event_type": "delay",
        "description": "Signal failure at previous station"
    }
    """
    try:
        if not network or not multi_strategy_optimizer:
            return jsonify({"error": "System not initialized"}), 500
        
        # Get event data from request
        event_data = request.json
        
        if not event_data:
            return jsonify({"error": "No event data provided"}), 400
        
        # Validate required fields
        required_fields = ['train_id', 'delay_minutes']
        for field in required_fields:
            if field not in event_data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        print(f"\n🚨 NEW EVENT REPORTED: {event_data}")
        
        # Step 1: Apply the disruption to our digital twin
        success = network.apply_event(event_data)
        
        if not success:
            return jsonify({
                "error": f"Failed to apply event to train {event_data.get('train_id')}"
            }), 400
        
        # Step 2: Run multi-strategy optimization and generate schedule data
        multi_strategy_results = multi_strategy_optimizer.generate_strategy_schedules(network)
        
        # Step 3: Format the response
        response = {
            "status": "success",
            "event_processed": event_data,
            "network_state": network.get_state_snapshot(),
            "simulations": multi_strategy_results,
            "timestamp": network.get_state_snapshot()["timestamp"]
        }
        
        print(f"✅ MULTI-STRATEGY ANALYSIS COMPLETED: {len(multi_strategy_results)} strategies evaluated")
        
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ Error processing event: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/api/accept-recommendation', methods=['POST'])
def accept_recommendation():
    """
    Accept and apply a recommendation from the optimizer.
    This applies the actual action to create a new network state.
    """
    try:
        if not network:
            return jsonify({"error": "System not initialized"}), 500
        
        recommendation_data = request.json
        
        if not recommendation_data or 'recommendation_id' not in recommendation_data:
            return jsonify({"error": "Invalid recommendation data"}), 400
        
        # Get the action from the recommendation
        action = recommendation_data.get('action', {})
        
        if not action:
            return jsonify({"error": "No action found in recommendation"}), 400
        
        print(f"🎯 PROCESSING RECOMMENDATION: {recommendation_data.get('recommendation_id')}")
        print(f"   Action: {action.get('action_type')} for train {action.get('train_id')}")
        
        # Apply the recommended action to the network
        success = network.apply_action(action)
        
        if not success:
            return jsonify({
                "error": f"Failed to apply action {action.get('action_type')} to train {action.get('train_id')}"
            }), 400
        
        # Save the modified schedule to file
        network.save_current_schedule("strategy_modified_schedule.json")
        
        # Get the updated network state after applying the action
        updated_state = network.get_state_snapshot()
        
        print(f"✅ RECOMMENDATION ACCEPTED AND APPLIED SUCCESSFULLY!")
        print(f"   Network state updated with {len(updated_state.get('trains', {}))} trains")
        
        return jsonify({
            "status": "success",
            "message": f"Recommendation accepted and applied: {action.get('description', 'Action applied')}",
            "network_state": updated_state,
            "applied_action": {
                "action_type": action.get('action_type'),
                "train_id": action.get('train_id'),
                "description": action.get('description')
            }
        })
    
    except Exception as e:
        print(f"❌ ERROR APPLYING RECOMMENDATION: {str(e)}")
        return jsonify({"error": f"Failed to accept recommendation: {str(e)}"}), 500

@app.route('/api/reset', methods=['POST'])
def reset_simulation():
    """Reset the simulation to its initial state."""
    try:
        if not initial_schedule_data:
            return jsonify({"error": "No initial data available for reset"}), 500
        
        global network
        network = RailwayNetwork(initial_schedule_data)
        
        print("🔄 SIMULATION RESET to initial state")
        
        return jsonify({
            "status": "success",
            "message": "Simulation reset to initial state",
            "network_state": network.get_state_snapshot()
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to reset simulation: {str(e)}"}), 500

@app.route('/api/trains', methods=['GET'])
def get_all_trains():
    """Get information about all trains in the network."""
    try:
        if not network:
            return jsonify({"error": "System not initialized"}), 500
        
        trains_info = []
        for train in network.trains.values():
            trains_info.append(train.get_current_status_info())
        
        return jsonify({
            "status": "success",
            "trains": trains_info,
            "total_trains": len(trains_info)
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to get trains: {str(e)}"}), 500

@app.route('/api/track-failure', methods=['POST'])
def report_track_failure():
    """
    Enhanced track failure endpoint with live rerouting capabilities.
    
    Expected JSON payload:
    {
        "track_id": "NDLS_ANVR_MAIN",
        "description": "Signal failure on main line",
        "event_type": "track_failure",
        "live_rerouting": true  // Optional: enables live rerouting
    }
    """
    try:
        if not network:
            return jsonify({"error": "System not initialized"}), 500
        
        event_data = request.json
        
        if not event_data:
            return jsonify({"error": "No event data provided"}), 400
        
        # Validate required fields for track failure
        if 'track_id' not in event_data:
            return jsonify({"error": "Missing required field: track_id"}), 400
        
        track_id = event_data['track_id']
        live_rerouting = event_data.get('live_rerouting', True)  # Default to true for new feature
        
        print(f"\n🚫 LIVE TRACK FAILURE REPORTED: {track_id}")
        print(f"   Live rerouting: {'Enabled' if live_rerouting else 'Disabled'}")
        
        # Step 1: Identify affected trains BEFORE disabling the track
        affected_trains = network._find_trains_using_track(track_id)
        affected_train_ids = [train.id for train in affected_trains]
        
        print(f"   📍 Identified {len(affected_trains)} affected trains: {affected_train_ids}")
        
        # Step 2: Disable the track
        success = network.network_graph.disable_track(track_id, event_data.get('description', 'Track failure'))
        
        if not success:
            return jsonify({
                "error": f"Failed to disable track {track_id}. Track may not exist."
            }), 400
        
        # Step 3: Live rerouting for affected trains
        rerouting_results = None
        if live_rerouting and affected_train_ids:
            print(f"   🔄 Starting live rerouting for {len(affected_train_ids)} trains...")
            rerouting_results = network.recalculate_routes_for_trains(affected_train_ids)
            print(f"   ✅ Rerouting completed: {rerouting_results['successfully_rerouted']}/{rerouting_results['total_affected']} trains")
        
        # Step 4: Get updated network state
        network_state = network.get_state_snapshot()
        
        # Step 5: Prepare response
        response = {
            "status": "success",
            "event_type": "track_failure",
            "track_id": track_id,
            "track_status": "disabled",
            "affected_trains": affected_train_ids,
            "live_rerouting_enabled": live_rerouting,
            "rerouting_results": rerouting_results,
            "network_state": network_state,
            "message": f"Track {track_id} disabled. {len(affected_trains)} trains affected.",
            "timestamp": network_state["timestamp"]
        }
        
        # Add detailed rerouting information to response
        if rerouting_results:
            response["rerouting_summary"] = {
                "total_trains_affected": rerouting_results["total_affected"],
                "successfully_rerouted": rerouting_results["successfully_rerouted"],
                "failed_reroutings": rerouting_results["total_affected"] - rerouting_results["successfully_rerouted"],
                "rerouting_details": rerouting_results["rerouting_info"]
            }
        
        print(f"✅ LIVE TRACK FAILURE PROCESSED - {track_id}")
        
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ Error processing track failure: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/api/track-repair', methods=['POST'])
def report_track_repair():
    """
    Report a track repair event.
    
    Expected JSON payload:
    {
        "track_id": "NDLS_ANVR_MAIN",
        "description": "Track maintenance completed",
        "event_type": "track_repair"
    }
    """
    try:
        if not network:
            return jsonify({"error": "System not initialized"}), 500
        
        event_data = request.json
        
        if not event_data:
            return jsonify({"error": "No event data provided"}), 400
        
        # Validate required fields
        if 'track_id' not in event_data:
            return jsonify({"error": "Missing required field: track_id"}), 400
        
        # Set event type
        event_data['event_type'] = 'track_repair'
        
        print(f"\n✅ TRACK REPAIR REPORTED: {event_data}")
        
        # Apply the track repair event
        success = network.apply_event(event_data)
        
        if not success:
            return jsonify({
                "error": f"Failed to apply track repair for {event_data.get('track_id')}"
            }), 400
        
        # Get updated network state
        network_state = network.get_state_snapshot()
        
        response = {
            "status": "success",
            "event_processed": event_data,
            "network_state": network_state,
            "message": f"Track {event_data.get('track_id')} repaired. Routes recalculated for optimal efficiency.",
            "timestamp": network_state["timestamp"]
        }
        
        print(f"✅ TRACK REPAIR PROCESSED")
        
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ Error processing track repair: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/api/network-status', methods=['GET'])
def get_network_status():
    """Get detailed network topology and status information."""
    try:
        if not network:
            return jsonify({"error": "System not initialized"}), 500
        
        # Get track status information
        tracks_status = {}
        for track_id, track_data in network.network_graph.tracks.items():
            tracks_status[track_id] = {
                "from": track_data.get("from"),
                "to": track_data.get("to"),
                "status": track_data.get("status", "operational"),
                "distance_km": track_data.get("distance_km"),
                "travel_time_minutes": track_data.get("travel_time_minutes"),
                "track_type": track_data.get("track_type"),
                "priority": track_data.get("priority"),
                "disable_reason": track_data.get("disable_reason")
            }
        
        # Get station information
        stations_info = {}
        for station_code, station_data in network.network_graph.stations.items():
            stations_info[station_code] = {
                "name": station_data.get("name"),
                "type": station_data.get("type"),
                "platforms": station_data.get("platforms"),
                "capacity_per_hour": station_data.get("capacity_per_hour")
            }
        
        return jsonify({
            "status": "success",
            "network_topology": {
                "stations": stations_info,
                "tracks": tracks_status,
                "network_health": network.get_state_snapshot()["network_status"]
            }
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to get network status: {str(e)}"}), 500

@app.route('/api/system-info', methods=['GET'])
def get_system_info():
    """Get information about the system configuration."""
    return jsonify({
        "status": "success",
        "system_info": {
            "priority_weights": PRIORITY_WEIGHTS,
            "action_penalties": ACTION_PENALTIES,
            "total_trains": len(network.trains) if network else 0,
            "available_stations": list(network.network_graph.stations.keys()) if network and network.network_graph else [],
            "total_tracks": len(network.network_graph.tracks) if network and network.network_graph else 0,
            "optimization_enabled": optimizer is not None,
            "pathfinding_enabled": True,
            "rerouting_enabled": True,
            "live_rerouting_enabled": True
        }
    })

@app.route('/api/tracks', methods=['GET'])
def get_available_tracks():
    """Get list of all available tracks for track failure reporting."""
    try:
        if not network or not network.network_graph:
            return jsonify({"error": "System not initialized"}), 500
        
        tracks = []
        for track_id, track_data in network.network_graph.tracks.items():
            tracks.append({
                "track_id": track_id,
                "from_station": track_data.get("from", "Unknown"),
                "to_station": track_data.get("to", "Unknown"),
                "status": track_data.get("status", "operational"),
                "track_type": track_data.get("track_type", "unknown"),
                "priority": track_data.get("priority", "medium"),
                "travel_time_minutes": track_data.get("travel_time_minutes", 0),
                "can_disable": track_data.get("status", "operational") == "operational"
            })
        
        # Sort tracks by from_station, then to_station for consistent UI ordering
        tracks.sort(key=lambda t: (t["from_station"], t["to_station"]))
        
        return jsonify({
            "status": "success",
            "tracks": tracks,
            "total_tracks": len(tracks),
            "operational_tracks": len([t for t in tracks if t["status"] == "operational"]),
            "disabled_tracks": len([t for t in tracks if t["status"] == "disabled"])
        })
    
    except Exception as e:
        return jsonify({"error": f"Failed to get tracks: {str(e)}"}), 500

# --- Error Handlers ---

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

# --- Application Startup ---

if __name__ == '__main__':
    print("🚀 Starting R-Vision Decision Support System...")
    print("="*50)
    
    # Initialize the system
    initialize_system()
    
    print("="*50)
    print("🌐 Starting Flask server...")
    print("📡 API Endpoints available:")
    print("   GET  /                     - Health check")
    print("   GET  /api/state            - Get current network state")
    print("   POST /api/report-event     - Report train disruption event")
    print("   POST /api/track-failure    - Report track failure event (LIVE REROUTING)")
    print("   POST /api/track-repair     - Report track repair event")
    print("   POST /api/accept-recommendation - Accept AI recommendation")
    print("   POST /api/reset            - Reset simulation")
    print("   GET  /api/trains           - Get all train information")
    print("   GET  /api/tracks           - Get all available tracks")
    print("   GET  /api/network-status   - Get network topology and status")
    print("   GET  /api/system-info      - Get system configuration")
    print("="*50)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=5001,       # Use port 5001 to avoid conflicts with React's default port 3000
        debug=True       # Enable debug mode for development
    )
