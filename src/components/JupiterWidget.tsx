import React, { useEffect } from 'react';
import '@jup-ag/terminal/css';

const JupiterWidget: React.FC = () => {
  useEffect(() => {
    const loadJupiter = async () => {
      if (typeof window !== 'undefined') {
        const { init } = await import('@jup-ag/terminal');
        init({
          displayMode: 'widget',
          formProps: {
            initialAmount: '1000000',
            swapMode: 'ExactInOrOut',
          },
        });
      }
    };

    loadJupiter();
  }, []);

  return (
    <div className="w-full h-[600px] bg-background-lighter rounded-lg border border-neutral-700 overflow-hidden">
      <div id="jup-terminal" className="w-full h-full" />
    </div>
  );
};

export default JupiterWidget;