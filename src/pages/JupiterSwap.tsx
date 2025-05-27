import React from 'react';
import JupiterTerminal from '../components/JupiterTerminal';
import './JupiterSwap.css';

const JupiterSwap: React.FC = () => {
  return (
    <div className="jupiter-swap-page">
      <div className="jupiter-swap-header">
        <h1>Jupiter Swap</h1>
        <p>Swap tokens at the best prices across all Solana DEXs</p>
      </div>
      <div className="jupiter-swap-container">
        <JupiterTerminal />
      </div>
    </div>
  );
};

export default JupiterSwap;
