import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Scatter,
  ComposedChart, Area
} from 'recharts';
import { fetchPrediction, fetchHistoricalData } from './predictionApi';
import { ChartDataPoint, PredictionResult, HistoricalDataPoint } from '../types/prediction';

interface PredictionChartProps {
  predictionData?: PredictionResult;
  symbol: string;
  exchange: string;
  timeframe: string;
}

const PredictionChart: React.FC<PredictionChartProps> = ({ 
  symbol, exchange, timeframe 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Log parameter values before fetching historical data
        console.log('PredictionChart: fetchHistoricalData params', {
          exchange_id: exchange,
          symbol,
          timeframe,
          limit: 100
        });
        // Fetch historical price data using named parameters
        const historicalData = await fetchHistoricalData({
          exchange_id: exchange,
          symbol,
          timeframe,
          limit: 100
        });
        
        // Format data for chart with correct type
        const formattedData: ChartDataPoint[] = historicalData.map((item: HistoricalDataPoint) => ({
          timestamp: new Date(item.timestamp).getTime(),
          date: new Date(item.timestamp).toLocaleString(),
          price: item.close,
          volume: item.volume,
        }));
        
        setChartData(formattedData);

        // Get latest prediction
        const predictionResult = await fetchPrediction(exchange, symbol, timeframe);
        setPrediction(predictionResult);

        // Add prediction to chart data
        if (predictionResult && formattedData.length > 0) {
          const lastDataPoint = formattedData[formattedData.length - 1];
          const signalText = predictionResult.signal_text;
          const confidence = predictionResult.confidence;
          
          // Add prediction marker to the last data point
          formattedData[formattedData.length - 1] = {
            ...lastDataPoint,
            prediction: predictionResult.prediction,
            signal: signalText,
            confidence: confidence,
            signalValue: signalText === 'BUY' ? lastDataPoint.price : 
                         signalText === 'SELL' ? lastDataPoint.price : null
          };
        }
      } catch (err) {
        console.error('Error loading chart data:', err);
        setError('Failed to load chart data');
        toast.error('Failed to load prediction data');
      } finally {
        setIsLoading(false);
      }
    };

    if (symbol && exchange && timeframe) {
      loadData();
    }
  }, [symbol, exchange, timeframe]);

  const renderPredictionTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.signal) {
        return (
          <div className="bg-background-lighter p-3 border border-neutral-700 rounded shadow-lg">
            <p className="text-sm font-medium">{data.date}</p>
            <p className="text-sm">Price: ${data.price.toFixed(2)}</p>
            <p className="text-sm">Signal: {data.signal}</p>
            <p className="text-sm">Confidence: {(data.confidence * 100).toFixed(1)}%</p>
          </div>
        );
      }
      
      return (
        <div className="bg-background-lighter p-3 border border-neutral-700 rounded shadow-lg">
          <p className="text-sm font-medium">{data.date}</p>
          <p className="text-sm">Price: ${data.price.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2">Loading prediction data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6 h-96 flex items-center justify-center">
        <p>No data available for {symbol} on {exchange}</p>
      </div>
    );
  }

  // Determine colors based on prediction
  const signalColor = prediction?.signal_text === 'BUY' ? '#4ade80' : 
                      prediction?.signal_text === 'SELL' ? '#f87171' : 
                      '#94a3b8';

  return (
    <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{symbol} Price Prediction</h3>
        {prediction && (
          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 rounded text-sm" 
                 style={{ backgroundColor: signalColor + '33', color: signalColor }}>
              Signal: {prediction.signal_text}
            </div>
            <div className="text-sm">
              Confidence: {prediction.confidence ? `${(prediction.confidence * 100).toFixed(1)}%` : 'N/A'}
            </div>
          </div>
        )}
      </div>
      
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="timestamp" 
              type="number"
              domain={['auto', 'auto']}
              scale="time"
              tickFormatter={(timestamp: number) => new Date(timestamp).toLocaleDateString()}
            />
            <YAxis 
              yAxisId="left"
              domain={['auto', 'auto']}
              tickFormatter={(value: number) => `$${value.toFixed(0)}`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, 'auto']}
              tickFormatter={(value: number) => `${value.toLocaleString()}`}
            />
            <Tooltip content={renderPredictionTooltip} />
            <Legend />
            <Line 
              yAxisId="left"
              type="monotone" 
              dataKey="price" 
              stroke="#3b82f6" 
              dot={false}
              name="Price"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="volume"
              fill="#6366f1"
              stroke="#6366f1"
              fillOpacity={0.2}
              name="Volume"
            />
            <Scatter 
              yAxisId="left"
              dataKey="signalValue" 
              fill={signalColor}
              shape={(props: any): React.ReactElement | null => {
                const { cx, cy, payload } = props;
                if (!payload.signal) return null;
                
                // Triangle pointing up for buy, down for sell
                if (payload.signal === 'BUY') {
                  return (
                    <path 
                      d={`M${cx},${cy-10} L${cx+7},${cy} L${cx-7},${cy} Z`} 
                      fill="#4ade80" 
                      stroke="#22c55e"
                      strokeWidth={1}
                    />
                  );
                } else if (payload.signal === 'SELL') {
                  return (
                    <path 
                      d={`M${cx},${cy+10} L${cx+7},${cy} L${cx-7},${cy} Z`} 
                      fill="#f87171" 
                      stroke="#ef4444"
                      strokeWidth={1}
                    />
                  );
                }
                return null;
              }}
              name="Signal"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      
      {prediction && (
        <div className="mt-4 p-4 border border-neutral-700 rounded bg-background">
          <h4 className="font-medium mb-2">Technical Indicators</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-400">Signal</p>
              <p className="font-medium" style={{ color: signalColor }}>{prediction.signal_text}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Confidence</p>
              <p className="font-medium">{prediction.confidence ? `${(prediction.confidence * 100).toFixed(1)}%` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Timestamp</p>
              <p className="font-medium">{new Date(prediction.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionChart;
