import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Scatter,
  ComposedChart, Area, ReferenceLine
} from 'recharts';
import { fetchPrediction, fetchHistoricalData } from './predictionApi';
import { PredictionResult, HistoricalDataPoint } from '../types/prediction';

// Define custom chart data point type that includes time property
interface ChartDataPoint {
  timestamp: number;
  date: string;
  price: number;
  volume: number;
  time: number;
  prediction?: PredictionResult;
  signal?: string;
  confidence?: number;
  signalValue?: number | null | undefined;
}

// Define types for technical indicator data
type BollingerBand = {
  time: number;
  upper: number;
  middle: number;
  lower: number;
};

type MACDData = {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
};

type MovingAverageData = {
  time: number;
  ma20: number;
  ma50: number;
  ma200: number;
};

type StochasticData = {
  time: number;
  k: number;
  d: number;
};

type VolumeProfileData = {
  price: number;
  volume: number;
};

type IchimokuData = {
  time: number;
  tenkan: number;
  kijun: number;
  senkouA: number;
  senkouB: number;
  chikou: number | null;
};

type FibonacciLevel = {
  level: number;
  value: number;
};

// Add type definition for Line props to include strokeDasharray
declare module 'recharts' {
  interface LineProps {
    strokeDasharray?: string;
  }
}

// Technical indicator calculation functions
const calculateBollingerBands = (data: HistoricalDataPoint[], period = 20, multiplier = 2) => {
  if (!data || data.length < period) return [];
  
  const result = [];
  
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const prices = slice.map(item => item.close);
    
    // Calculate SMA (middle band)
    const sma = prices.reduce((sum, price) => sum + price, 0) / period;
    
    // Calculate standard deviation
    const squaredDiffs = prices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / period;
    const stdDev = Math.sqrt(variance);
    
    // Calculate upper and lower bands
    const upperBand = sma + (multiplier * stdDev);
    const lowerBand = sma - (multiplier * stdDev);
    
    result.push({
      time: new Date(data[i].timestamp).getTime(),
      upper: upperBand,
      middle: sma,
      lower: lowerBand
    });
  }
  
  return result;
};

// Calculate RSI (Relative Strength Index)
const calculateRSI = (data: HistoricalDataPoint[], period = 14) => {
  if (!data || data.length < period + 1) return [];
  
  const result = [];
  const gains = [];
  const losses = [];
  
  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate initial average gain and loss
  let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
  
  // Calculate RSI for the first period
  let rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss); // Avoid division by zero
  let rsi = 100 - (100 / (1 + rs));
  
  result.push({
    time: new Date(data[period].timestamp).getTime(),
    value: rsi
  });
  
  // Calculate RSI for the remaining periods using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
    avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    
    rs = avgGain / (avgLoss === 0 ? 0.001 : avgLoss);
    rsi = 100 - (100 / (1 + rs));
    
    result.push({
      time: new Date(data[i + 1].timestamp).getTime(),
      value: rsi
    });
  }
  
  return result;
};

// Calculate MACD (Moving Average Convergence Divergence)
const calculateMACD = (data: HistoricalDataPoint[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  if (!data || data.length < slowPeriod + signalPeriod) return [];
  
  const result = [];
  const prices = data.map(item => item.close);
  
  // Calculate EMA (Exponential Moving Average)
  const calculateEMA = (values: number[], period: number) => {
    const k = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    const emaResults = [ema];
    
    for (let i = period; i < values.length; i++) {
      ema = (values[i] * k) + (ema * (1 - k));
      emaResults.push(ema);
    }
    
    return emaResults;
  };
  
  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // Calculate MACD line
  const macdLine = [];
  for (let i = 0; i < slowEMA.length; i++) {
    const fastIndex = i + (prices.length - slowEMA.length);
    if (fastIndex < fastEMA.length) {
      macdLine.push(fastEMA[fastIndex] - slowEMA[i]);
    }
  }
  
  // Calculate signal line (9-day EMA of MACD line)
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Calculate histogram (MACD line - signal line)
  for (let i = 0; i < signalLine.length; i++) {
    const macdIndex = i + (macdLine.length - signalLine.length);
    const dataIndex = slowPeriod + signalPeriod + i - 1;
    
    if (dataIndex < data.length && macdIndex < macdLine.length) {
      result.push({
        time: new Date(data[dataIndex].timestamp).getTime(),
        macd: macdLine[macdIndex],
        signal: signalLine[i],
        histogram: macdLine[macdIndex] - signalLine[i]
      });
    }
  }
  
  return result;
};

// Calculate Moving Averages
const calculateMovingAverages = (data: HistoricalDataPoint[]) => {
  if (!data || data.length < 200) return [];
  
  const result = [];
  const prices = data.map(item => item.close);
  
  // Calculate Simple Moving Averages
  const calculateSMA = (values: number[], period: number) => {
    const result = [];
    for (let i = period - 1; i < values.length; i++) {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
    return result;
  };
  
  const sma20 = calculateSMA(prices, 20);
  const sma50 = calculateSMA(prices, 50);
  const sma200 = calculateSMA(prices, 200);
  
  // Align the results
  for (let i = 0; i < sma200.length; i++) {
    const dataIndex = 200 - 1 + i;
    if (dataIndex < data.length) {
      const sma20Index = i + (sma20.length - sma200.length);
      const sma50Index = i + (sma50.length - sma200.length);
      
      result.push({
        time: new Date(data[dataIndex].timestamp).getTime(),
        ma20: sma20[sma20Index],
        ma50: sma50[sma50Index],
        ma200: sma200[i]
      });
    }
  }
  
  return result;
};

// Calculate Fibonacci Retracement Levels
const calculateFibonacciLevels = (data: HistoricalDataPoint[]) => {
  if (!data || data.length < 2) return [];
  
  // Find highest high and lowest low in the dataset
  let highestHigh = -Infinity;
  let lowestLow = Infinity;
  let highestIndex = 0;
  let lowestIndex = 0;
  
  for (let i = 0; i < data.length; i++) {
    if (data[i].high > highestHigh) {
      highestHigh = data[i].high;
      highestIndex = i;
    }
    
    if (data[i].low < lowestLow) {
      lowestLow = data[i].low;
      lowestIndex = i;
    }
  }
  
  // Determine if it's an uptrend or downtrend
  const isUptrend = highestIndex > lowestIndex;
  
  // Calculate Fibonacci levels
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const range = highestHigh - lowestLow;
  
  return levels.map(level => {
    const value = isUptrend 
      ? highestHigh - (range * level)
      : lowestLow + (range * level);
    
    return { level, value };
  });
};

// Calculate Stochastic Oscillator
const calculateStochastic = (data: HistoricalDataPoint[], period = 14, smoothK = 3, smoothD = 3) => {
  if (!data || data.length < period) return [];
  
  const result = [];
  
  // Calculate %K values
  const kValues = [];
  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const lowestLow = Math.min(...slice.map(item => item.low));
    const highestHigh = Math.max(...slice.map(item => item.high));
    const currentClose = data[i].close;
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }
  
  // Smooth %K values
  const smoothedK = [];
  for (let i = smoothK - 1; i < kValues.length; i++) {
    const sum = kValues.slice(i - smoothK + 1, i + 1).reduce((a, b) => a + b, 0);
    smoothedK.push(sum / smoothK);
  }
  
  // Calculate %D values (3-day SMA of %K)
  for (let i = smoothD - 1; i < smoothedK.length; i++) {
    const sum = smoothedK.slice(i - smoothD + 1, i + 1).reduce((a, b) => a + b, 0);
    const d = sum / smoothD;
    const dataIndex = period + i;
    
    if (dataIndex < data.length) {
      result.push({
        time: new Date(data[dataIndex].timestamp).getTime(),
        k: smoothedK[i],
        d: d
      });
    }
  }
  
  return result;
};

// Calculate Volume Profile
const calculateVolumeProfile = (data: HistoricalDataPoint[], bins = 10) => {
  if (!data || data.length === 0) return [];
  
  // Find price range
  let minPrice = Infinity;
  let maxPrice = -Infinity;
  
  for (const item of data) {
    minPrice = Math.min(minPrice, item.low);
    maxPrice = Math.max(maxPrice, item.high);
  }
  
  // Create price bins
  const binSize = (maxPrice - minPrice) / bins;
  const volumeByPrice = Array(bins).fill(0);
  
  // Distribute volume into bins
  for (const item of data) {
    const avgPrice = (item.high + item.low + item.open + item.close) / 4;
    const binIndex = Math.min(bins - 1, Math.floor((avgPrice - minPrice) / binSize));
    volumeByPrice[binIndex] += item.volume;
  }
  
  // Create result
  return volumeByPrice.map((volume, i) => ({
    price: minPrice + (i * binSize) + (binSize / 2), // middle of the bin
    volume
  }));
};

// Calculate Ichimoku Cloud
const calculateIchimoku = (data: HistoricalDataPoint[]) => {
  if (!data || data.length < 52) return [];
  
  const result = [];
  
  for (let i = 52; i < data.length; i++) {
    // Tenkan-sen (Conversion Line): (9-period high + 9-period low) / 2
    const tenkanHigh = Math.max(...data.slice(i - 9, i + 1).map(item => item.high));
    const tenkanLow = Math.min(...data.slice(i - 9, i + 1).map(item => item.low));
    const tenkan = (tenkanHigh + tenkanLow) / 2;
    
    // Kijun-sen (Base Line): (26-period high + 26-period low) / 2
    const kijunHigh = Math.max(...data.slice(i - 26, i + 1).map((item: HistoricalDataPoint) => item.high));
    const kijunLow = Math.min(...data.slice(i - 26, i + 1).map((item: HistoricalDataPoint) => item.low));
    const kijun = (kijunHigh + kijunLow) / 2;

    // Senkou Span A (Leading Span A): (Tenkan-sen + Kijun-sen) / 2
    const senkouA = (tenkan + kijun) / 2;

    // Senkou Span B (Leading Span B): (52-period high + 52-period low) / 2
    const senkouBHigh = Math.max(...data.slice(i - 52, i + 1).map((item: HistoricalDataPoint) => item.high));
    const senkouBLow = Math.min(...data.slice(i - 52, i + 1).map((item: HistoricalDataPoint) => item.low));
    const senkouB = (senkouBHigh + senkouBLow) / 2;

    // Chikou Span (Lagging Span): Current closing price shifted back 26 periods
    const chikou = i >= 26 ? data[i].close : null;

    result.push({
      time: new Date(data[i].timestamp).getTime(),
      tenkan,
      kijun,
      senkouA,
      senkouB,
      chikou
    });
  }

  return result;
};

interface PredictionChartProps {
  predictionData?: PredictionResult;
  symbol: string;
  exchange: string;
  timeframe: string;
}

interface ChartDataPoint {
  timestamp: number;
  date: string;
  price: number;
  volume: number;
  time: number;
  prediction?: PredictionResult;
  signal?: string;
  confidence?: number;
  signalValue?: number | null | undefined;
}

const PredictionChart: React.FC<PredictionChartProps> = ({
  symbol,
  exchange,
  timeframe
}) => {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Technical indicator states
  const [showBollingerBands, setShowBollingerBands] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showMovingAverages, setShowMovingAverages] = useState(false);
  const [showFibonacci, setShowFibonacci] = useState(false);
  const [showStochastic, setShowStochastic] = useState(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [showIchimoku, setShowIchimoku] = useState(false);

  // Technical indicator data
  const [bollingerBands, setBollingerBands] = useState<BollingerBand[]>([]);
  const [rsiData, setRsiData] = useState<number[]>([]);
  const [macdData, setMacdData] = useState<MACDData[]>([]);
  const [movingAverages, setMovingAverages] = useState<MovingAverageData[]>([]);
  const [fibonacciLevels, setFibonacciLevels] = useState<FibonacciLevel[]>([]);
  const [stochasticData, setStochasticData] = useState<StochasticData[]>([]);
  const [volumeProfileData, setVolumeProfileData] = useState<VolumeProfileData[]>([]);
  const [ichimokuData, setIchimokuData] = useState<IchimokuData[]>([]);

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
          time: new Date(item.timestamp).getTime(), // Add time property for technical indicators
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

        // Calculate technical indicators
        setBollingerBands(calculateBollingerBands(historicalData));
        setRsiData(calculateRSI(historicalData).map(item => item.value));
        setMacdData(calculateMACD(historicalData));
        setMovingAverages(calculateMovingAverages(historicalData));
        setFibonacciLevels(calculateFibonacciLevels(historicalData));
        setStochasticData(calculateStochastic(historicalData));
        setVolumeProfileData(calculateVolumeProfile(historicalData));
        setIchimokuData(calculateIchimoku(historicalData));
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
                      d={`M${cx},${cy - 10} L${cx + 7},${cy} L${cx - 7},${cy} Z`}
                      fill="#4ade80"
                      stroke="#22c55e"
                      strokeWidth={1}
                    />
                  );
                } else if (payload.signal === 'SELL') {
                  return (
                    <path
                      d={`M${cx},${cy + 10} L${cx + 7},${cy} L${cx - 7},${cy} Z`}
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

      <div className="mt-4 p-4 border border-neutral-700 rounded bg-background">
        <h4 className="font-medium mb-2">Technical Indicators</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            className={`p-3 bg-background-lighter border ${showBollingerBands ? 'border-primary' : 'border-neutral-700'} rounded-lg hover:border-primary transition-colors`}
            onClick={() => setShowBollingerBands(!showBollingerBands)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">Bollinger Bands</span>
              <span className="text-xs text-gray-400">Volatility indicator</span>
            </div>
          </button>

          <button
            className={`p-3 bg-background-lighter border ${showRSI ? 'border-primary' : 'border-neutral-700'} rounded-lg hover:border-primary transition-colors`}
            onClick={() => setShowRSI(!showRSI)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">RSI</span>
              <span className="text-xs text-gray-400">Momentum oscillator</span>
            </div>
          </button>

          <button
            className={`p-3 bg-background-lighter border ${showMACD ? 'border-primary' : 'border-neutral-700'} rounded-lg hover:border-primary transition-colors`}
            onClick={() => setShowMACD(!showMACD)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">MACD</span>
              <span className="text-xs text-gray-400">Trend-following momentum</span>
            </div>
          </button>

          <button
            className={`p-3 bg-background-lighter border ${showMovingAverages ? 'border-primary' : 'border-neutral-700'} rounded-lg hover:border-primary transition-colors`}
            onClick={() => setShowMovingAverages(!showMovingAverages)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">Moving Averages</span>
              <span className="text-xs text-gray-400">Trend indicator</span>
            </div>
          </button>

          <button
            className={`p-3 bg-background-lighter border ${showFibonacci ? 'border-primary' : 'border-neutral-700'} rounded-lg hover:border-primary transition-colors`}
            onClick={() => setShowFibonacci(!showFibonacci)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">Fibonacci</span>
              <span className="text-xs text-gray-400">Retracement levels</span>
            </div>
          </button>

          <button
            className={`p-3 bg-background-lighter border ${showStochastic ? 'border-primary' : 'border-neutral-700'} rounded-lg hover:border-primary transition-colors`}
            onClick={() => setShowStochastic(!showStochastic)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">Stochastic</span>
              <span className="text-xs text-gray-400">Momentum indicator</span>
            </div>
          </button>

          <button
            className={`p-3 bg-background-lighter border ${showVolumeProfile ? 'border-primary' : 'border-neutral-700'} rounded-lg hover:border-primary transition-colors`}
            onClick={() => setShowVolumeProfile(!showVolumeProfile)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">Volume Profile</span>
              <span className="text-xs text-gray-400">Price & volume analysis</span>
            </div>
          </button>

          <button
            className={`p-3 bg-background-lighter border ${showIchimoku ? 'border-primary' : 'border-neutral-700'} rounded-lg hover:border-primary transition-colors`}
            onClick={() => setShowIchimoku(!showIchimoku)}
          >
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium mb-1">Ichimoku Cloud</span>
              <span className="text-xs text-gray-400">Support & resistance</span>
            </div>
          </button>
        </div>

        {/* Display selected technical indicators */}
        {(showBollingerBands || showRSI || showMACD || showMovingAverages ||
          showFibonacci || showStochastic || showVolumeProfile || showIchimoku) && (
            <div className="mt-4">
              {/* Bollinger Bands Chart */}
              {showBollingerBands && bollingerBands.length > 0 && (
                <div className="mb-6">
                  <h5 className="text-sm font-medium mb-2">Bollinger Bands (20, 2)</h5>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={bollingerBands.map(band => ({
                      time: band.time,
                      upper: band.upper,
                      middle: band.middle,
                      lower: band.lower,
                      price: chartData.find(d => d.time === band.time)?.price
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis
                        dataKey="time"
                        tickFormatter={(time: number) => new Date(time).toLocaleDateString()}
                        tick={{ fill: '#999' }}
                      />
                      <YAxis tick={{ fill: '#999' }} />
                      <Tooltip
                        formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                        labelFormatter={(time: number) => new Date(time).toLocaleString()}
                      />
                      <Line type="monotone" dataKey="price" stroke="#4ade80" dot={false} />
                      <Line type="monotone" dataKey="upper" stroke="#f87171" dot={false} strokeDasharray="3 3" />
                      <Line type="monotone" dataKey="middle" stroke="#60a5fa" dot={false} />
                      <Line type="monotone" dataKey="lower" stroke="#f87171" dot={false} strokeDasharray="3 3" />
                    </ComposedChart>
                  </ResponsiveContainer>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={rsiData.map((value, index) => ({
                    time: index < chartData.length ? chartData[index].time : 0,
                    rsi: value
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(time: number) => new Date(time).toLocaleDateString()}
                      tick={{ fill: '#999' }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: '#999' }} />
                    <Tooltip 
                      formatter={(value: number) => [value.toFixed(2), 'RSI']}
                      labelFormatter={(time: number) => new Date(time).toLocaleString()}
                    />
                    <ReferenceLine y={70} stroke="#f87171" strokeDasharray="3 3" />
                    <ReferenceLine y={30} stroke="#4ade80" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="rsi" stroke="#60a5fa" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* MACD Chart */}
            {showMACD && macdData.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium mb-2">MACD (12, 26, 9)</h5>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={macdData.map(data => ({
                    time: data.time,
                    macd: data.macd,
                    signal: data.signal,
                    histogram: data.histogram
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(time: number) => new Date(time).toLocaleDateString()}
                      tick={{ fill: '#999' }}
                    />
                    <YAxis tick={{ fill: '#999' }} />
                    <Tooltip 
                      formatter={(value: number) => [value.toFixed(4), '']}
                      labelFormatter={(time: number) => new Date(time).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="macd" stroke="#4ade80" dot={false} />
                    <Line type="monotone" dataKey="signal" stroke="#f87171" dot={false} />
                    <Area 
                      type="monotone" 
                      dataKey="histogram" 
                      fill="#60a5fa" 
                      stroke="#60a5fa"
                      fillOpacity={0.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Moving Averages Chart */}
            {showMovingAverages && movingAverages.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium mb-2">Moving Averages (20, 50, 200)</h5>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={movingAverages.map(ma => ({
                    time: ma.time,
                    ma20: ma.ma20,
                    ma50: ma.ma50,
                    ma200: ma.ma200,
                    price: chartData.find(d => d.time === ma.time)?.price
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(time: number) => new Date(time).toLocaleDateString()}
                      tick={{ fill: '#999' }}
                    />
                    <YAxis tick={{ fill: '#999' }} />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                      labelFormatter={(time: number) => new Date(time).toLocaleString()}
                    />
                    <Line type="monotone" dataKey="price" stroke="#94a3b8" dot={false} />
                    <Line type="monotone" dataKey="ma20" stroke="#4ade80" dot={false} />
                    <Line type="monotone" dataKey="ma50" stroke="#60a5fa" dot={false} />
                    <Line type="monotone" dataKey="ma200" stroke="#f87171" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Fibonacci Retracement */}
            {showFibonacci && fibonacciLevels.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium mb-2">Fibonacci Retracement Levels</h5>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {fibonacciLevels.map((level) => (
                    <div key={level.level} className="p-2 bg-background-lighter border border-neutral-700 rounded">
                      <div className="text-xs text-gray-400">{(level.level * 100).toFixed(1)}%</div>
                      <div className="text-sm">${level.value.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Stochastic Oscillator */}
            {showStochastic && stochasticData.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium mb-2">Stochastic Oscillator (14, 3, 3)</h5>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={stochasticData.map(data => ({
                    time: data.time,
                    k: data.k,
                    d: data.d
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(time: number) => new Date(time).toLocaleDateString()}
                      tick={{ fill: '#999' }}
                    />
                    <YAxis domain={[0, 100]} tick={{ fill: '#999' }} />
                    <Tooltip 
                      formatter={(value: number) => [value.toFixed(2), '']}
                      labelFormatter={(time: number) => new Date(time).toLocaleString()}
                    />
                    <ReferenceLine y={80} stroke="#f87171" strokeDasharray="3 3" />
                    <ReferenceLine y={20} stroke="#4ade80" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="k" stroke="#4ade80" dot={false} />
                    <Line type="monotone" dataKey="d" stroke="#f87171" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Volume Profile */}
            {showVolumeProfile && volumeProfileData.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium mb-2">Volume Profile</h5>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart 
                    layout="vertical"
                    data={volumeProfileData}
                  >
                    <XAxis type="number" tick={{ fill: '#999' }} />
                    <YAxis 
                      dataKey="price" 
                      type="number" 
                      domain={['dataMin', 'dataMax']} 
                      tick={{ fill: '#999' }}
                      tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [value, 'Volume']}
                      labelFormatter={(price: string) => `Price: $${parseFloat(price).toFixed(2)}`}
                    />
                    <Area 
                      dataKey="volume" 
                      fill="#60a5fa" 
                      stroke="#60a5fa"
                      fillOpacity={0.5}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
            
            {/* Ichimoku Cloud */}
            {showIchimoku && ichimokuData.length > 0 && (
              <div className="mb-6">
                <h5 className="text-sm font-medium mb-2">Ichimoku Cloud</h5>
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={ichimokuData.map(data => ({
                    time: data.time,
                    tenkan: data.tenkan,
                    kijun: data.kijun,
                    senkouA: data.senkouA,
                    senkouB: data.senkouB,
                    price: chartData.find(d => d.time === data.time)?.price
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis 
                      dataKey="time" 
                      tickFormatter={(time: number) => new Date(time).toLocaleDateString()}
                      tick={{ fill: '#999' }}
                    />
                    <YAxis tick={{ fill: '#999' }} />
                    <Tooltip 
                      formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                      labelFormatter={(time: number) => new Date(time).toLocaleString()}
                    />
                    <Area 
                      dataKey="senkouA" 
                      fillOpacity={0.3} 
                      stroke="transparent" 
                      fill="#4ade80" 
                    />
                    <Area 
                      dataKey="senkouB" 
                      fillOpacity={0.3} 
                      stroke="transparent" 
                      fill="#f87171" 
                    />
                    <Line type="monotone" dataKey="price" stroke="#94a3b8" dot={false} />
                    <Line type="monotone" dataKey="tenkan" stroke="#f59e0b" dot={false} />
                    <Line type="monotone" dataKey="kijun" stroke="#60a5fa" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionChart;
