# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Install openssl and other build deps
RUN apt-get update && apt-get install -y openssl python3 make g++ 

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Install openssl in production image
RUN apt-get update && apt-get install -y openssl

# Copy built assets and production dependencies
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Start the server
CMD ["npm", "start"]
