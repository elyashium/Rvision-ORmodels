import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[200px] bg-rail-gray/10 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <AlertTriangle className="w-12 h-12 text-rail-danger mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-rail-text mb-2">
              Network Visualization Error
            </h2>
            <p className="text-sm text-rail-text-secondary mb-4">
              There was an issue rendering the network graph. This might be due to network data loading issues.
            </p>
            
            {this.props.showDetails && this.state.error && (
              <details className="text-xs text-left mb-4 p-2 bg-rail-gray/20 rounded">
                <summary className="cursor-pointer font-medium">Error Details</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            
            <button
              onClick={this.handleReset}
              className="rail-button-primary flex items-center space-x-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry</span>
            </button>
            
            <p className="text-xs text-rail-text-secondary mt-3">
              If the problem persists, try refreshing the page or reloading the schedule data.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

