# Discord Charms Airdrop Bot

A TypeScript Discord bot with airdrop functionality inspired by [bro.charms.dev](https://bro.charms.dev). Features proof-of-work mining, wallet management, and token distribution.

## Features

- 🎁 **Token System**: Token balance, tipping, and transfers
- 💰 **Wallet Management**: Automatic wallet creation with seed phrases and QR codes
- 📊 **Leaderboard**: Track top users by balance, mining, or tipping
- 🔐 **Secure**: Private key and seed phrase management
- 📈 **Statistics**: Track mining performance, tipping, and rewards
- ₿ **Bitcoin Integration**: Send and receive Bitcoin transactions on testnet4
- 🔍 **Blockchain Queries**: Query tokens, transactions, and charms.dev Token Standard spells
- 📱 **QR Codes**: All addresses include QR codes for easy scanning

## Commands

### 🔐 Wallet & Balance Commands

- `/help` - Show all available commands and their descriptions
- `/wallet` - Get your wallet address and balance (with QR code)
- `/balance` - Check your token balance and statistics
- `/stats` - View your personal statistics (mining, tipping, etc.)
- `/clear` - Clear all your data (wallet, balance, mining history)

### 💰 Token & Social Commands

- `/tip [user] [amount] [message]` - Tip your tokens to another user
  - `user` (required) - User to tip
  - `amount` (required) - Amount of tokens to tip (minimum: 1)
  - `message` (optional) - Optional message with the tip
- `/leaderboard [type]` - View community leaderboard
  - `type` (optional) - Leaderboard type: `balance`, `mining`, or `tipping` (default: balance)
- `/transfer-token [recipient] [amount]` - Transfer tokens to another address
  - `recipient` (required) - Recipient address (Primary, Secondary, or Custom)
  - `custom_address` (optional) - Custom recipient address (if 'Custom address' selected)
  - `amount` (optional) - Amount of tokens to transfer (default: 69420)

### ₿ Bitcoin Transaction Commands

- `/send-myself` - Send Bitcoin from your address to itself
- `/send [address] [amount]` - Send Bitcoin to another address on testnet4
  - `address` (optional) - Recipient address (default: tb1pyry0g642yr7qlhe82qd342lr0aztywhth62lnjttxgks8wmgsc9svf9xx2)
  - `amount` (optional) - Amount to send in satoshis (leave empty to send max minus fees, minimum: 546)
- `/sendto [address] [amount]` - Send Bitcoin transaction (like bitcoin-cli sendtoaddress)
  - `address` (required) - Recipient Bitcoin address
  - `amount` (optional) - Amount to send in satoshis (leave empty to send max minus fees, minimum: 546)
- `/transactions [limit]` - Get transaction history for your wallet
  - `limit` (optional) - Number of transactions to retrieve (default: 5, max: 20)

### 🔍 Query & Analysis Commands

- `/query-tokens [app_id] [app_vk] [token_utxo] [witness_utxo]` - Query token information using app identity and UTXOs
  - `app_id` (optional) - App identity (from original witness UTXO)
  - `app_vk` (optional) - App verification key
  - `token_utxo` (optional) - Token UTXO (format: txid:vout)
  - `witness_utxo` (optional) - Original witness UTXO (format: txid:vout)
- `/tx-raw [txid]` - Get raw transaction data and parse charms.dev Token Standard spell
  - `txid` (optional) - Transaction ID (default: d8786af1e7e597d77c073905fd6fd7053e4d12894eefa19c5deb45842fc2a8a2)
- `/query-transfer-token [spell_txid]` - Query transfer-token addresses from a spell transaction
  - `spell_txid` (optional) - Spell transaction ID (default: 9a2d8b5cf1450e4591817ee818386e96c30bb6eb570e7b12c76320d3c3cb6ea4)
- `/btc-info` - Display Bitcoin technical data structures and types

## Setup

### Prerequisites

- Node.js 18+ installed
- Discord Bot Token ([create one here](https://discord.com/developers/applications))

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd discord-charms-airdrop-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Add your Discord bot token and default seed phrase to `.env`:
```
DISCORD_TOKEN=your_bot_token_here
DEFAULT_SEED_PHRASE=your twelve word seed phrase here
```

5. Enable the following bot permissions in Discord Developer Portal:
   - `applications.commands` (Slash Commands)
   - `bot` scope with permissions:
     - Send Messages
     - Use Slash Commands
     - Read Message History

### Running the Bot

**Development mode:**
```bash
npm run dev
```

**Production build:**
```bash
npm run build
npm start
```

## Deployment

### ⚠️ Important: Platform Selection

Discord bots require **persistent WebSocket connections**, which makes them incompatible with traditional serverless platforms like Vercel.

### Recommended Platforms

1. **Railway** (Recommended) - Easy deployment, persistent connections
2. **Render** - Simple setup, free tier available
3. **Fly.io** - Global distribution, Docker support

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway variables set DISCORD_TOKEN=your_token
railway variables set DEFAULT_SEED_PHRASE=your_seed_phrase
railway up
```

### Environment Variables

Set these in your deployment platform:
- `DISCORD_TOKEN` - Your Discord bot token
- `DEFAULT_SEED_PHRASE` - Your 12-word seed phrase

## How It Works

### 1. Getting Started
- Use `/wallet` to automatically create your wallet (if you don't have one)
- Your wallet includes a Bitcoin testnet4 address with QR code
- All addresses are displayed with QR codes for easy scanning

### 2. Token Management
- Check your balance with `/balance`
- Tip tokens to other users with `/tip`
- View leaderboards with `/leaderboard`
- Transfer tokens to addresses with `/transfer-token`

### 3. Bitcoin Transactions
- Send Bitcoin on testnet4 with `/send` or `/sendto`
- View transaction history with `/transactions`
- All transactions include QR codes for sender and recipient addresses

### 4. Blockchain Queries
- Query token information with `/query-tokens`
- Parse transaction spells with `/tx-raw`
- Query transfer-token addresses with `/query-transfer-token`
- All queries support the charms.dev Token Standard

## Architecture

```
src/
├── index.ts          # Main bot file with command handlers
├── wallet.ts         # Wallet creation and management
├── mining.ts         # Proof-of-work mining logic
├── airdrop.ts        # Token claiming and distribution
└── database.ts       # In-memory data storage
```

### Key Components

- **WalletManager**: Handles wallet creation, seed phrase generation, and key derivation
- **MiningManager**: Implements PoW algorithm to find best hashes
- **AirdropManager**: Manages token claims, balances, and statistics
- **DatabaseManager**: In-memory storage for user data (can be replaced with a real database)

## Customization

### Adjust Mining Rewards
Edit the reward calculation in `src/mining.ts`:
```typescript
private calculateReward(zeroBits: number): number {
  const baseReward = 1000000; // Adjust base reward
  const hashDifficulty = 12;  // Adjust difficulty
  
  const reward = (baseReward * Math.pow(zeroBits, 2)) / Math.pow(2, hashDifficulty);
  return Math.max(reward, 10); // Minimum reward
}
```

### Add Persistent Storage
Replace the in-memory `DatabaseManager` with a real database:
- PostgreSQL with Prisma
- MongoDB with Mongoose
- SQLite for simpler setups

### Add More Features
Consider adding:
- Token transfers between users
- Daily mining limits
- Special events with bonus rewards
- Integration with actual blockchain
- NFT rewards for top miners

## Network Information

- **Network**: Bitcoin Testnet4
- **Token Standard**: charms.dev Token Standard
- **Explorer**: [Mempool.space Testnet4](https://mempool.space/testnet4)
- **QR Codes**: All addresses include QR codes for easy scanning

## Security Notes

⚠️ **Important:**
- This bot uses in-memory storage - data is lost on restart
- For production use, implement proper database and security measures
- Never expose bot token or private keys
- Wallet addresses are shared across users (uses default wallet)
- All transactions are on Bitcoin testnet4 (not mainnet)

## License

MIT License - feel free to use and modify for your projects!

## Credits

Inspired by [Charms.dev](https://charms.dev) and [BRO Token](https://bro.charms.dev)
