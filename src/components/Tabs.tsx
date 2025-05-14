import React, { createContext, useContext } from 'react';
import clsx from 'clsx';

interface TabsContextType {
  activeTab: number;
  onChange: (index: number) => void;
  tabListChildren?: React.ReactNode;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  children: React.ReactNode;
  activeTab: number;
  onChange: (index: number) => void;
}

export const Tabs: React.FC<TabsProps> = ({ children, activeTab, onChange }) => {
  return (
    <TabsContext.Provider value={{ activeTab, onChange }}>
      <div className="flex flex-col">{children}</div>
    </TabsContext.Provider>
  );
};

interface TabListProps {
  children: React.ReactNode;
}

const TabList: React.FC<TabListProps> & { Tab: React.FC<TabProps> } = ({ children }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabList must be used within Tabs');

  return (
    <TabsContext.Provider value={{ ...context, tabListChildren: children }}>
      <div className="flex border-b border-neutral-700">
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabProps {
  children: React.ReactNode;
}

const Tab: React.FC<TabProps> = ({ children }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab must be used within Tabs');
  
  const { activeTab, onChange, tabListChildren } = context;
  
  // Find the index of this tab among its siblings
  const index = React.Children.toArray(tabListChildren).findIndex(
    child => React.isValidElement(child) && child.props.children === children
  );

  if (index === -1) {
    throw new Error('Could not determine tab index');
  }
  
  return (
    <button
      className={clsx(
        "px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
        activeTab === index
          ? "text-primary border-b-2 border-primary"
          : "text-neutral-400 hover:text-neutral-200"
      )}
      onClick={() => onChange(index)}
    >
      {children}
    </button>
  );
};

interface TabPanelProps {
  children: React.ReactNode;
  index: number;
}

export const TabPanel: React.FC<TabPanelProps> = ({ children, index }) => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabPanel must be used within Tabs');
  
  const { activeTab } = context;
  
  if (activeTab !== index) return null;
  
  return <div className="animate-fade-in">{children}</div>;
};

TabList.Tab = Tab;

// Set displayName for React DevTools
TabList.displayName = 'TabList';
Tab.displayName = 'Tab';
TabPanel.displayName = 'TabPanel';

export { TabList };