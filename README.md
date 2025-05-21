# Cryptobot Nightstalker

Automated Trading Guru for New Cryptocurrencies

---

## Overview

**Cryptobot Nightstalker** is a modern, automated crypto trading dashboard that monitors new cryptocurrencies in real-time, identifies high-potential assets, and enables both manual and automated trading on supported exchanges. The app features a visually appealing, responsive interface with dark mode support, real-time charts, portfolio tracking, and detailed trade history.

---

## Features

- **Live Cryptocurrency Monitoring**: Fetches and displays new coins from CoinMarketCap, highlighting those with high market cap or trading volume.
- **Automated Trading**: Auto-trading mode monitors for high-value opportunities and executes trades based on configurable rules (e.g., sell after 3 consecutive price drops).
- **Manual Trading**: Buy and sell cryptocurrencies manually, with support for both paper (simulated) and live trading.
- **Portfolio Management**: Track your holdings, average buy price, profit/loss, and visualize price history.
- **Trade History**: See all trades (manual, auto, paper, and live) with detailed breakdowns.
- **Multi-Exchange Support**: Connect to Bitvavo and Binance using your API keys.
- **Configurable Update Interval**: Choose how frequently the app fetches new data.
- **Dark Mode**: Toggle between light and dark themes for optimal viewing.

---

## Screenshots

![image](https://github.com/user-attachments/assets/6990950e-1d6d-4168-a2e2-a90cf88a1bfc)
![image](https://github.com/user-attachments/assets/78b84ca5-2223-424c-a018-54954bde9143)
![image](https://github.com/user-attachments/assets/29d3a5f2-e424-4a9b-873b-4268f30922f3)
![image](https://github.com/user-attachments/assets/1acf531d-5dda-4698-8ff9-455ca9b583ee)
![image](https://github.com/user-attachments/assets/4c06aaca-4014-4731-ac59-4d2e8635dbb1)

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation
```bash
npm install
```

### Running the App
- **Development mode:**
  ```bash
  npm run dev
  ```
- **Production build:**
  ```bash
  npm run build
  npm run preview
  ```

---

## Usage

1. **Connect Exchange(s):**
   - Go to the "Exchange Settings" tab.
   - Enter your API key and secret for Bitvavo or Binance.
   - Save to enable live trading. (Leave blank for paper trading only.)
2. **Monitor New Cryptos:**
   - The dashboard will auto-refresh and display new coins and those meeting high-value criteria.
3. **Trade:**
   - Use the "Buy" button to purchase assets (choose paper or live mode).
   - Use the "Portfolio" tab to manage and sell your holdings.
4. **Auto-Trading:**
   - Enable auto-trading in the status bar to let the bot handle high-value opportunities and auto-sell after 3 consecutive price drops.
5. **Review Trades:**
   - All trades are logged in the "Trade History" tab.

---

## Configuration

- **Update Interval:**
  - Change how often new data is fetched (Status Bar > Interval dropdown).
- **Trading Mode:**
  - Toggle between paper and live trading (Status Bar; live trading requires exchange connection).
- **Theme:**
  - Toggle dark/light mode (Header > Sun/Moon icon).

---

## Project Structure

- `src/components/` — UI components (Dashboard, Portfolio, TradeHistory, etc.)
- `src/store/` — Zustand stores for app, crypto, and exchange state
- `src/services/` — API service for fetching cryptocurrency data
- `src/types/` — TypeScript types and interfaces
- `src/App.tsx` — Main app layout

---

## Dependencies

- React, Zustand, Chart.js, react-chartjs-2, axios, Tailwind CSS, Lucide React, date-fns, react-hot-toast

---

## Contributing

Contributions are welcome! Please open issues or submit pull requests for bug fixes, new features, or improvements.

---

## License

This project is licensed under the MIT License.

---
