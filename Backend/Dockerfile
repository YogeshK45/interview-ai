# Use Node.js 22 LTS on Debian Bookworm Slim for engine & Chromium compatibility
FROM node:22-bookworm-slim

# Install Chromium and necessary system dependencies/fonts for Puppeteer PDF rendering
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Configure Puppeteer environment and symlink for fallback compatibility in ai.service.js
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN ln -sf /usr/bin/chromium /usr/bin/google-chrome

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 3000

# Set production environment
ENV NODE_ENV=production

# Start the server
CMD ["node", "server.js"]
