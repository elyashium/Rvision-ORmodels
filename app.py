# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from models import RailwayNetwork
from optimizer import Optimizer, PRIORITY_WEIGHTS, ACTION_PENALTIES
import json
import os
from typing import Dict, Any

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend integration

# Global variables to hold our system components
network: RailwayNetwork = None
optimizer: Optimizer = None
initial_schedule_data = None

def initialize_system():
    """Initialize the railway network and optimizer from schedule data."""
    global network, optimizer, initial_schedule_data
    
    try:
        # Load the initial schedule from file
        schedule_file = 'schedule.json'
        if not os.path.exists(schedule_file):
            print(f"⚠️  Warning: {schedule_file} not found. Creating sample data...")
            create_sample_schedule()
        
        with open(schedule_file, 'r') as f:
            initial_schedule_data = json.load(f)
        
        # Create our "World" (Digital Twin) and "Brain" (Optimizer)
        network = RailwayNetwork(initial_schedule_data)
        optimizer = Optimizer(PRIORITY_WEIGHTS, ACTION_PENALTIES)
        
        print("🚂 R-Vision System Initialized Successfully!")
        print(f"   📊 Loaded {len(network.trains)} trains")
        print(f"   🧠 Optimizer ready with {len(PRIORITY_WEIGHTS)} priority levels")
        
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
    Main endpoint: Report a disruption event and get AI recommendations.
    
    Expected JSON payload:
    {
        "train_id": "12301",
        "delay_minutes": 30,
        "event_type": "delay",
        "description": "Signal failure at previous station"
    }
    """
    try:
        if not network or not optimizer:
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
        
        # Step 2: Run the optimizer on the new state of the world
        optimization_result = optimizer.run(network)
        
        # Step 3: Format the response
        response = {
            "status": "success",
            "event_processed": event_data,
            "network_state": network.get_state_snapshot(),
            "optimization_result": optimization_result,
            "timestamp": network.get_state_snapshot()["timestamp"]
        }
        
        print(f"✅ EVENT PROCESSED: {optimization_result.get('status', 'Unknown')}")
        
        return jsonify(response)
    
    except Exception as e:
        print(f"❌ Error processing event: {e}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/api/accept-recommendation', methods=['POST'])
def accept_recommendation():
    """
    Accept and apply a recommendation from the optimizer.
    This simulates the human operator accepting the AI's suggestion.
    """
    try:
        if not network:
            return jsonify({"error": "System not initialized"}), 500
        
        recommendation_data = request.json
        
        if not recommendation_data or 'recommendation_id' not in recommendation_data:
            return jsonify({"error": "Invalid recommendation data"}), 400
        
        # In a real system, you would apply the recommended action
        # For the prototype, we'll just log it and update the train status
        action = recommendation_data.get('action', {})
        train_id = action.get('train_id')
        
        if train_id:
            train = network.get_train(train_id)
            if train:
                train.status = f"Action Applied: {action.get('action_type', 'Unknown')}"
                print(f"✅ RECOMMENDATION ACCEPTED: {action.get('description', 'No description')}")
        
        return jsonify({
            "status": "success",
            "message": "Recommendation accepted and applied",
            "network_state": network.get_state_snapshot()
        })
    
    except Exception as e:
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

@app.route('/api/system-info', methods=['GET'])
def get_system_info():
    """Get information about the system configuration."""
    return jsonify({
        "status": "success",
        "system_info": {
            "priority_weights": PRIORITY_WEIGHTS,
            "action_penalties": ACTION_PENALTIES,
            "total_trains": len(network.trains) if network else 0,
            "available_stations": list(network.platforms.keys()) if network else [],
            "optimization_enabled": optimizer is not None
        }
    })

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
    print("   POST /api/report-event     - Report disruption event")
    print("   POST /api/accept-recommendation - Accept AI recommendation")
    print("   POST /api/reset            - Reset simulation")
    print("   GET  /api/trains           - Get all train information")
    print("   GET  /api/system-info      - Get system configuration")
    print("="*50)
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',  # Allow external connections
        port=5001,       # Use port 5001 to avoid conflicts with React's default port 3000
        debug=True       # Enable debug mode for development
    )
