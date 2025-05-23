import React, { useEffect, useState } from 'react';
import { Tabs, TabList, TabPanel } from './Tabs';
import NewCryptosTable from './NewCryptosTable';
import TradeHistory from './TradeHistory';
import Portfolio from './Portfolio';
import ExchangeSettings from './ExchangeSettings';
import JupiterWidget from './JupiterWidget';
import TradeSettings from './TradeSettings';
import useCryptoStore from '../store/useCryptoStore';

const Dashboard: React.FC = () => {
  const { fetchCryptos, updateInterval } = useCryptoStore();
  const [activeTab, setActiveTab] = useState(0);
  
  // Initial fetch
  useEffect(() => {
    fetchCryptos();
  }, [fetchCryptos]);
  
  // Set up interval for fetching crypto data
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchCryptos();
    }, updateInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [fetchCryptos, updateInterval]);
  
  return (
    <div className="bg-background-lighter border border-neutral-700 rounded-lg overflow-hidden animate-fade-in">
      <Tabs activeTab={activeTab} onChange={setActiveTab}>
        <TabList>
          <TabList.Tab>New Cryptocurrencies</TabList.Tab>
          <TabList.Tab>Portfolio</TabList.Tab>
          <TabList.Tab>Trade History</TabList.Tab>
          <TabList.Tab>Jupiter Swap</TabList.Tab>
          <TabList.Tab>Exchange Settings</TabList.Tab>
          <TabList.Tab>Trade Settings</TabList.Tab>
        </TabList>
        
        <TabPanel index={0}>
          <NewCryptosTable />
        </TabPanel>
        
        <TabPanel index={1}>
          <Portfolio />
        </TabPanel>
        
        <TabPanel index={2}>
          <TradeHistory />
        </TabPanel>
        
        <TabPanel index={3}>
          <JupiterWidget />
        </TabPanel>
        
        <TabPanel index={4}>
          <ExchangeSettings />
        </TabPanel>
        
        <TabPanel index={5}>
          <TradeSettings />
        </TabPanel>
      </Tabs>
    </div>
  );
};

export default Dashboard;