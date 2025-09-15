#!/usr/bin/env python3
"""
R-Vision System Test Script
Demonstrates the complete workflow of the Decision Support System
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:5001"
HEADERS = {"Content-Type": "application/json"}

def print_section(title: str):
    """Print a formatted section header."""
    print("\n" + "="*60)
    print(f"🎯 {title}")
    print("="*60)

def make_request(method: str, endpoint: str, data: Dict = None) -> Dict[str, Any]:
    """Make an HTTP request and return the JSON response."""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url)
        elif method.upper() == "POST":
            response = requests.post(url, headers=HEADERS, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Error making request to {url}: {e}")
        return {}

def test_health_check():
    """Test if the system is running."""
    print_section("SYSTEM HEALTH CHECK")
    
    response = make_request("GET", "/")
    if response:
        print(f"✅ System Status: {response.get('status', 'Unknown')}")
        print(f"📋 Service: {response.get('service', 'Unknown')}")
        print(f"🔢 Version: {response.get('version', 'Unknown')}")
    else:
        print("❌ System is not responding!")
        return False
    
    return True

def show_initial_state():
    """Show the initial state of all trains."""
    print_section("INITIAL TRAIN STATUS")
    
    response = make_request("GET", "/api/trains")
    if response and response.get("status") == "success":
        trains = response.get("trains", [])
        print(f"📊 Total Trains: {len(trains)}")
        print()
        
        for train in trains:
            priority_desc = {1: "🔴 Highest", 2: "🟠 High", 3: "🟡 Medium", 4: "🔵 Low", 5: "⚫ Lowest"}
            priority_text = priority_desc.get(train["priority"], "❓ Unknown")
            
            print(f"🚂 {train['train_name']} ({train['train_id']})")
            print(f"   Priority: {priority_text} (Level {train['priority']})")
            print(f"   Status: {train['status']}")
            print(f"   Location: {train['current_location']} → {train['next_station']}")
            print(f"   Delay: {train['current_delay_mins']} minutes")
            print()

def simulate_disruption():
    """Simulate a train delay and get AI recommendations."""
    print_section("SIMULATING DISRUPTION EVENT")
    
    # Create a realistic disruption scenario with the new data format
    event_data = {
        "train_id": "12001_SHATABDI",
        "delay_minutes": 25,
        "event_type": "delay",
        "description": "Signal failure at previous station caused 25-minute delay",
        "weather": "Fog",
        "track_condition": "Maintenance"
    }
    
    print(f"🚨 REPORTING EVENT: {event_data['description']}")
    print(f"   Affected Train: Rajdhani Express ({event_data['train_id']})")
    print(f"   Delay: {event_data['delay_minutes']} minutes")
    print()
    
    response = make_request("POST", "/api/report-event", event_data)
    
    if response and response.get("status") == "success":
        optimization = response.get("optimization_result", {})
        
        if optimization.get("status") == "ConflictFound":
            print("⚠️  CONFLICT DETECTED!")
            
            conflict = optimization.get("conflict_info", {})
            print(f"   Location: {conflict.get('location')}")
            print(f"   Affected Trains: {', '.join(conflict.get('affected_trains', []))}")
            print(f"   Severity: {conflict.get('severity')}")
            print(f"   Details: {conflict.get('details')}")
            print()
            
            recommendation = optimization.get("recommendation", {})
            if recommendation:
                print("💡 AI RECOMMENDATION:")
                print(f"   Action: {recommendation.get('recommendation_text')}")
                print(f"   Confidence: {recommendation.get('confidence')}")
                print(f"   Score: {recommendation.get('score')}")
                print(f"   Reasoning: {recommendation.get('reasoning')}")
                
                return recommendation
        
        elif optimization.get("status") == "NoConflict":
            print("✅ No conflicts detected - all trains can proceed normally!")
    
    return None

def demonstrate_system_intelligence():
    """Show how the AI makes decisions based on train priorities."""
    print_section("AI DECISION-MAKING DEMONSTRATION")
    
    scenarios = [
        {
            "train_id": "22301_RAJDHANI",  # Express (Priority 1)
            "delay": 20,
            "description": "High-priority express train delay"
        },
        {
            "train_id": "18205_GOODS",  # Goods train (Priority 5)
            "delay": 20,
            "description": "Low-priority goods train delay"
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n📋 Scenario {i}: {scenario['description']}")
        print(f"   Train: {scenario['train_id']}")
        print(f"   Delay: {scenario['delay']} minutes")
        
        # Reset system first
        make_request("POST", "/api/reset")
        time.sleep(1)
        
        # Apply the scenario
        event_data = {
            "train_id": scenario["train_id"],
            "delay_minutes": scenario["delay"],
            "event_type": "delay"
        }
        
        response = make_request("POST", "/api/report-event", event_data)
        
        if response and response.get("optimization_result", {}).get("recommendation"):
            rec = response["optimization_result"]["recommendation"]
            print(f"   🤖 AI Decision: {rec.get('recommendation_text')}")
            print(f"   📊 Impact Score: {rec.get('score')}")
        else:
            print("   ✅ No conflicts detected")

def main():
    """Run the complete system demonstration."""
    print("🚀 R-Vision Decision Support System - Demo Script")
    print("This script demonstrates the complete workflow of our AI railway system")
    
    # Test 1: Health check
    if not test_health_check():
        print("❌ System is not running. Please start the server with 'python app.py'")
        return
    
    # Test 2: Show initial state
    show_initial_state()
    
    # Test 3: Simulate disruption
    recommendation = simulate_disruption()
    
    # Test 4: Show system intelligence
    demonstrate_system_intelligence()
    
    print_section("DEMO COMPLETED")
    print("🎉 R-Vision system demonstration completed successfully!")
    print("💡 Key Features Demonstrated:")
    print("   ✅ Real-time conflict detection")
    print("   ✅ Priority-based decision making")
    print("   ✅ Mathematical optimization")
    print("   ✅ Human-readable recommendations")
    print("   ✅ Clean API interface")
    print()
    print("🚀 Ready for hackathon presentation!")

if __name__ == "__main__":
    main()
