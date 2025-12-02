# Polymarket Copy Trading Bot

<div align="center">

**Automatically copy trades from successful Polymarket traders**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-LTS-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Trading Strategies](#trading-strategies)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Contributing](#contributing)
- [Support](#support)

## 🎯 Overview

The Polymarket Copy Trading Bot is an automated trading system that monitors a selected trader's activity on Polymarket and automatically executes matching trades in your account. The bot uses proportional position sizing based on your account balance and implements intelligent retry mechanisms to ensure reliable trade execution.

### Key Capabilities

- **Real-time Trade Monitoring**: Continuously monitors target trader's activity
- **Proportional Position Sizing**: Automatically scales trade sizes based on account balance ratios
- **Intelligent Order Execution**: Implements buy, sell, and merge strategies with price validation
- **Persistent Trade History**: Stores all trades and positions in MongoDB for recovery and analysis
- **Retry Logic**: Automatic retry mechanism for failed trades with configurable limits

## ✨ Features

- 🔄 **Automated Trade Execution**: Automatically copies trades from selected traders
- 📊 **Proportional Sizing**: Scales positions based on your account balance relative to the target trader
- 🛡️ **Price Validation**: Skips trades if market price deviates significantly from original trade price
- 🔁 **Retry Mechanism**: Automatically retries failed trades up to a configurable limit
- 💾 **Trade History**: Persistent storage of all trades and positions in MongoDB
- ⚡ **Low Latency**: Optimized for fast trade execution
- 🔒 **Secure**: Uses environment variables for sensitive credentials

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** (v7 or higher) - Comes with Node.js
- **MongoDB** - Either local installation or MongoDB Atlas account
- **Polymarket Account** - Active account with funded wallet
- **Polygon RPC Access** - Infura, Alchemy, or similar RPC provider

## 🚀 Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/vladmeer/polymarket-copy-trading-bot.git
cd polymarket-copy-trading-bot
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Environment File

Create a `.env` file in the root directory:

```bash
# Windows
type nul > .env

# Linux/Mac
touch .env
```

### Step 4: Configure Environment Variables

Open the `.env` file and add the following configuration (see [Configuration](#configuration) for detailed explanations):

```env
# Target Trader Configuration
USER_ADDRESS=0xYourTargetTraderWalletAddress

# Your Wallet Configuration
PROXY_WALLET=0xYourPolymarketWalletAddress
PRIVATE_KEY=YourWalletPrivateKey

# Polymarket API Configuration
CLOB_HTTP_URL=https://clob.polymarket.com/
CLOB_WS_URL=wss://ws-subscriptions-clob.polymarket.com/ws

# Trading Parameters
FETCH_INTERVAL=1
TOO_OLD_TIMESTAMP=24
RETRY_LIMIT=3

# Database Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Blockchain Configuration
RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY
USDC_CONTRACT_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
```

### Step 5: Build the Project

```bash
npm run build
```

### Step 6: Run the Bot

```bash
npm run start
```

For development with auto-reload:

```bash
npm run dev
```

## ⚙️ Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `USER_ADDRESS` | Wallet address of the trader you want to copy | `0x1234...5678` |
| `PROXY_WALLET` | Your Polymarket wallet address | `0xabcd...efgh` |
| `PRIVATE_KEY` | Your wallet's private key (keep secure!) | `0x1234...` |
| `CLOB_HTTP_URL` | Polymarket CLOB API endpoint | `https://clob.polymarket.com/` |
| `CLOB_WS_URL` | Polymarket WebSocket endpoint | `wss://ws-subscriptions-clob.polymarket.com/ws` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `RPC_URL` | Polygon RPC endpoint | `https://polygon-mainnet.infura.io/v3/...` |
| `USDC_CONTRACT_ADDRESS` | USDC contract on Polygon | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FETCH_INTERVAL` | Polling interval in seconds | `1` |
| `TOO_OLD_TIMESTAMP` | Maximum age of trades to process (hours) | `24` |
| `RETRY_LIMIT` | Maximum retry attempts for failed trades | `3` |

## 💻 Usage

### Starting the Bot

1. Ensure all environment variables are configured correctly
2. Verify MongoDB connection is accessible
3. Run the build command: `npm run build`
4. Start the bot: `npm run start`

### Monitoring

The bot will display:
- Target trader wallet address
- Your wallet address
- Trade monitor status
- New transactions found
- Trade execution results
- Balance information

### Stopping the Bot

Press `Ctrl+C` to gracefully stop the bot. The bot will save its current state to MongoDB.

## 🔧 How It Works

### Architecture

1. **Trade Monitor**: Polls Polymarket API at configured intervals to fetch new trades from the target trader
2. **Trade Executor**: Processes unexecuted trades from the database and executes them on your account
3. **Position Matching**: Compares your positions with the target trader's positions to determine trade strategy
4. **Order Execution**: Places orders using Polymarket's CLOB API with proportional sizing

### Workflow

```
1. Monitor → Fetch target trader's trades
2. Store → Save trades to MongoDB
3. Analyze → Compare positions and balances
4. Execute → Place proportional orders
5. Retry → Handle failed trades automatically
```

## 📈 Trading Strategies

The bot implements three trading strategies:

### 1. Buy Strategy
- Calculates position size based on balance ratio: `your_balance / (target_balance + trade_size)`
- Validates market price (skips if ask price > original price + 0.05)
- Executes buy orders using best available ask prices

### 2. Sell Strategy
- Calculates proportional sell size based on position ratios
- Executes sell orders using best available bid prices
- Handles partial position sells

### 3. Merge Strategy
- Sells existing positions when target trader merges
- Executes sell orders to close positions
- Handles position liquidation

## 🌐 Deployment

### VPS Recommendations

For optimal performance and to avoid IP-based restrictions, consider deploying on a VPS:

**Recommended Provider**: [TradingVPS.io](https://app.tradingvps.io/link.php?id=11)
- **Location**: Germany (lowest latency to Polymarket servers)
- **Benefits**: 
  - Ultra-low latency
  - Optimized for trading applications
  - Avoids geographic IP restrictions
  - Easy setup and management

### Production Deployment

1. Set up a VPS or cloud server
2. Install Node.js and MongoDB
3. Clone the repository
4. Configure environment variables securely
5. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start dist/index.js --name polymarket-bot
   pm2 save
   pm2 startup
   ```

## 🔍 Troubleshooting

### Common Issues

**Bot not detecting trades**
- Verify `USER_ADDRESS` is correct
- Check `FETCH_INTERVAL` is not too high
- Ensure MongoDB connection is working

**Trades not executing**
- Verify `PRIVATE_KEY` is correct
- Check wallet has sufficient USDC balance
- Verify RPC endpoint is accessible
- Check `RETRY_LIMIT` if trades are failing

**MongoDB connection errors**
- Verify `MONGO_URI` is correct
- Check network connectivity
- Ensure MongoDB server is running

**API errors**
- Verify `CLOB_HTTP_URL` is correct
- Check API key permissions
- Ensure wallet is properly configured

### Debug Mode

Enable verbose logging by checking console output. The bot logs:
- Trade detection events
- Order execution attempts
- Balance information
- Error messages

## 🔒 Security

### Best Practices

1. **Never commit `.env` file** - Add it to `.gitignore`
2. **Use environment variables** - Never hardcode credentials
3. **Secure private keys** - Store in encrypted vaults for production
4. **Limit API permissions** - Use read-only keys where possible
5. **Regular updates** - Keep dependencies updated
6. **Monitor activity** - Regularly check bot activity and balances

### Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Private keys are not exposed in code
- [ ] MongoDB connection uses authentication
- [ ] RPC endpoint uses API keys
- [ ] Regular security audits of dependencies

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development

```bash
# Install dependencies
npm install

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Run in development mode
npm run dev
```

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/vladmeer/polymarket-copy-trading-bot/issues)
- **Telegram**: [Contact Developer](https://t.me/vladmeer67)
- **Documentation**: See `Polymarket Copy Trading Bot Documentation.pdf`

## ⚠️ Disclaimer

This software is provided "as is" without warranty of any kind. Trading cryptocurrencies and prediction markets involves substantial risk of loss. Use this bot at your own risk. The developers are not responsible for any financial losses incurred from using this software.

## 📄 License

This project is licensed under the ISC License.

---

<div align="center">

**Made with ❤️ for the Polymarket community**

⭐ If you find this project helpful, please consider giving it a star!

</div>
