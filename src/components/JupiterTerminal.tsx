import React, { useEffect, useRef } from 'react';
import './JupiterTerminal.css';

// Hardcoded Jupiter swap URL
const JUPITER_SWAP_URL = 'https://terminal.jup.ag/swap/SOL-USDC';

const JupiterTerminal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Jupiter Terminal when the component mounts
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      // Create iframe for Jupiter Terminal
      const iframe = document.createElement('iframe');
      iframe.src = JUPITER_SWAP_URL;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      
      // Clear container and append iframe
      container.innerHTML = '';
      container.appendChild(iframe);
    } catch (error) {
      console.error('Error initializing Jupiter Terminal:', error);
    }

    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className="jupiter-terminal-container">
      <div className="jupiter-terminal-header">
        <h2>Jupiter Swap</h2>
      </div>
      <div id="jupiter-terminal-container" ref={containerRef} className="jupiter-terminal"></div>
    </div>
  );
};

export default JupiterTerminal;