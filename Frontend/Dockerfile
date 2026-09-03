# Stage 1: Build React/Vite application
FROM node:22-alpine AS build

WORKDIR /app

# Copy package manifests and install dependencies
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build argument for backend API URL (default to localhost:3000 for browser access)
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle to /app/dist
RUN npm run build

# Stage 2: Serve production bundle with Nginx
FROM nginx:alpine

# Copy built static assets from builder stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose standard HTTP port
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
