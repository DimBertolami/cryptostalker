import React, { useState } from 'react';
import { ArrowDownUp, RefreshCw } from 'lucide-react';

const JupiterWidget: React.FC = () => {
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('1');

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-background-lighter rounded-lg border border-neutral-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Jupiter Swap</h2>
        <button className="p-2 hover:bg-background rounded-full transition-colors">
          <RefreshCw className="w-5 h-5 text-neutral-400" />
        </button>
      </div>

      <div className="space-y-4">
        {/* From Token */}
        <div className="space-y-2">
          <label className="block text-sm text-neutral-400">From</label>
          <div className="flex gap-2">
            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
              <option value="BONK">BONK</option>
            </select>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Amount"
            />
          </div>
        </div>

        {/* Swap Icon */}
        <div className="flex justify-center">
          <button className="p-2 hover:bg-background rounded-full transition-colors">
            <ArrowDownUp className="w-5 h-5 text-primary" />
          </button>
        </div>

        {/* To Token */}
        <div className="space-y-2">
          <label className="block text-sm text-neutral-400">To</label>
          <div className="flex gap-2">
            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="USDC">USDC</option>
              <option value="SOL">SOL</option>
              <option value="BONK">BONK</option>
            </select>
            <input
              type="text"
              readOnly
              value="0.00"
              className="flex-1 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Amount"
            />
          </div>
        </div>

        {/* Swap Button */}
        <button
          className="w-full py-3 px-4 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition-colors"
        >
          Swap
        </button>
      </div>
    </div>
  );
};

export default JupiterWidget;