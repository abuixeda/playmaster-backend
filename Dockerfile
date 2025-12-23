# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install dependencies (incorporating lockfile if present)
COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (including devDeps for build)
RUN npm install

# Generate Prisma Client
RUN npm run prisma:generate

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production Stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm install --only=production

# Copy built artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Generate Prisma Client for production
RUN npm run prisma:generate

# Expose port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
