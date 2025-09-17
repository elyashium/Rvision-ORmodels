#!/usr/bin/env python3
"""
Integration Test Script for Railway Network Optimization System
Tests FastAPI backend endpoints and optimization functionality
"""

import requests
import json
import time
import sys
from typing import Dict, Any

# Configuration
API_BASE = "http://localhost:8000"
HEADERS = {"Content-Type": "application/json"}

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    response = requests.get(f"{API_BASE}/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    print("✅ Health check passed")
    return True

def test_original_graph():
    """Test fetching original graph"""
    print("🔍 Testing original graph endpoint...")
    response = requests.get(f"{API_BASE}/api/graph/original")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    graph = data["data"]
    assert "nodes" in graph or "stations" in graph
    assert "edges" in graph or "tracks" in graph
    print(f"✅ Original graph loaded: {len(graph.get('nodes', []))} nodes, {len(graph.get('edges', []))} edges")
    return True

def test_optimization_flow():
    """Test complete optimization workflow"""
    print("\n🚀 Testing optimization workflow...")
    
    # 1. Trigger optimization
    print("  1️⃣ Triggering optimization...")
    disruption = {
        "type": "delay",
        "details": {
            "train_id": "T100",
            "delay_minutes": 20
        }
    }
    
    response = requests.post(
        f"{API_BASE}/api/optimise",
        headers=HEADERS,
        json={"disruption": disruption}
    )
    assert response.status_code == 200
    data = response.json()
    job_id = data["job_id"]
    print(f"  ✅ Job created: {job_id}")
    
    # 2. Check job status
    print("  2️⃣ Checking job status...")
    max_attempts = 30
    for i in range(max_attempts):
        response = requests.get(f"{API_BASE}/api/optimise/status/{job_id}")
        assert response.status_code == 200
        status_data = response.json()
        status = status_data["status"]
        
        print(f"     Status: {status}", end="\r")
        
        if status == "completed":
            print(f"\n  ✅ Job completed successfully")
            break
        elif status == "failed":
            print(f"\n  ❌ Job failed")
            return False
        
        time.sleep(1)
    
    # 3. Get results
    print("  3️⃣ Fetching optimization results...")
    response = requests.get(f"{API_BASE}/api/optimise/result/{job_id}")
    assert response.status_code == 200
    results = response.json()
    
    assert "result_files" in results
    files = results["result_files"]
    assert "delay" in files
    assert "failure" in files
    assert "priority" in files
    
    print(f"  ✅ Generated files:")
    for opt_type, filename in files.items():
        print(f"     • {opt_type}: {filename}")
    
    # 4. Fetch optimized graphs
    print("  4️⃣ Validating optimized graphs...")
    for opt_type, filename in files.items():
        response = requests.get(f"{API_BASE}/api/graph/{filename}")
        assert response.status_code == 200
        graph_data = response.json()
        graph = graph_data["data"]
        
        # Validate graph structure
        assert "meta" in graph
        assert graph["meta"]["scenario"] == opt_type
        assert "nodes" in graph or "stations" in graph
        assert "edges" in graph or "tracks" in graph
        
        # Check for optimization-specific data
        if "routes" in graph:
            print(f"     • {opt_type}: {len(graph['routes'])} routes optimized")
        if "trains" in graph:
            delayed = sum(1 for t in graph["trains"] if t.get("delay", 0) > 0)
            print(f"     • {opt_type}: {delayed}/{len(graph['trains'])} trains affected")
    
    print("✅ Optimization workflow completed successfully!")
    return True

def test_track_failure():
    """Test track failure scenario"""
    print("\n🚧 Testing track failure scenario...")
    
    disruption = {
        "type": "failure",
        "details": {
            "track_id": "NDLS_ANVR"
        }
    }
    
    response = requests.post(
        f"{API_BASE}/api/optimise",
        headers=HEADERS,
        json={"disruption": disruption}
    )
    assert response.status_code == 200
    data = response.json()
    job_id = data["job_id"]
    
    # Wait for completion
    print("  ⏳ Waiting for optimization...")
    time.sleep(3)
    
    response = requests.get(f"{API_BASE}/api/optimise/result/{job_id}")
    if response.status_code == 200:
        print("✅ Track failure optimization completed")
        return True
    else:
        print("❌ Track failure optimization failed")
        return False

def test_websocket_connection():
    """Test WebSocket connection (requires websocket-client)"""
    print("\n🔌 Testing WebSocket connection...")
    try:
        import websocket
        
        # Create a dummy job first
        response = requests.post(
            f"{API_BASE}/api/optimise",
            headers=HEADERS,
            json={
                "disruption": {
                    "type": "priority",
                    "details": {}
                }
            }
        )
        job_id = response.json()["job_id"]
        
        ws_url = f"ws://localhost:8000/api/optimise/stream/{job_id}"
        ws = websocket.create_connection(ws_url)
        
        # Wait for initial message
        result = ws.recv()
        data = json.loads(result)
        assert "type" in data
        
        ws.close()
        print("✅ WebSocket connection successful")
        return True
    except ImportError:
        print("⚠️  Skipping WebSocket test (install websocket-client to enable)")
        return True
    except Exception as e:
        print(f"❌ WebSocket test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("=" * 60)
    print("🧪 Railway Network Optimization Integration Tests")
    print("=" * 60)
    
    # Check if backend is running
    try:
        response = requests.get(f"{API_BASE}/")
        if response.status_code != 200:
            print("❌ Backend is not responding. Please start with:")
            print("   cd backend && python main.py")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend at", API_BASE)
        print("   Please start the backend with:")
        print("   cd backend && python main.py")
        sys.exit(1)
    
    # Run tests
    tests = [
        test_health_check,
        test_original_graph,
        test_optimization_flow,
        test_track_failure,
        test_websocket_connection
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            failed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"📈 Success Rate: {(passed/(passed+failed)*100):.1f}%")
    
    if failed == 0:
        print("\n🎉 All tests passed! System is ready for use.")
        print("\nTo start the frontend:")
        print("   cd frontend && npm install && npm start")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
    
    return failed == 0

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
