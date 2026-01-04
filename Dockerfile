# Dockerfile for Discord Bot
# Can be used with Railway, Fly.io, Render, or any Docker-compatible platform

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]

