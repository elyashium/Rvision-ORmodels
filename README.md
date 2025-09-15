# R-Vision: AI-Powered Railway Decision Support System

🚂 **An intelligent Decision-Support System (DSS) for Indian Railways Section Controllers**

## 🎯 Project Overview

R-Vision is a functional prototype that helps railway section controllers manage train traffic more efficiently, especially during disruptions. The system acts as an AI "co-pilot," augmenting human expertise with mathematical optimization to find the best solutions for minimizing network-wide delays.

### Key Features

- **Human-in-the-Loop Design**: Manual event reporting via simple UI (no real-time APIs required)
- **Mathematical Optimization**: Operations Research (OR) based optimizer, not ML predictions
- **Real-time Conflict Detection**: Automatically identifies future train conflicts
- **Intelligent Recommendations**: Calculates optimal solutions based on train priorities
- **Clean Architecture**: Modular, Object-Oriented Python backend

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │───▶│   Flask API      │───▶│   Optimizer     │
│   (React/Web)   │    │   (app.py)       │    │   (Brain)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Railway Network  │
                       │ (Digital Twin)   │
                       └──────────────────┘
```

### Core Components

1. **`models.py`** - The Digital Twin
   - `Train` class: Represents individual trains with priority, route, and status
   - `RailwayNetwork` class: The main "world" object managing all trains and infrastructure

2. **`optimizer.py`** - The Brain
   - `Optimizer` class: Implements OR-based conflict resolution
   - Priority weights and action penalties for decision-making
   - Conflict detection, solution generation, and evaluation

3. **`app.py`** - The API Controller
   - Flask web server with REST endpoints
   - Coordinates between the Digital Twin and the Brain
   - Handles event reporting and recommendation delivery

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip (Python package installer)

### Installation

1. **Clone/Download the project files**
   ```bash
   # Ensure you have all these files in your project directory:
   # models.py, optimizer.py, app.py, schedule.json, requirements.txt
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the system**
   ```bash
   python app.py
   ```

4. **Verify the system is running**
   ```
   🚀 Starting R-Vision Decision Support System...
   🚂 R-Vision System Initialized Successfully!
   📊 Loaded 5 trains
   🧠 Optimizer ready with 5 priority levels
   🌐 Starting Flask server...
   * Running on http://0.0.0.0:5001
   ```

## 📡 API Endpoints

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/api/state` | Get current network state |
| POST | `/api/report-event` | Report disruption event |
| POST | `/api/accept-recommendation` | Accept AI recommendation |
| POST | `/api/reset` | Reset simulation |
| GET | `/api/trains` | Get all train information |
| GET | `/api/system-info` | Get system configuration |

### Example Usage

#### 1. Report a Delay Event

```bash
curl -X POST http://localhost:5001/api/report-event \
  -H "Content-Type: application/json" \
  -d '{
    "train_id": "12301",
    "delay_minutes": 30,
    "event_type": "delay",
    "description": "Signal failure at previous station"
  }'
```

#### 2. Get Current State

```bash
curl http://localhost:5001/api/state
```

#### 3. Reset Simulation

```bash
curl -X POST http://localhost:5001/api/reset
```

## 🎮 Demo Scenario

Here's a complete workflow you can test:

### Step 1: Check Initial State
```bash
curl http://localhost:5001/api/trains
```

### Step 2: Inject a Disruption
```bash
curl -X POST http://localhost:5001/api/report-event \
  -H "Content-Type: application/json" \
  -d '{
    "train_id": "12301",
    "delay_minutes": 25,
    "event_type": "delay"
  }'
```

### Step 3: Observe the AI Recommendation
The system will:
1. ✅ Apply the delay to Rajdhani Express
2. 🔍 Detect future conflicts at Anand Vihar Terminal
3. 💡 Calculate the optimal solution (likely halt the lower priority train)
4. 📊 Return a detailed recommendation with reasoning

### Expected Response
```json
{
  "status": "success",
  "optimization_result": {
    "status": "ConflictFound",
    "conflict_info": {
      "conflict_id": "C_ANVR_...",
      "affected_trains": ["12301", "12302"],
      "details": "Trains will arrive within 10 minutes of each other"
    },
    "recommendation": {
      "recommendation_text": "Halt Shatabdi Express for 10 minutes",
      "confidence": "High",
      "reasoning": "Lowest impact score based on train priorities"
    }
  }
}
```

## 🧠 How the AI Works

### Priority System
- **Priority 1**: Rajdhani, Shatabdi (Highest priority)
- **Priority 2**: Premium trains
- **Priority 3**: Express trains
- **Priority 4**: Mail/Passenger trains  
- **Priority 5**: Goods trains (Lowest priority)

### Decision Algorithm
1. **Conflict Detection**: Simulates network forward to find platform conflicts
2. **Solution Generation**: Creates halt/reroute options for affected trains
3. **Optimization**: Scores solutions using: `(Action Cost + Duration) × Priority Weight`
4. **Selection**: Chooses solution with lowest impact score

### Example Calculation
```
Halt Rajdhani (Priority 1) for 10 min: (1 + 5) × 100 = 600
Halt Shatabdi (Priority 2) for 10 min: (1 + 5) × 80 = 480  ← SELECTED
```

## 🔧 Configuration

### Modifying Train Priorities
Edit `schedule.json` to change train priorities:
```json
{
  "train_id": "12301",
  "train_name": "Rajdhani Express", 
  "priority": 1,  // 1=highest, 5=lowest
  ...
}
```

### Adjusting AI Behavior
Modify constants in `optimizer.py`:
```python
PRIORITY_WEIGHTS = {1: 100, 2: 80, 3: 50, 4: 20, 5: 5}
ACTION_PENALTIES = {"Halt": 1, "Reroute": 20}
```

## 🎯 Hackathon Demo Points

### Technical Excellence
- ✅ Clean, Object-Oriented Architecture
- ✅ Modern Python with Type Hints
- ✅ RESTful API Design
- ✅ Comprehensive Error Handling
- ✅ Real-time Conflict Detection Algorithm

### Problem-Solution Fit
- ✅ Addresses Real Railway Operations Challenge
- ✅ Human-in-the-Loop Design (No API Dependency)
- ✅ Mathematical Optimization (Not Just ML Hype)
- ✅ Practical, Implementable Solution

### Demo Flow
1. **Show Initial State**: All trains running smoothly
2. **Inject Crisis**: Report a 30-minute delay
3. **AI Analysis**: System detects future conflict automatically  
4. **Smart Solution**: AI recommends optimal action with reasoning
5. **Human Decision**: Operator can accept/modify recommendation

## 🚀 Next Steps for Production

- **Enhanced Conflict Detection**: More sophisticated time-stepped simulation
- **Advanced Optimization**: Multi-objective optimization with passenger impact
- **Real-time Integration**: Connect to actual railway APIs when available
- **Machine Learning**: Historical pattern analysis for better predictions
- **Mobile Interface**: Field-ready mobile app for section controllers

## 🤝 Contributing

This is a hackathon prototype. For production deployment, consider:
- Database integration for persistent state
- Authentication and authorization
- Comprehensive testing suite
- Performance optimization for larger networks
- Integration with existing railway systems

---

**Built with ❤️ for Indian Railways modernization**
