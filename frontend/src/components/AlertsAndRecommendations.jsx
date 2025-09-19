import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X, 
  Clock, 
  TrendingUp, 
  Brain,
  ThumbsUp,
  ThumbsDown 
} from 'lucide-react';

const AlertsAndRecommendations = ({ 
  alerts, 
  recommendations, 
  onAcceptRecommendation, 
  onRejectRecommendation 
}) => {
  const [activeTab, setActiveTab] = useState('alerts');

  const getAlertIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-rail-danger" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-rail-warning" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-rail-success" />;
      case 'info':
      default:
        return <Info className="w-4 h-4 text-rail-info" />;
    }
  };

  const getAlertBgColor = (type) => {
    switch (type) {
      case 'error':
        return 'bg-rail-danger/10 border-rail-danger/30';
      case 'warning':
        return 'bg-rail-warning/10 border-rail-warning/30';
      case 'success':
        return 'bg-rail-success/10 border-rail-success/30';
      case 'info':
      default:
        return 'bg-rail-info/10 border-rail-info/30';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRecommendationPriority = (recommendation) => {
    if (recommendation.optimization_result?.recommendation?.priority) {
      return recommendation.optimization_result.recommendation.priority;
    }
    return 'medium';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-rail-danger border-rail-danger/30 bg-rail-danger/10';
      case 'medium':
        return 'text-rail-warning border-rail-warning/30 bg-rail-warning/10';
      case 'low':
      default:
        return 'text-rail-info border-rail-info/30 bg-rail-info/10';
    }
  };

  return (
    <div className="rail-card h-full flex flex-col">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between p-3 border-b border-rail-gray">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'alerts'
                ? 'bg-rail-danger text-white'
                : 'text-rail-text-secondary hover:text-rail-text hover:bg-rail-light-gray'
            }`}
          >
            Alerts ({alerts.length})
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'recommendations'
                ? 'bg-rail-info text-white'
                : 'text-rail-text-secondary hover:text-rail-text hover:bg-rail-light-gray'
            }`}
          >
            AI Recommendations ({recommendations.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'alerts' ? (
          <div className="p-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-rail-text-secondary">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No alerts to display</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-3 ${getAlertBgColor(alert.type)}`}
                  >
                    <div className="flex items-start space-x-3">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-rail-text">
                            {alert.message}
                          </p>
                          <span className="text-xs text-rail-text-secondary">
                            {formatTimestamp(alert.timestamp)}
                          </span>
                        </div>
                        {alert.details && (
                          <p className="text-xs text-rail-text-secondary mt-1">
                            {alert.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {recommendations.length === 0 ? (
              <div className="text-center py-8 text-rail-text-secondary">
                <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No AI recommendations available</p>
                <p className="text-xs mt-1">Report a disruption to receive optimization suggestions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recommendations.map((recommendation) => (
                  <div
                    key={recommendation.id}
                    className="border border-rail-gray rounded-lg p-3 bg-rail-light-gray/50"
                  >
                    {/* Recommendation Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Brain className="w-4 h-4 text-rail-info" />
                        <span className="text-sm font-semibold text-rail-text">
                          AI Recommendation
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          getPriorityColor(getRecommendationPriority(recommendation))
                        }`}>
                          {getRecommendationPriority(recommendation).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-xs text-rail-text-secondary">
                        {formatTimestamp(recommendation.timestamp)}
                      </span>
                    </div>

                    {/* Recommendation Content */}
                    {recommendation.optimization_result?.recommendation && (
                      <div className="space-y-3">
                        <div className="bg-rail-light-gray rounded-lg p-3">
                          <p className="text-sm text-rail-text font-medium mb-2">
                            Recommended Action:
                          </p>
                          <p className="text-sm text-rail-text-secondary">
                            {recommendation.optimization_result.recommendation.recommendation_text}
                          </p>
                        </div>

                        {/* Impact Metrics */}
                        {recommendation.optimization_result.recommendation.impact_analysis && (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/80 rounded-lg p-2 border border-rail-gray">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-rail-warning" />
                                <span className="text-xs text-rail-text-secondary">Delay Reduction</span>
                              </div>
                              <p className="text-sm font-semibold text-rail-text mt-1">
                                {recommendation.optimization_result.recommendation.impact_analysis.delay_reduction_mins || 'N/A'} min
                              </p>
                            </div>
                            <div className="bg-white/80 rounded-lg p-2 border border-rail-gray">
                              <div className="flex items-center space-x-2">
                                <TrendingUp className="w-4 h-4 text-rail-success" />
                                <span className="text-xs text-rail-text-secondary">Confidence</span>
                              </div>
                              <p className="text-sm font-semibold text-rail-text mt-1">
                                {recommendation.optimization_result.recommendation.confidence || 85}%
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-3 pt-2">
                          <button
                            onClick={() => onAcceptRecommendation(recommendation)}
                            className="flex-1 rail-button-primary bg-rail-success hover:bg-green-600 flex items-center justify-center space-x-2"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => onRejectRecommendation(recommendation)}
                            className="flex-1 rail-button-secondary hover:bg-rail-danger/20 flex items-center justify-center space-x-2"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            <span>Override</span>
                          </button>
                        </div>

                        {/* Additional Details */}
                        {recommendation.optimization_result.recommendation.reasoning && (
                          <details className="mt-3">
                            <summary className="text-xs text-rail-text-secondary cursor-pointer hover:text-rail-text">
                              View AI Reasoning
                            </summary>
                            <div className="mt-2 p-2 bg-rail-light-gray rounded text-xs text-rail-text-secondary">
                              {recommendation.optimization_result.recommendation.reasoning}
                            </div>
                          </details>
                        )}
                      </div>
                    )}

                    {/* Fallback for recommendations without detailed structure */}
                    {!recommendation.optimization_result?.recommendation && (
                      <div className="text-sm text-rail-text-secondary">
                        <p>Optimization analysis completed for the reported disruption.</p>
                        <p className="text-xs text-rail-text-secondary mt-1">
                          Status: {recommendation.optimization_result?.status || 'Processed'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-rail-gray p-2">
        <div className="flex justify-between text-xs text-rail-text-secondary">
          <span>
            {activeTab === 'alerts' 
              ? `${alerts.length} alerts in system` 
              : `${recommendations.length} recommendations pending`
            }
          </span>
          <span>
            Last updated: {new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AlertsAndRecommendations;
