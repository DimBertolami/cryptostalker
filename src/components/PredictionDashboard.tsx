import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import PredictionChart from './PredictionChart';
import PredictionControls from './PredictionControls';
import PredictionStatus from './PredictionStatus';
import TradingPerformance from './TradingPerformance';
import { fetchPredictionStatus } from './predictionApi';

const PredictionDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [selectedExchange, setSelectedExchange] = useState('binance');
  const [timeframe, setTimeframe] = useState('1h');
  const [predictionData, setPredictionData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        const status = await fetchPredictionStatus();
        setModelStatus(status);
      } catch (error) {
        console.error('Error loading prediction status:', error);
        toast.error('Failed to load prediction status');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  const handleExchangeChange = (exchange: string) => {
    setSelectedExchange(exchange);
  };

  const handleTimeframeChange = (tf: string) => {
    setTimeframe(tf);
  };

  return (
    <div className="space-y-6">
      {/* Add PredictionStatus component at the top */}
      <PredictionStatus 
        isLoading={isLoading} 
        modelStatus={modelStatus} 
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Controls */}
        <div className="lg:col-span-1 space-y-6">
          <PredictionControls
            selectedSymbol={selectedSymbol}
            selectedExchange={selectedExchange}
            timeframe={timeframe}
            onSymbolChange={handleSymbolChange}
            onExchangeChange={handleExchangeChange}
            onTimeframeChange={handleTimeframeChange}
            isModelInitialized={modelStatus?.model_info?.initialized || false}
          />
        </div>

        {/* Right column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          <PredictionChart 
            predictionData={predictionData}
            symbol={selectedSymbol}
            exchange={selectedExchange}
            timeframe={timeframe}
          />
          <TradingPerformance 
            performanceData={performanceData}
            symbol={selectedSymbol}
          />
        </div>
      </div>
    </div>
  );
};

export default PredictionDashboard;
