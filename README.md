# Eigen Agent: Autonomous Prediction Market Agent

Eigen Agent is a modular, autonomous agent designed to observe real-world events, evaluate their suitability for prediction markets, and automatically create and participate in those markets on the Solana blockchain.

## Overview

The agent operates in continuous cycles, leveraging the **Grok-3** LLM for high-level reasoning and the **PNP SDK** for blockchain interactions. It is built with **NestJS** for a robust, scalable architecture.

## Architecture

The agent is divided into four core modular components:

### 1. Watcher
- **Function**: Monitors global events (Sports, Politics, etc.).
- **Logic**: Uses Grok-3 to identify high-impact, verifiable trending topics.
- **Output**: A set of candidate "signals" with expected resolution dates.

### 2. Decider
- **Function**: Filters and validates signals.
- **Logic**: Evaluates signals for binary resolvability (YES/NO), safety, and clarity.
- **Output**: Approves exactly one high-quality market per cycle.

### 3. Creator
- **Function**: Deploys the market on-chain.
- **Logic**: Uses the PNP SDK to create a V2 AMM market on Solana.
- **Output**: A live prediction market address.

### 4. Trader (Coming Soon)
- **Function**: Participates in created markets.
- **Logic**: Analyzes sentiment and executes trades based on perceived bias.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/)
- **AI Model**: [Grok-3](https://x.ai/blog/grok-3) (via x.ai API)
- **Blockchain**: Solana
- **SDK**: PNP SDK (Plug-and-Play Prediction Markets)

## Setup & Execution

### Prerequisites
- Node.js & npm
- Solana Wallet with USDC/SOL
- Grok API Key

### Installation
```bash
npm install
```

### Configuration
Create a `.env` file based on `.env.example`:
```env
GROK_API_KEY=your_key_here
PRIVATE_KEY=your_solana_private_key
MOCK_MODE=false
```

### Running the Agent
```bash
# Start the agent (runs every hour via cron)
npm run start:dev
```

## License
MIT
