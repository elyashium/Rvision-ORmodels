#!/usr/bin/env python3
"""
R-Vision Setup and Run Script
Automates the setup and launch of the Decision Support System
"""

import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path

def print_banner():
    """Print the R-Vision banner."""
    print("="*70)
    print("🚂 R-Vision: AI-Powered Railway Decision Support System")
    print("="*70)
    print("Setting up your intelligent railway traffic optimization system...")
    print()

def check_python_version():
    """Check if Python version is compatible."""
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ is required. Current version:", sys.version)
        return False
    
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def install_dependencies():
    """Install required Python packages."""
    print("\n📦 Installing dependencies...")
    
    try:
        # Check if pip is available
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, capture_output=True)
        
        # Install requirements
        result = subprocess.run([
            sys.executable, "-m", "pip", "install", "-r", "requirements.txt"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Dependencies installed successfully!")
            return True
        else:
            print(f"❌ Error installing dependencies: {result.stderr}")
            return False
            
    except subprocess.CalledProcessError:
        print("❌ pip is not available. Please install pip first.")
        return False
    except FileNotFoundError:
        print("❌ requirements.txt not found. Please ensure all files are present.")
        return False

def check_files():
    """Check if all required files are present."""
    required_files = [
        "models.py",
        "optimizer.py", 
        "app.py",
        "schedule.json",
        "requirements.txt"
    ]
    
    print("\n📋 Checking required files...")
    
    missing_files = []
    for file in required_files:
        if Path(file).exists():
            print(f"✅ {file}")
        else:
            print(f"❌ {file} - MISSING")
            missing_files.append(file)
    
    if missing_files:
        print(f"\n❌ Missing files: {', '.join(missing_files)}")
        print("Please ensure all project files are in the current directory.")
        return False
    
    return True

def start_server():
    """Start the R-Vision backend server."""
    print("\n🚀 Starting R-Vision backend server...")
    print("Press Ctrl+C to stop the server when you're done.")
    print()
    
    try:
        # Start the Flask app
        subprocess.run([sys.executable, "app.py"], check=True)
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user.")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        return False
    
    return True

def show_usage_instructions():
    """Show instructions for using the system."""
    print("\n" + "="*70)
    print("🎯 R-VISION IS READY!")
    print("="*70)
    print()
    print("📡 Backend API: http://localhost:5001")
    print("🌐 Web Interface: Open 'simple_frontend.html' in your browser")
    print()
    print("🧪 Test the System:")
    print("   1. Run: python test_system.py")
    print("   2. Or use the web interface")
    print("   3. Or make API calls directly")
    print()
    print("📋 Quick API Test:")
    print("   curl http://localhost:5001/")
    print("   curl -X POST http://localhost:5001/api/report-event \\")
    print("     -H 'Content-Type: application/json' \\")
    print("     -d '{\"train_id\":\"12301\",\"delay_minutes\":30}'")
    print()
    print("🎉 Ready for your hackathon demo!")
    print("="*70)

def main():
    """Main setup and run function."""
    print_banner()
    
    # Step 1: Check Python version
    if not check_python_version():
        return 1
    
    # Step 2: Check required files
    if not check_files():
        return 1
    
    # Step 3: Install dependencies
    if not install_dependencies():
        print("\n⚠️  You can try to run anyway, but some features might not work.")
        response = input("Continue anyway? (y/N): ").lower().strip()
        if response != 'y':
            return 1
    
    # Step 4: Show usage instructions
    show_usage_instructions()
    
    # Step 5: Ask if user wants to start the server
    print("\nWould you like to start the R-Vision server now?")
    response = input("Start server? (Y/n): ").lower().strip()
    
    if response in ['', 'y', 'yes']:
        # Optional: Try to open the web interface
        try:
            frontend_path = Path("simple_frontend.html").absolute()
            if frontend_path.exists():
                print(f"\n🌐 Opening web interface: {frontend_path}")
                webbrowser.open(f"file://{frontend_path}")
                time.sleep(2)  # Give browser time to open
        except Exception:
            pass  # Don't fail if we can't open browser
        
        # Start the server (this will block until Ctrl+C)
        return 0 if start_server() else 1
    else:
        print("\n✅ Setup complete! Run 'python app.py' when ready to start the server.")
        return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
