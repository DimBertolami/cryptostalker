import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { fetchExchanges, trainModel, executePredictionSignal, initializeModel, fetchPredictionStatus } from './predictionApi';
// These types are used in the function parameters
// import { TrainingParams, SignalExecutionParams } from '../types/prediction';

interface PredictionControlsProps {
  selectedSymbol: string;
  selectedExchange: string;
  timeframe: string;
  onSymbolChange: (symbol: string) => void;
  onExchangeChange: (exchange: string) => void;
  onTimeframeChange: (timeframe: string) => void;
  isModelInitialized: boolean;
}

const PredictionControls: React.FC<PredictionControlsProps> = ({
  selectedSymbol,
  selectedExchange,
  timeframe,
  onSymbolChange,
  onExchangeChange,
  onTimeframeChange,
  isModelInitialized
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [exchanges, setExchanges] = useState<string[]>([]);
  const [symbols, setSymbols] = useState<string[]>(['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'ADA/USDT']);
  const [isTraining, setIsTraining] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [customSymbol, setCustomSymbol] = useState('');
  const [showCustomSymbol, setShowCustomSymbol] = useState(false);

  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

  useEffect(() => {
    const loadExchanges = async () => {
      try {
        setIsLoading(true);
        const data = await fetchExchanges();
        
        // The CCXT endpoint returns an array of exchange IDs directly
        if (Array.isArray(data)) {
          console.log('Exchanges loaded successfully:', data.length);
          setExchanges(data);
          
          // Set a default exchange if we have exchanges and none is selected
          if (data.length > 0 && !selectedExchange) {
            // Prefer popular exchanges if available
            const preferredExchanges = ['binance', 'coinbase', 'kraken'];
            const defaultExchange = preferredExchanges.find(e => data.includes(e)) || data[0];
            onExchangeChange(defaultExchange);
          }
        } else {
          console.error('Unexpected exchange data format:', data);
          toast.error('Invalid exchange data format');
        }
      } catch (error) {
        console.error('Error loading exchanges:', error);
        toast.error('Failed to load exchanges');
      } finally {
        setIsLoading(false);
      }
    };

    loadExchanges();
  }, [selectedExchange, onExchangeChange]);
  
  // Check model status when component mounts or when exchange/symbol changes
  useEffect(() => {
    const checkModelStatus = async () => {
      if (selectedExchange && selectedSymbol) {
        try {
          const status = await fetchPredictionStatus();
          console.log('Model status:', status);
          
          if (!status.initialized) {
            console.log('Model not initialized, initializing...');
            try {
              await initializeModel({
                exchange_id: selectedExchange,
                symbol: selectedSymbol
              });
              console.log('Model initialized successfully');
              // No need to update isModelInitialized here as we'll check status again
            } catch (error) {
              console.error('Error initializing model:', error);
              toast.error('Failed to initialize model');
            }
          }
        } catch (error) {
          console.error('Error checking model status:', error);
        }
      }
    };
    
    checkModelStatus();
  }, [selectedExchange, selectedSymbol]);

  const handleTrainModel = async () => {
    try {
      setIsTraining(true);
      toast.loading('Starting model training...', { id: 'training' });
      
      await trainModel({
        // Using TrainingParams type from our types file
        exchange_id: selectedExchange,
        symbol: selectedSymbol,
        timeframe: timeframe,
        limit: 1000,
        epochs: 50
      });
      
      toast.success('Model training started successfully', { id: 'training' });
      
      // Poll for training status
      const intervalId = setInterval(async () => {
        try {
          const statusResponse = await fetch('/api/prediction/status');
          const statusData = await statusResponse.json();
          
          if (statusData?.model_info?.training_status) {
            const trainingStatus = statusData.model_info.training_status;
            
            if (!trainingStatus.is_training) {
              clearInterval(intervalId);
              setIsTraining(false);
              
              if (trainingStatus.error) {
                toast.error(`Training failed: ${trainingStatus.error}`);
              } else {
                toast.success('Model training completed successfully');
              }
            } else {
              toast.loading(`Training in progress: ${trainingStatus.progress}%`, { id: 'training' });
            }
          }
        } catch (error) {
          console.error('Error checking training status:', error);
        }
      }, 5000);
      
      // Clear interval after 30 minutes (failsafe)
      setTimeout(() => {
        clearInterval(intervalId);
        setIsTraining(false);
      }, 30 * 60 * 1000);
      
    } catch (error) {
      console.error('Error training model:', error);
      toast.error('Failed to start model training', { id: 'training' });
      setIsTraining(false);
    }
  };

  const handleExecuteSignal = async () => {
    try {
      setIsExecuting(true);
      
      const response = await executePredictionSignal({
        // Using SignalExecutionParams type from our types file
        exchange_id: selectedExchange,
        symbol: selectedSymbol
      });
      
      if (response.status === 'ok') {
        toast.success('Trading signal executed successfully');
      } else {
        toast.error(`Failed to execute signal: ${response.message}`);
      }
    } catch (error) {
      console.error('Error executing signal:', error);
      toast.error('Failed to execute trading signal');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddCustomSymbol = () => {
    if (customSymbol && !symbols.includes(customSymbol)) {
      setSymbols([...symbols, customSymbol]);
      onSymbolChange(customSymbol);
      setCustomSymbol('');
      setShowCustomSymbol(false);
    }
  };

  return (
    <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6">
      <h3 className="text-lg font-medium mb-4">Prediction Controls</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Exchange</label>
          <select
            className="w-full bg-background border border-neutral-700 rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedExchange}
            onChange={(e) => onExchangeChange(e.target.value)}
            disabled={isLoading}
          >
            {exchanges.length === 0 && <option value="">Loading exchanges...</option>}
            {exchanges.map((exchange) => (
              <option key={exchange} value={exchange}>{exchange}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Symbol</label>
          <div className="flex space-x-2">
            <select
              className="flex-1 bg-background border border-neutral-700 rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedSymbol}
              onChange={(e) => onSymbolChange(e.target.value)}
            >
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            <button
              className="px-3 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
              onClick={() => setShowCustomSymbol(!showCustomSymbol)}
            >
              {showCustomSymbol ? 'Cancel' : 'Add'}
            </button>
          </div>
          
          {showCustomSymbol && (
            <div className="mt-2 flex space-x-2">
              <input
                type="text"
                className="flex-1 bg-background border border-neutral-700 rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter symbol (e.g. BTC/USDT)"
                value={customSymbol}
                onChange={(e) => setCustomSymbol(e.target.value)}
              />
              <button
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                onClick={handleAddCustomSymbol}
              >
                Add
              </button>
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Timeframe</label>
          <select
            className="w-full bg-background border border-neutral-700 rounded p-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={timeframe}
            onChange={(e) => onTimeframeChange(e.target.value)}
          >
            {timeframes.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
        </div>
        
        <div className="pt-4 space-y-3">
          <button
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition flex items-center justify-center"
            onClick={handleTrainModel}
            disabled={isTraining || !selectedExchange || !selectedSymbol}
          >
            {isTraining ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Training Model...
              </>
            ) : (
              'Train Model'
            )}
          </button>
          
          <button
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center justify-center"
            onClick={handleExecuteSignal}
            disabled={isExecuting || !isModelInitialized || !selectedExchange || !selectedSymbol}
          >
            {isExecuting ? (
              <>
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></span>
                Executing Signal...
              </>
            ) : (
              'Execute Signal'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PredictionControls;
