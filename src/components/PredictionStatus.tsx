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

  const modelInfo = modelStatus.model_info || {};
  const isInitialized = modelInfo.model_initialized || false;
  const lastTraining = modelInfo.last_training_time ? new Date(modelInfo.last_training_time).toLocaleString() : 'Never';
  const trainingStatus = modelInfo.training_status || {};
  const isTraining = trainingStatus.is_training || false;
  const trainingProgress = trainingStatus.progress || 0;
  const lastPrediction = modelInfo.last_prediction_time ? new Date(modelInfo.last_prediction_time).toLocaleString() : 'Never';

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
        
        {isTraining && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Training Progress</span>
              <span>{trainingProgress}%</span>
            </div>
            <div className="w-full bg-background rounded-full h-2.5">
              <div 
                className="bg-primary h-2.5 rounded-full" 
                style={{ width: `${trainingProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {modelInfo.model_type && (
          <div className="mt-4 pt-4 border-t border-neutral-700">
            <h4 className="text-sm font-medium mb-2">Model Configuration</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Model Type</span>
                <span className="text-sm">{modelInfo.model_type}</span>
              </div>
              
              {modelInfo.actor_layers && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Actor Layers</span>
                  <span className="text-sm">{modelInfo.actor_layers.join(', ')}</span>
                </div>
              )}
              
              {modelInfo.critic_layers && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Critic Layers</span>
                  <span className="text-sm">{modelInfo.critic_layers.join(', ')}</span>
                </div>
              )}
              
              {modelInfo.learning_rate && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Learning Rate</span>
                  <span className="text-sm">{modelInfo.learning_rate}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionStatus;
