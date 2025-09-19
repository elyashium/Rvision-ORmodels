import React, { useState } from 'react';
import { 
  Brain, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  TrendingUp, 
  Target,
  Zap,
  Scale,
  AlertTriangle,
  ArrowRight,
  Play,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const MultiStrategySimulation = ({ 
  simulations, 
  onImplementStrategy,
  isImplementing = false 
}) => {
  const [expandedStrategy, setExpandedStrategy] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  if (!simulations || Object.keys(simulations).length === 0) {
    return (
      <div className="rail-card">
        <div className="p-6 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-rail-text-secondary opacity-50" />
          <h3 className="text-lg font-semibold text-rail-text mb-2">
            Multi-Strategy Analysis
          </h3>
          <p className="text-rail-text-secondary">
            Report a disruption to see comparative optimization strategies
          </p>
        </div>
      </div>
    );
  }

  const getStrategyIcon = (strategyKey) => {
    switch (strategyKey) {
      case 'punctuality':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'throughput':
        return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'balanced':
      default:
        return <Scale className="w-5 h-5 text-purple-600" />;
    }
  };

  const getStrategyColor = (strategyKey) => {
    switch (strategyKey) {
      case 'punctuality':
        return 'border-blue-200 bg-blue-50';
      case 'throughput':
        return 'border-green-200 bg-green-50';
      case 'balanced':
      default:
        return 'border-purple-200 bg-purple-50';
    }
  };

  const getActionTypeIcon = (actionType) => {
    switch (actionType) {
      case 'Halt':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'Reroute':
        return <ArrowRight className="w-4 h-4 text-blue-600" />;
      case 'SpeedAdjust':
        return <Zap className="w-4 h-4 text-yellow-600" />;
      case 'Cancel':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleImplementStrategy = (strategyKey, strategy) => {
    setSelectedStrategy(strategyKey);
    
    if (strategy.recommendation && onImplementStrategy) {
      onImplementStrategy({
        strategy: strategyKey,
        recommendation: strategy.recommendation,
        strategyName: strategy.strategy_name
      });
    }
  };

  const toggleExpanded = (strategyKey) => {
    setExpandedStrategy(expandedStrategy === strategyKey ? null : strategyKey);
  };

  return (
    <div className="rail-card">
      <div className="p-4 border-b border-rail-gray">
        <div className="flex items-center space-x-3">
          <Brain className="w-6 h-6 text-rail-info" />
          <div>
            <h3 className="text-lg font-semibold text-rail-text">
              Multi-Strategy AI Analysis
            </h3>
            <p className="text-sm text-rail-text-secondary">
              Compare different optimization approaches for the current disruption
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {Object.entries(simulations).map(([strategyKey, strategy]) => (
          <div
            key={strategyKey}
            className={`border rounded-lg transition-all duration-200 ${getStrategyColor(strategyKey)} ${
              selectedStrategy === strategyKey ? 'ring-2 ring-blue-300' : ''
            }`}
          >
            {/* Strategy Header */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStrategyIcon(strategyKey)}
                  <div>
                    <h4 className="font-semibold text-rail-text">
                      {strategy.strategy_name || strategyKey.charAt(0).toUpperCase() + strategyKey.slice(1)}
                    </h4>
                    <p className="text-sm text-rail-text-secondary">
                      {strategy.strategy_description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleExpanded(strategyKey)}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                >
                  {expandedStrategy === strategyKey ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Status and Quick Info */}
              {strategy.status === 'ConflictFound' && strategy.recommendation && (
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getActionTypeIcon(strategy.recommendation.action?.action_type)}
                    <span className="text-sm font-medium text-rail-text">
                      {strategy.recommendation.recommendation_text}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                      getConfidenceColor(strategy.recommendation.confidence)
                    }`}>
                      {strategy.recommendation.confidence} Confidence
                    </span>
                    <span className="text-xs text-rail-text-secondary">
                      Score: {strategy.recommendation.score}
                    </span>
                  </div>
                </div>
              )}

              {strategy.status === 'NoConflict' && (
                <div className="mt-3 flex items-center space-x-2 text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">No conflicts detected</span>
                </div>
              )}
            </div>

            {/* Expanded Details */}
            {expandedStrategy === strategyKey && (
              <div className="border-t bg-white/50 p-4 space-y-4">
                {strategy.status === 'ConflictFound' && strategy.benefits_drawbacks && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Benefits */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-green-700 flex items-center space-x-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Benefits</span>
                      </h5>
                      <ul className="space-y-1">
                        {strategy.benefits_drawbacks.benefits.map((benefit, index) => (
                          <li key={index} className="text-sm text-rail-text-secondary flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 flex-shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Drawbacks */}
                    <div className="space-y-2">
                      <h5 className="font-medium text-red-700 flex items-center space-x-2">
                        <XCircle className="w-4 h-4" />
                        <span>Drawbacks</span>
                      </h5>
                      <ul className="space-y-1">
                        {strategy.benefits_drawbacks.drawbacks.map((drawback, index) => (
                          <li key={index} className="text-sm text-rail-text-secondary flex items-start space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                            <span>{drawback}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Reasoning */}
                {strategy.recommendation?.reasoning && (
                  <div className="bg-rail-light-gray rounded-lg p-3">
                    <h5 className="font-medium text-rail-text mb-2">AI Reasoning</h5>
                    <p className="text-sm text-rail-text-secondary">
                      {strategy.recommendation.reasoning}
                    </p>
                  </div>
                )}

                {/* Action Details */}
                {strategy.recommendation?.action && (
                  <div className="bg-white rounded-lg border p-3">
                    <h5 className="font-medium text-rail-text mb-2">Action Details</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-rail-text-secondary">Action Type:</span>
                        <span className="ml-2 font-medium">{strategy.recommendation.action.action_type}</span>
                      </div>
                      <div>
                        <span className="text-rail-text-secondary">Train ID:</span>
                        <span className="ml-2 font-medium">{strategy.recommendation.action.train_id}</span>
                      </div>
                      {strategy.recommendation.action.duration_mins > 0 && (
                        <div>
                          <span className="text-rail-text-secondary">Duration:</span>
                          <span className="ml-2 font-medium">{strategy.recommendation.action.duration_mins} minutes</span>
                        </div>
                      )}
                      {strategy.recommendation.action.alternative_route && (
                        <div>
                          <span className="text-rail-text-secondary">Route Type:</span>
                          <span className="ml-2 font-medium">{strategy.recommendation.action.alternative_route.route_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Implement Button */}
                {strategy.status === 'ConflictFound' && strategy.recommendation && (
                  <div className="pt-2">
                    <button
                      onClick={() => handleImplementStrategy(strategyKey, strategy)}
                      disabled={isImplementing}
                      className={`w-full rail-button-primary flex items-center justify-center space-x-2 ${
                        selectedStrategy === strategyKey ? 'bg-blue-600 hover:bg-blue-700' : ''
                      } ${isImplementing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Play className="w-4 h-4" />
                      <span>
                        {isImplementing && selectedStrategy === strategyKey 
                          ? 'Implementing...' 
                          : `Implement ${strategy.strategy_name}`
                        }
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-rail-gray p-4 bg-rail-light-gray/30">
        <div className="flex justify-between items-center text-sm">
          <span className="text-rail-text-secondary">
            {Object.keys(simulations).length} strategies analyzed
          </span>
          <span className="text-rail-text-secondary">
            Select a strategy to implement the recommended solution
          </span>
        </div>
      </div>
    </div>
  );
};

export default MultiStrategySimulation;
