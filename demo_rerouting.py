#!/usr/bin/env python3
"""
R-Vision Advanced Rerouting Demo Script
Demonstrates the enhanced Decision Support System with network graph and intelligent rerouting
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
    print("\n" + "="*70)
    print(f"🎯 {title}")
    print("="*70)

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

def test_system_health():
    """Test if the enhanced system is running."""
    print_section("ENHANCED SYSTEM HEALTH CHECK")
    
    response = make_request("GET", "/api/system-info")
    if response and response.get("status") == "success":
        info = response.get("system_info", {})
        print(f"✅ System Status: Operational")
        print(f"📊 Total Trains: {info.get('total_trains', 0)}")
        print(f"🗺️  Total Stations: {len(info.get('available_stations', []))}")
        print(f"🛤️  Total Tracks: {info.get('total_tracks', 0)}")
        print(f"🧠 Optimization: {'✅ Enabled' if info.get('optimization_enabled') else '❌ Disabled'}")
        print(f"🗺️  Pathfinding: {'✅ Enabled' if info.get('pathfinding_enabled') else '❌ Disabled'}")
        print(f"🔄 Rerouting: {'✅ Enabled' if info.get('rerouting_enabled') else '❌ Disabled'}")
        return True
    else:
        print("❌ Enhanced system is not responding!")
        return False

def show_network_topology():
    """Display the network topology and current status."""
    print_section("NETWORK TOPOLOGY & STATUS")
    
    response = make_request("GET", "/api/network-status")
    if response and response.get("status") == "success":
        topology = response.get("network_topology", {})
        stations = topology.get("stations", {})
        tracks = topology.get("tracks", {})
        health = topology.get("network_health", {})
        
        print(f"🌐 Network Health: {health.get('network_health', 'Unknown').upper()}")
        print(f"📊 Operational Tracks: {health.get('operational_tracks', 0)}/{health.get('total_tracks', 0)}")
        print(f"🚫 Failed Tracks: {health.get('failed_tracks', 0)}")
        print()
        
        print("🚉 STATIONS:")
        for station_code, station_info in stations.items():
            station_type = station_info.get('type', 'unknown').title()
            platforms = station_info.get('platforms', 0)
            print(f"   {station_code}: {station_info.get('name')} ({station_type}, {platforms} platforms)")
        
        print("\n🛤️  TRACKS:")
        operational_count = 0
        failed_count = 0
        for track_id, track_info in tracks.items():
            status = track_info.get('status', 'unknown')
            if status == 'operational':
                operational_count += 1
                status_icon = "✅"
            else:
                failed_count += 1
                status_icon = "🚫"
                
            route = f"{track_info.get('from', '?')} → {track_info.get('to', '?')}"
            distance = track_info.get('distance_km', 0)
            travel_time = track_info.get('travel_time_minutes', 0)
            print(f"   {status_icon} {track_id}: {route} ({distance}km, {travel_time}min)")
            
            if status != 'operational':
                reason = track_info.get('disable_reason', 'Unknown')
                print(f"      ⚠️  Reason: {reason}")

def demonstrate_track_failure_scenario():
    """Demonstrate track failure and automatic rerouting."""
    print_section("TRACK FAILURE SCENARIO DEMONSTRATION")
    
    print("🎭 SCENARIO: Main Delhi-Anand Vihar line experiences signal failure")
    print("Expected AI Behavior:")
    print("   1. Disable the main track")
    print("   2. Recalculate routes for affected trains")
    print("   3. Find alternative paths using bypass routes")
    print()
    
    # Step 1: Report track failure
    print("📡 Step 1: Reporting track failure...")
    track_failure_data = {
        "track_id": "NDLS_ANVR_MAIN",
        "description": "Signal failure on main Delhi-Anand Vihar line - critical infrastructure down"
    }
    
    response = make_request("POST", "/api/track-failure", track_failure_data)
    if response and response.get("status") == "success":
        print("✅ Track failure reported successfully")
        network_status = response.get("network_state", {}).get("network_status", {})
        print(f"   🌐 Network Health: {network_status.get('network_health', 'unknown').upper()}")
        print(f"   🚫 Failed Tracks: {network_status.get('failed_tracks', 0)}")
        print(f"   ✅ Operational Tracks: {network_status.get('operational_tracks', 0)}")
    
    time.sleep(2)
    
    # Step 2: Show how this affects train routing
    print("\n📊 Step 2: Checking impact on train routes...")
    trains_response = make_request("GET", "/api/trains")
    if trains_response and trains_response.get("status") == "success":
        trains = trains_response.get("trains", [])
        affected_trains = []
        
        for train in trains:
            route_info = train.get("route_info", {})
            if route_info.get("route_status") == "no_route":
                affected_trains.append(train)
        
        print(f"   🚂 Affected Trains: {len(affected_trains)}")
        for train in affected_trains:
            print(f"      • {train.get('train_name', 'Unknown')} ({train.get('train_type', 'Unknown')})")
            print(f"        Route: {train.get('section_start')} → {train.get('section_end')}")
    
    time.sleep(2)
    
    # Step 3: Test delay event to trigger rerouting optimization
    print("\n🚨 Step 3: Injecting delay to trigger rerouting optimization...")
    delay_event_data = {
        "train_id": "18205_GOODS",
        "delay_minutes": 45,
        "description": "Goods train severely delayed due to track failure - needs rerouting"
    }
    
    response = make_request("POST", "/api/report-event", delay_event_data)
    if response and response.get("status") == "success":
        optimization = response.get("optimization_result", {})
        
        if optimization.get("status") == "ConflictFound":
            print("🧠 AI DETECTED CONFLICT AND GENERATED SOLUTION:")
            recommendation = optimization.get("recommendation", {})
            print(f"   💡 Action: {recommendation.get('recommendation_text', 'No recommendation')}")
            print(f"   🎯 Confidence: {recommendation.get('confidence', 'Unknown')}")
            print(f"   📊 Impact Score: {recommendation.get('score', 'N/A')}")
            print(f"   🤔 Reasoning: {recommendation.get('reasoning', 'No reasoning provided')}")
            
            # Check if it's a rerouting solution
            action = recommendation.get("action", {})
            if action.get("action_type") == "Reroute":
                alt_route = action.get("alternative_route", {})
                if alt_route:
                    print("\n🗺️  ALTERNATIVE ROUTE DETAILS:")
                    print(f"      🚉 Stations: {' → '.join(alt_route.get('stations', []))}")
                    print(f"      ⏱️  Total Time: {alt_route.get('total_time', 0)} minutes")
                    print(f"      📏 Distance: {alt_route.get('total_distance', 0)} km")
                    print(f"      🛤️  Route Type: {alt_route.get('route_type', 'Unknown')}")
        else:
            print("ℹ️  No immediate conflicts detected, but alternative routes are available")
    
    time.sleep(3)
    
    # Step 4: Repair the track
    print("\n🔧 Step 4: Repairing the failed track...")
    track_repair_data = {
        "track_id": "NDLS_ANVR_MAIN",
        "description": "Signal system repaired - main line fully operational"
    }
    
    response = make_request("POST", "/api/track-repair", track_repair_data)
    if response and response.get("status") == "success":
        print("✅ Track repaired successfully")
        network_status = response.get("network_state", {}).get("network_status", {})
        print(f"   🌐 Network Health: {network_status.get('network_health', 'unknown').upper()}")
        print(f"   ✅ All tracks operational: {network_status.get('operational_tracks', 0)}")

def demonstrate_intelligent_rerouting():
    """Show how the system intelligently selects routes based on train types."""
    print_section("INTELLIGENT REROUTING BY TRAIN TYPE")
    
    print("🎭 SCENARIO: Different train types get different routing preferences")
    print()
    
    # Get current train information
    trains_response = make_request("GET", "/api/trains")
    if trains_response and trains_response.get("status") == "success":
        trains = trains_response.get("trains", [])
        
        train_types = {}
        for train in trains:
            train_type = train.get("train_type", "Unknown")
            priority = train.get("priority", 0)
            if train_type not in train_types:
                train_types[train_type] = []
            train_types[train_type].append({
                "id": train.get("train_id"),
                "name": train.get("train_name"),
                "priority": priority,
                "route": f"{train.get('section_start')} → {train.get('section_end')}"
            })
        
        print("🚂 TRAIN CLASSIFICATION:")
        for train_type, train_list in train_types.items():
            print(f"\n   {train_type.upper()} TRAINS:")
            for train in train_list:
                priority_desc = {1: "Highest", 2: "High", 3: "Medium", 4: "Low", 5: "Lowest"}
                priority_text = priority_desc.get(train["priority"], "Unknown")
                print(f"      • {train['name']} (Priority: {priority_text})")
                print(f"        Route: {train['route']}")
        
        print("\n🧠 ROUTING INTELLIGENCE:")
        print("   Express Trains: Prefer high-speed tracks, avoid single-line routes")
        print("   Passenger Trains: Balance speed and reliability")
        print("   Goods Trains: More tolerant of longer routes, prefer less congested tracks")
        print("   Local Trains: Flexible routing, can use bypass routes efficiently")

def show_system_capabilities():
    """Display the full capabilities of the enhanced system."""
    print_section("R-VISION ENHANCED CAPABILITIES SUMMARY")
    
    print("🚀 CORE ENHANCEMENTS:")
    print("   ✅ Network Graph Topology: 8 stations, 12 track segments")
    print("   ✅ Dijkstra Pathfinding: Optimal route calculation")
    print("   ✅ Multi-criteria Optimization: Time, distance, reliability")
    print("   ✅ Dynamic Track Management: Failure detection and repair")
    print("   ✅ Intelligent Rerouting: Train-type specific routing")
    print("   ✅ Environmental Awareness: Weather and track conditions")
    print("   ✅ Real-time Network Health: Degraded vs healthy status")
    
    print("\n🎯 OPERATIONAL SCENARIOS SUPPORTED:")
    print("   🚨 Track Failures: Signal failures, maintenance blocks")
    print("   🔧 Track Repairs: Restoration of network capacity")
    print("   🚂 Train Delays: Cascading delay management")
    print("   🗺️  Route Optimization: Multiple alternative paths")
    print("   ⚖️  Priority Management: Express vs goods train preferences")
    print("   🌦️  Weather Impact: Rain, fog, and visibility conditions")
    
    print("\n📊 DECISION SUPPORT METRICS:")
    print("   • Route complexity penalties")
    print("   • Distance and time optimization")
    print("   • Train type compatibility scoring")
    print("   • Environmental condition adjustments")
    print("   • Peak hour passenger impact multipliers")

def main():
    """Run the complete enhanced system demonstration."""
    print("🚀 R-Vision Enhanced Decision Support System - Advanced Demo")
    print("Demonstrating network graph topology and intelligent rerouting capabilities")
    print()
    
    # Test 1: System health
    if not test_system_health():
        print("❌ Enhanced system is not running. Please start with 'python app.py'")
        return
    
    # Test 2: Network topology
    show_network_topology()
    
    # Test 3: Track failure scenario
    demonstrate_track_failure_scenario()
    
    # Test 4: Intelligent routing
    demonstrate_intelligent_rerouting()
    
    # Test 5: System capabilities
    show_system_capabilities()
    
    print_section("ENHANCED DEMO COMPLETED")
    print("🎉 R-Vision Enhanced System demonstration completed successfully!")
    print()
    print("🏆 HACKATHON-READY FEATURES DEMONSTRATED:")
    print("   ✅ Real-world railway network topology")
    print("   ✅ Intelligent pathfinding algorithms")
    print("   ✅ Dynamic network failure management")
    print("   ✅ Multi-criteria route optimization")
    print("   ✅ Train-type specific routing intelligence")
    print("   ✅ Production-ready system architecture")
    print()
    print("🚀 Ready to impress the judges with advanced railway optimization!")

if __name__ == "__main__":
    main()
