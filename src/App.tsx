// React is imported automatically by the JSX transform
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import StatusBar from './components/StatusBar';
import WalletProvider from './components/wallet/WalletProvider'; 
import JupiterSwap from './pages/JupiterSwap';
import SupabaseTestPage from './components/SupabaseTestPage'; // Import the new page
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import useAppStore from './store/useAppStore'; // Import the Zustand store
import { useEffect } from 'react'; // Import useEffect

// Wallet adapter and provider imports, wallet definitions, and endpoint
// are now handled in src/components/wallet/WalletProvider.tsx

function App() {
  const { darkMode } = useAppStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  // Wallet setup is now fully handled by the WalletProvider component.

  return (
    // Our custom WalletProvider (src/components/wallet/WalletProvider.tsx)
    // now handles ConnectionProvider, SolanaWalletProvider, and WalletModalProvider internally.
    <WalletProvider>
      <Router>
        <div className="app min-h-screen bg-background text-white">
          <Toaster
            position="top-right"
            toastOptions={{
              className: 'bg-background-lighter text-white border border-neutral-700',
              duration: 3000,
            }}
          />
          <ToastContainer position="top-right" autoClose={5000} /> {/* For react-toastify */}
          <Header />
          <main className="container mx-auto px-4 py-6">
            <StatusBar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/swap" element={<JupiterSwap />} />
              <Route path="/supabase-test" element={<SupabaseTestPage />} /> {/* Add route for Supabase test page */}
            </Routes>
          </main>
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;