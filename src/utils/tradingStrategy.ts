import { EMA, RSI } from 'technicalindicators';
import { Cryptocurrency, TradeSignal } from '../types';

const PRICE_WINDOW = 10; // Window size for local min/max detection
const RSI_PERIOD = 14;
const RSI_OVERBOUGHT = 70;
const RSI_OVERSOLD = 30;
const EMA_FAST_PERIOD = 12;
const EMA_SLOW_PERIOD = 26;

export function analyzePrice(prices: number[]): { isLocalMin: boolean; isLocalMax: boolean } {
  if (prices.length < PRICE_WINDOW) {
    return { isLocalMin: false, isLocalMax: false };
  }

  const currentWindow = prices.slice(-PRICE_WINDOW);
  const midPoint = Math.floor(PRICE_WINDOW / 2);
  const centerPrice = currentWindow[midPoint];

  const leftHalf = currentWindow.slice(0, midPoint);
  const rightHalf = currentWindow.slice(midPoint + 1);

  const isLocalMin = leftHalf.every(p => p >= centerPrice) && rightHalf.every(p => p >= centerPrice);
  const isLocalMax = leftHalf.every(p => p <= centerPrice) && rightHalf.every(p => p <= centerPrice);

  return { isLocalMin, isLocalMax };
}

export function calculateRSI(prices: number[]): number[] {
  if (prices.length < RSI_PERIOD) {
    return [];
  }

  const rsi = new RSI({
    values: prices,
    period: RSI_PERIOD
  });

  return rsi.getResult();
}

export function calculateEMA(prices: number[]): { fast: number[]; slow: number[] } {
  const emaFast = new EMA({
    values: prices,
    period: EMA_FAST_PERIOD
  });

  const emaSlow = new EMA({
    values: prices,
    period: EMA_SLOW_PERIOD
  });

  return {
    fast: emaFast.getResult(),
    slow: emaSlow.getResult()
  };
}

export function generateTradeSignals(crypto: Cryptocurrency): TradeSignal[] {
  if (!crypto.price_history || crypto.price_history.length < PRICE_WINDOW) {
    return [];
  }

  const signals: TradeSignal[] = [];
  const prices = crypto.price_history;
  const rsiValues = calculateRSI(prices);
  const ema = calculateEMA(prices);

  // Look for trade signals in the recent price history
  for (let i = PRICE_WINDOW; i < prices.length; i++) {
    const windowPrices = prices.slice(i - PRICE_WINDOW, i + 1);
    const { isLocalMin, isLocalMax } = analyzePrice(windowPrices);
    const rsi = rsiValues[i - RSI_PERIOD] || 50;

    // Buy signal conditions
    if (isLocalMin && rsi < RSI_OVERSOLD && ema.fast[i] > ema.slow[i]) {
      signals.push({
        type: 'buy',
        price: prices[i],
        timestamp: Date.now() - (prices.length - i) * 1000 * 60 // Approximate timestamp
      });
    }
    
    // Sell signal conditions
    if (isLocalMax && rsi > RSI_OVERBOUGHT && ema.fast[i] < ema.slow[i]) {
      signals.push({
        type: 'sell',
        price: prices[i],
        timestamp: Date.now() - (prices.length - i) * 1000 * 60
      });
    }
  }

  return signals;
}