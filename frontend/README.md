# R-Vision Frontend

A sleek, professional React application for the R-Vision Intelligent Rail Optimization System. This frontend provides a modern control center interface for railway operators to visualize networks, report disruptions, and receive AI-powered optimization recommendations.

## Features

### 🚂 **Railway Network Visualization**
- Interactive network graph using vis-network
- Real-time train position tracking
- Station and track status visualization
- Fullscreen and zoom controls
- Color-coded elements for different station types and track conditions

### 🎛️ **Control Panel**
- Schedule upload and initialization
- Simulation start/stop controls
- Disruption reporting with detailed modal
- System status monitoring
- Real-time metrics display

### 🤖 **AI Recommendations**
- Real-time optimization suggestions
- Impact analysis and confidence scores
- Accept/reject recommendation actions
- Detailed AI reasoning display

### 📊 **Alerts & Monitoring**
- Real-time alert feed
- Event categorization (info, warning, error, success)
- Timestamp tracking
- System health indicators

## Design Philosophy

### **Modern Control Center Aesthetic**
- **Dark Theme**: Deep blues and blacks for professional look
- **Subtle Glows**: Rail-blue accents with shadow effects
- **Clean Typography**: JetBrains Mono for technical precision
- **Intuitive Layout**: Logical information hierarchy
- **Responsive Design**: Fluid across different screen sizes

### **Color Palette**
- `rail-dark`: #0a0f1c (Primary background)
- `rail-darker`: #050914 (Secondary background)
- `rail-blue`: #1e3a8a (Primary accent)
- `rail-light-blue`: #3b82f6 (Interactive elements)
- `rail-accent`: #06b6d4 (Highlights)
- `rail-success`: #10b981 (Success states)
- `rail-warning`: #f59e0b (Warning states)
- `rail-danger`: #ef4444 (Error states)

## Getting Started

### Prerequisites
- Node.js 18+ (Note: some warnings about engine compatibility are expected but don't affect functionality)
- R-Vision Backend running on `http://localhost:5001`

### Installation

```bash
# Navigate to the frontend directory
cd r-vision-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

### Backend Integration

Ensure the R-Vision backend is running:

```bash
# In the root project directory
python app.py
```

The backend should be accessible at `http://localhost:5001`

## Usage Guide

### 1. **System Initialization**
1. Click "Load Schedule" to initialize the railway network
2. Wait for the system to load train data and network topology
3. Verify system status shows "Healthy" with active trains

### 2. **Start Simulation**
1. After loading schedule, click "Start Simulation"
2. Watch trains move along their routes in real-time
3. Monitor system metrics in the header

### 3. **Report Disruptions**
1. Click "Report Disruption" in the control panel
2. Select affected train from dropdown
3. Choose event type (delay, track failure, etc.)
4. Enter delay duration and optional details
5. Submit to trigger AI optimization

### 4. **AI Recommendations**
1. After reporting a disruption, check the "AI Recommendations" tab
2. Review the optimization suggestion and impact analysis
3. Accept the recommendation or choose manual override
4. Monitor the results in the alerts feed

### 5. **Network Visualization**
- **Zoom**: Use zoom controls or mouse wheel
- **Pan**: Click and drag to move around
- **Fullscreen**: Click fullscreen button for detailed view
- **Train Tracking**: Active trains show as red triangles moving along routes
- **Station Types**: Different shapes indicate station importance
- **Track Status**: Line colors show track types and conditions

## Component Architecture

```
src/
├── components/
│   ├── AlertsAndRecommendations.jsx  # Alerts and AI recommendations
│   ├── ControlPanel.jsx              # System controls and status
│   ├── DisruptionModal.jsx           # Disruption reporting form
│   └── NetworkGraph.jsx              # Network visualization
├── services/
│   └── apiService.js                 # Backend API integration
├── App.jsx                           # Main application layout
├── App.css                           # Custom component styles
└── index.css                         # Global styles and theme
```

## API Integration

The frontend integrates with the following backend endpoints:

- `GET /api/state` - Current network state
- `GET /api/trains` - All train information
- `GET /api/system-info` - System configuration
- `POST /api/report-event` - Report train disruptions
- `POST /api/reset` - Reset simulation
- `POST /api/accept-recommendation` - Accept AI recommendations

## Customization

### **Theme Colors**
Modify colors in `tailwind.config.js` under the `extend.colors` section.

### **Network Layout**
Update station positions and track connections in `NetworkGraph.jsx` within the `getNetworkData()` function.

### **Animation Speed**
Adjust train movement speed by modifying the timing in the `getTrainPosition()` function.

## Troubleshooting

### **Backend Connection Issues**
- Ensure Flask backend is running on port 5001
- Check browser console for CORS errors
- Verify `API_BASE_URL` in `apiService.js`

### **Network Graph Not Loading**
- Check vis-network dependency installation
- Verify network container ref is properly attached
- Look for JavaScript errors in browser console

### **Styling Issues**
- Ensure Tailwind CSS is properly configured
- Check that custom CSS classes are defined in `index.css`
- Verify PostCSS configuration

## Development Notes

### **Performance Considerations**
- Network graph physics disabled for better performance
- Train position updates throttled to prevent excessive re-renders
- Alert and recommendation arrays limited to prevent memory bloat

### **Browser Compatibility**
- Tested on Chrome, Firefox, and Edge
- Requires modern JavaScript features (ES6+)
- CSS Grid and Flexbox used extensively

### **Future Enhancements**
- WebSocket integration for real-time updates
- More sophisticated train animation along actual track paths
- Advanced filtering and search capabilities
- Export functionality for reports and visualizations

## Contributing

When contributing to the frontend:

1. Follow the established naming conventions
2. Maintain the dark theme aesthetic
3. Ensure responsive design principles
4. Add appropriate error handling
5. Update this README for new features

## License

This project is part of the R-Vision hackathon submission and follows the same license as the main project.