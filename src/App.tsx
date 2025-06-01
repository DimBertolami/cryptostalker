import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import JupiterSwapPage from './pages/JupiterSwapPage';
import PaperTradingDashboard from './pages/PaperTradingDashboard';
import PredictionPage from './pages/PredictionPage';
import JupiterReferral from './pages/JupiterReferral';
import NavBar from './components/NavBar';
import StatusBar from './components/StatusBar';
import './App.css';
import useAppStore from './store/useAppStore';
import { useEffect } from 'react';

function App() {
  const { darkMode } = useAppStore();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Router>
      <div className="app min-h-screen bg-background text-white">
        <NavBar />
        <main className="container mx-auto px-4 py-6">
          <StatusBar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jupiterswap" element={<JupiterSwapPage />} />
            <Route path="/paper-trading" element={<PaperTradingDashboard />} />
            <Route path="/prediction" element={<PredictionPage />} />
            <Route path="/jupiter-referral" element={<JupiterReferral />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;