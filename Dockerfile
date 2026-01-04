# Dockerfile for Discord Bot
# Can be used with Railway, Fly.io, Render, or any Docker-compatible platform

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for TypeScript build)
RUN npm ci

# Copy source files
COPY src ./src

# Build TypeScript
RUN npm run build

# Remove devDependencies to reduce image size (optional optimization)
RUN npm prune --production

# Expose port (if needed for health checks)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]

