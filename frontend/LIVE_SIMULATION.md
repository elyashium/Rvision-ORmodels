# Live Train Simulation Feature

## Overview
The R-Vision application now includes a comprehensive live train simulation feature that creates a realistic, time-based visualization of train movements across the railway network.

## How It Works

### 1. Data Sources
- **`network_graph.json`**: Defines the railway infrastructure (stations, tracks, routes)
- **`schedule.json`**: Contains train schedules, departure/arrival times, and delays

### 2. Core Components

#### `useTrainSimulation` Hook (`/src/hooks/useTrainSimulation.js`)
- Manages simulation state (trains, time, speed, network data)
- Preprocesses train data and converts schedule times to Date objects
- Implements the core `calculateTrainPosition` function for real-time positioning
- Provides simulation controls (start, stop, reset, speed adjustment)

#### Enhanced `NetworkGraph` Component
- Visualizes trains as moving triangular icons on the network
- Color-codes trains based on status:
  - **Gray**: Scheduled (not yet departed)
  - **Green**: En-Route (on time)
  - **Orange**: Delayed
  - **Blue**: Arrived
- Updates train positions in real-time during simulation

#### `SimulationControls` Component
- Provides live simulation controls (play/pause/reset)
- Allows speed adjustment (100x to 5000x real-time)
- Shows simulation status and current simulation time

### 3. Simulation Logic

#### Time Progression
- Simulation starts at the earliest train departure time
- Time advances at configurable speed (default: 1000x real-time)
- Updates every 50ms for smooth animation

#### Train Position Calculation
For each train at any given simulation time:

1. **Before Departure**: Train shows at origin station
2. **After Arrival**: Train shows at destination station  
3. **En-Route**: Position calculated using linear interpolation:
   ```javascript
   const progress = (currentTime - departureTime) / (arrivalTime - departureTime)
   const position = startCoords + (endCoords - startCoords) * progress
   ```

#### Delay Handling
- Initial delays from `schedule.json` are applied to departure/arrival times
- Delayed trains are visually distinguished with orange coloring
- Delay information is shown in train tooltips

### 4. User Workflow

1. **Load Schedule**: Click "Load Schedule" button
   - Fetches `network_graph.json` and `schedule.json`
   - Initializes simulation with all trains
   - Sets simulation time to earliest departure

2. **Start Simulation**: Click play button
   - Begins time progression
   - Trains start moving according to schedules
   - Real-time position updates

3. **Control Simulation**:
   - Adjust speed (100x to 5000x real-time)
   - Pause/resume simulation
   - Reset to beginning

### 5. Technical Features

#### Performance Optimizations
- Efficient vis-network updates (remove/add nodes in batches)
- 50ms update interval for smooth animation
- No physics simulation for trains (fixed positioning)

#### Coordinate System
- Converts lat/lon from `network_graph.json` to 2D coordinates
- Fallback coordinate system for missing data
- Accurate geographical representation

#### Error Handling
- Graceful fallback to legacy simulation mode
- Handles missing station coordinates
- Robust error reporting in UI

### 6. Integration Points

#### With Existing Backend
- Maintains compatibility with existing API endpoints
- Falls back to legacy simulation if live mode fails
- Preserves all existing functionality

#### With Control Panel
- Seamlessly integrates live controls with existing UI
- Shows appropriate controls based on simulation mode
- Maintains consistent user experience

## File Structure
```
frontend/src/
├── hooks/
│   └── useTrainSimulation.js      # Core simulation logic
├── components/
│   ├── NetworkGraph.jsx           # Enhanced visualization
│   ├── SimulationControls.jsx     # Live simulation controls
│   └── ControlPanel.jsx           # Updated control panel
└── App.jsx                        # Main integration
```

## Future Enhancements
- Multi-hop route visualization
- Real-time disruption handling
- Advanced train conflict detection
- Historical playback features
- Export simulation data
