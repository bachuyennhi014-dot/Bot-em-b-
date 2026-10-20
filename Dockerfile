# Dockerfile for 24/7 Discord Bot
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++

# Copy package specifications
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy all source code
COPY . .

# Create persistent data and logs directory
RUN mkdir -p /app/data /app/logs

# Define volume for persistent database
VOLUME ["/app/data"]

# Environment variables
ENV NODE_ENV=production

# Start the bot
CMD ["node", "bot.js"]
