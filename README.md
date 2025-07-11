# Cryptobot Nightstalker
***a few quick updated screenshots: 01-06-2025***

(Jupiter terminal)
![image](https://github.com/user-attachments/assets/21dbd4f6-1ea1-4d91-8bb4-a92b25cf45bc)
(this provides easy access to jupiter, as you might imagine)
![image](https://github.com/user-attachments/assets/08376099-4e9f-4c79-b744-a2233fe23d94)

(predictions)
![image](https://github.com/user-attachments/assets/d86d0a55-c7c8-4b4c-ab54-2e25d8f720be)
(exchange settings)
![image](https://github.com/user-attachments/assets/f9244762-b95d-4697-9ce5-37f36cdf56a4)
fetch settings)
![image](https://github.com/user-attachments/assets/c06699ac-9338-469c-8ccf-29184299c66f)

![image](https://github.com/user-attachments/assets/0e135fd2-7a97-4326-a4ff-67c87d47d424)
![image](https://github.com/user-attachments/assets/bd3dacc9-d8d2-4c0c-a609-b869bbc0944a)
**5800% profit in 20 minutes!!**
![image](https://github.com/user-attachments/assets/e104dad0-cc16-4675-a63b-475392d14b5d)
***the 3 coins it picked out were as you can great***
![image](https://github.com/user-attachments/assets/301e286f-2d04-4e69-b3a9-ced9a2780c60)
![image](https://github.com/user-attachments/assets/702bb071-0960-4469-a0dd-fd6f4af8c909)
***it sure knows how to pick em now***

most recent changes:
1. when clicking the name column (or set age to all) it will show the 5000 coins it is processing.
![image](https://github.com/user-attachments/assets/4e053d23-20d5-4b1e-842e-8a65394aeae0)
2. you can also sort on the price column, 24h%, marketcap and volume, the last three are important (if you want to make a profit)
3. when autotrading, under portfolio chart now shows real-time data:
![image](https://github.com/user-attachments/assets/73cb55da-bca9-4645-aeeb-7ca990e16f08)
![image](https://github.com/user-attachments/assets/8c40c971-67b9-457b-86cd-f98cc7711954)
![image](https://github.com/user-attachments/assets/fa683883-0153-4953-aa72-c57d8feef6e1)
and under the history tab it also calculates the profit.. 
![image](https://github.com/user-attachments/assets/96be94ab-141d-40a8-a2aa-31da9e2fefe8)
this was a manual trade, still  need to sort out some of the wallet stuff and then the auto-trade function.. but this project is almost operational as you can  see..

![image](https://github.com/user-attachments/assets/12514dc9-7288-4a13-8786-108c692c9d3a)
5. new tab trade-settings.. at the moment uses mockdata but this will change asap.
![image](https://github.com/user-attachments/assets/e1520980-a7f7-4280-9f8c-27c33bc8c639)

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
- **Jupiter Swap Integration**: Seamlessly swap tokens using Jupiter's integrated terminal.

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
- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### Installation
```bash
npm install
```

### Running the App
To start all services (frontend and backend):
```bash
./startup.sh
```
To stop all services:
```bash
./shutdown.sh
```

**Note:** Ensure your `COINMARKETCAP_API_KEY` is set as an environment variable or in a `.env` file if required by the backend configuration within `startup.sh`.

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

## Key Dependencies

- **Frontend Framework**: React
- **State Management**: Zustand
- **Charting**: Chart.js, react-chartjs-2
- **HTTP Client**: axios
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Solana Integration**:
  - `@solana/web3.js`
  - `@solana/wallet-adapter-react`
  - `@solana/wallet-adapter-react-ui`
  - Various wallet adapters (`@solana/wallet-adapter-phantom`, etc.)
- **Jupiter Protocol Integration**:
  - `@jup-ag/terminal`
- **Utility**: date-fns, react-hot-toast

---

## Contributing

Contributions are welcome! Please open issues or submit pull requests for bug fixes, new features, or improvements.

---

## License

This project is licensed under the MIT License.

---
