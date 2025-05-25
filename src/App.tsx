// React is imported automatically by the JSX transform
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import StatusBar from './components/StatusBar';
import { WalletProvider } from './components/wallet';

function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-background text-white">
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'bg-background-lighter text-white border border-neutral-700',
            duration: 3000,
          }}
        />
        <Header />
        <main className="container mx-auto px-4 py-6">
          <StatusBar />
          <Dashboard />
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;