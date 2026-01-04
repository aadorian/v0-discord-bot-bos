// Vercel serverless function wrapper for Discord bot
// Note: This is a workaround - Discord bots work better on platforms that support persistent connections

const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// This approach has limitations:
// 1. Vercel functions are stateless and short-lived
// 2. Discord bots need persistent WebSocket connections
// 3. Consider using Railway, Render, or Fly.io instead

let botClient = null;

async function initializeBot() {
  if (botClient && botClient.isReady()) {
    return botClient;
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });

  // Import and setup bot logic
  // Note: You'll need to restructure your bot to work in this serverless context
  
  await client.login(process.env.DISCORD_TOKEN);
  botClient = client;
  
  return client;
}

module.exports = async (req, res) => {
  // Health check endpoint
  if (req.method === 'GET') {
    try {
      const client = await initializeBot();
      return res.status(200).json({ 
        status: 'ok', 
        botReady: client.isReady(),
        message: 'Discord bot is running (serverless mode - may have limitations)'
      });
    } catch (error) {
      return res.status(500).json({ 
        status: 'error', 
        error: error.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

