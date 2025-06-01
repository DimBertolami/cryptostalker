import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import PredictionChart from './PredictionChart';
import PredictionControls from './PredictionControls';
import PredictionStatus from './PredictionStatus';
import TradingPerformance from './TradingPerformance';
import { fetchPredictionStatus } from './predictionApi';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

type PredictionData = {
  timestamps: string[];
  prices: number[];
};

type ModelType = 'transformer' | 'hybrid' | 'tft';
type Timeframe = '1h' | '4h' | '1d';

const fetchPrediction = async (
  symbol: string, 
  modelType: ModelType,
  timeframe: Timeframe,
  predictionLength: number
): Promise<PredictionData> => {
  const response = await fetch(
    `/api/prediction/${symbol}?` +
    `model_type=${modelType}&` +
    `timeframe=${timeframe}&` +
    `prediction_length=${predictionLength}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch prediction');
  }
  
  const data = await response.json();
  return data.predictions;
};

const PredictionDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USDT');
  const [selectedExchange, setSelectedExchange] = useState('binance');
  const [timeframe, setTimeframe] = useState('1h');
  const [predictionData, setPredictionData] = useState<any>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [modelType, setModelType] = useState<ModelType>('transformer');
  const [predictionLength, setPredictionLength] = useState(24);

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

  const handleModelTypeChange = (modelType: ModelType) => {
    setModelType(modelType);
  };

  const handlePredictionLengthChange = (length: number) => {
    setPredictionLength(length);
  };

  const { data, error, isLoading: isPredictionLoading, refetch } = useQuery<PredictionData>({
    queryKey: ['prediction', selectedSymbol, modelType, timeframe, predictionLength],
    queryFn: () => fetchPrediction(selectedSymbol, modelType, timeframe, predictionLength),
    enabled: false
  });

  useEffect(() => {
    refetch();
  }, [selectedSymbol, modelType, timeframe, predictionLength, refetch]);

  const chartData = data?.timestamps.map((timestamp, i) => ({
    timestamp,
    price: data.prices[i]
  })) || [];

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
          <select 
            value={modelType} 
            onChange={(e) => handleModelTypeChange(e.target.value as ModelType)}
          >
            <option value="transformer">Transformer Model</option>
            <option value="hybrid">Hybrid CNN-LSTM</option>
            <option value="tft">Temporal Fusion Transformer</option>
          </select>
          <input 
            type="number" 
            min="1" 
            max="168" 
            value={predictionLength}
            onChange={(e) => handlePredictionLengthChange(Number(e.target.value))}
          />
        </div>

        {/* Right column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
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
