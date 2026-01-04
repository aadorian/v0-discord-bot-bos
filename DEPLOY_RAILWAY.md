# Deploy to Railway - Step by Step Guide

## Prerequisites
- Railway account: [railway.app](https://railway.app)
- Discord bot token
- Default seed phrase

## Method 1: Using Railway CLI

### Step 1: Install Railway CLI

**Option A: Using npm (may require sudo)**
```bash
npm install -g @railway/cli
```

**Option B: Using Homebrew (macOS)**
```bash
brew install railway
```

**Option C: Using npx (no installation needed)**
```bash
# You can use npx instead of installing globally
npx @railway/cli login
```

### Step 2: Login to Railway

```bash
railway login
```

This will open your browser to authenticate.

### Step 3: Initialize Project

```bash
railway init
```

Choose:
- **New Project** (if first time)
- **Existing Project** (if you have one)

### Step 4: Set Environment Variables

```bash
# Set Discord bot token
railway variables set DISCORD_TOKEN=your_discord_bot_token_here

# Set default seed phrase
railway variables set DEFAULT_SEED_PHRASE="your twelve word seed phrase here"
```

**Important**: Replace with your actual values!

### Step 5: Deploy

```bash
railway up
```

This will:
- Build your project
- Deploy to Railway
- Start the bot

### Step 6: View Logs

```bash
railway logs
```

You should see:
```
✅ BOT Bot is ready! Logged in as YourBot#1234
✅ Successfully registered application commands.
```

## Method 2: Using Railway Dashboard (GitHub)

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### Step 2: Connect to Railway

1. Go to [railway.app](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your repository

### Step 3: Configure Environment Variables

1. In Railway dashboard, click on your service
2. Go to **"Variables"** tab
3. Add:
   - `DISCORD_TOKEN` = `your_discord_bot_token`
   - `DEFAULT_SEED_PHRASE` = `your twelve word seed phrase`

### Step 4: Deploy

Railway will automatically:
- Detect your Node.js project
- Run `npm install && npm run build` (from railway.json)
- Start with `npm start`
- Deploy your bot

### Step 5: Monitor

- Check **"Deployments"** tab for build status
- Check **"Logs"** tab for bot output
- Verify bot is online in Discord

## Verify Deployment

### Check Bot Status

1. **In Railway Dashboard**:
   - Service should show "Active"
   - Logs should show bot connected

2. **In Discord**:
   - Bot should appear online
   - Try `/help` command

### Common Issues

#### Build Fails
- Check logs for errors
- Ensure all dependencies are in package.json
- Verify TypeScript compiles locally first

#### Bot Not Responding
- Check `DISCORD_TOKEN` is correct
- Verify bot is invited to server
- Check Railway logs for errors

#### Environment Variables Missing
```bash
railway variables
```
Verify both variables are set.

## Useful Commands

```bash
# View project status
railway status

# View all variables
railway variables

# Set a variable
railway variables set KEY=value

# View logs (follow mode)
railway logs --follow

# Open Railway dashboard
railway open

# Connect to service shell
railway shell
```

## Updating Your Bot

After making changes:

```bash
git add .
git commit -m "Update bot"
git push
```

Railway will automatically redeploy if connected to GitHub, or:

```bash
railway up
```

## Cost

Railway free tier includes:
- $5 credit per month
- 500 hours of usage
- Perfect for Discord bots (runs 24/7 for ~$0.34/month)

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway

