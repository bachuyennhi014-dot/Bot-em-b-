# Dockerfile for 24/7 Discord Bot
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package specifications and npm config
COPY package*.json ./
COPY .npmrc ./

# Install production dependencies
RUN npm install --omit=dev --legacy-peer-deps

# Copy all source code
COPY . .

# Create persistent data and logs directory
RUN mkdir -p /app/data /app/logs

# Define volume for persistent database
VOLUME ["/app/data"]

# Expose HTTP port for Render web service health checks
EXPOSE 10000

# Environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Start the bot
CMD ["node", "bot.js"]
