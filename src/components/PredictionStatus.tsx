import React from 'react';

interface PredictionStatusProps {
  isLoading: boolean;
  modelStatus: any;
}

const PredictionStatus: React.FC<PredictionStatusProps> = ({ isLoading, modelStatus }) => {
  if (isLoading) {
    return (
      <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Model Status</h3>
        <div className="flex items-center justify-center p-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <span className="ml-2">Loading model status...</span>
        </div>
      </div>
    );
  }

  if (!modelStatus) {
    return (
      <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Model Status</h3>
        <div className="text-center p-4 text-red-500">
          <p>Failed to load model status</p>
        </div>
      </div>
    );
  }

  // Extract values from the model status
  const isInitialized = modelStatus.initialized || false;
  const lastTraining = modelStatus.last_trained || modelStatus.last_training || 'Never';
  const lastPrediction = modelStatus.last_prediction ? new Date(modelStatus.last_prediction).toLocaleString() : 'Never';
  const modelType = modelStatus.model_type || 'Unknown';
  const trained = modelStatus.trained || false;
  
  // Get prediction action and confidence if available
  const predictionAction = modelStatus.prediction?.action || null;
  const predictionConfidence = modelStatus.prediction?.confidence || null;

  return (
    <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Model Status</h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Model Initialized</span>
          <span className={`px-2 py-1 rounded text-xs ${isInitialized ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {isInitialized ? 'Yes' : 'No'}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Last Training</span>
          <span className="text-sm">{lastTraining}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Last Prediction</span>
          <span className="text-sm">{lastPrediction}</span>
        </div>
        
        {predictionAction && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Latest Signal</span>
            <span className={`px-2 py-1 rounded text-xs ${
              predictionAction === 'BUY' ? 'bg-green-900 text-green-300' : 
              predictionAction === 'SELL' ? 'bg-red-900 text-red-300' : 
              'bg-yellow-900 text-yellow-300'
            }`}>
              {predictionAction} {predictionConfidence !== null && predictionConfidence !== undefined ? `(${(predictionConfidence * 100).toFixed(0)}%)` : ''}
            </span>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-neutral-700">
          <h4 className="text-sm font-medium mb-2">Model Configuration</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Model Type</span>
              <span className="text-sm">{modelType}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Trained</span>
              <span className={`px-2 py-1 rounded text-xs ${trained ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`}>
                {trained ? 'Yes' : 'No'}
              </span>
            </div>
            
            {modelStatus.symbols_available && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Available Symbols</span>
                <span className="text-sm">{modelStatus.symbols_available.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionStatus;
