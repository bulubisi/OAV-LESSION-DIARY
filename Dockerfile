# Step 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy all source files
COPY . .

# Build client and server bundles
RUN npm run build

# Step 2: Production Stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy built files from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port our Express server listens on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
