# Deployment Guide

## ⚠️ Important: Discord Bot Deployment Considerations

Discord bots require **persistent WebSocket connections** to Discord's gateway. This makes them incompatible with traditional serverless platforms like Vercel, which are designed for HTTP request/response patterns.

## Recommended Platforms for Discord Bots

### 1. **Railway** (Recommended) ⭐
- **Best for**: Easy deployment, automatic HTTPS, persistent connections
- **Free tier**: Yes (with limits)
- **Setup**: Connect GitHub repo, Railway auto-detects Node.js

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### 2. **Render**
- **Best for**: Simple deployments, free tier available
- **Free tier**: Yes (spins down after inactivity)
- **Setup**: Connect GitHub, select "Web Service", set build/start commands

**Build Command**: `npm install && npm run build`  
**Start Command**: `npm start`

### 3. **Fly.io**
- **Best for**: Global distribution, Docker support
- **Free tier**: Yes
- **Setup**: Uses Dockerfile

### 4. **Heroku**
- **Best for**: Traditional PaaS
- **Free tier**: Discontinued, paid only
- **Setup**: Git-based deployment

## Vercel Deployment (Not Recommended)

Vercel is **not suitable** for Discord bots because:
- Functions are stateless and short-lived
- No persistent WebSocket connections
- Functions timeout after execution
- Discord bots need 24/7 connection

### If You Must Use Vercel

You would need to:
1. Restructure bot to use webhooks instead of WebSocket
2. Use Vercel Cron to ping endpoints periodically
3. Accept that the bot won't respond in real-time

**This is not recommended for production Discord bots.**

## Environment Variables

Set these in your deployment platform:

```
DISCORD_TOKEN=your_bot_token_here
DEFAULT_SEED_PHRASE=your twelve word seed phrase here
```

## Railway Deployment Steps

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Initialize project**:
   ```bash
   railway init
   ```

4. **Set environment variables**:
   ```bash
   railway variables set DISCORD_TOKEN=your_token
   railway variables set DEFAULT_SEED_PHRASE=your_seed_phrase
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

## Render Deployment Steps

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: discord-bot
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables in the dashboard
6. Deploy

## Docker Deployment (Fly.io, Railway, etc.)

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

CMD ["npm", "start"]
```

## Monitoring

After deployment, monitor:
- Bot connection status
- Memory usage
- Response times
- Error logs

## Troubleshooting

### Bot Not Responding
- Check if bot is online in Discord
- Verify environment variables are set
- Check logs for connection errors

### Connection Issues
- Ensure platform supports persistent connections
- Check firewall/network settings
- Verify Discord token is valid

### Build Failures
- Ensure all dependencies are in `package.json`
- Check Node.js version compatibility
- Review build logs for errors

