FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./
COPY index.js db.js Product.js seed.js rabbitmq.js ./
EXPOSE 3002
CMD ["node", "index.js"]

# # ---- Stage 1: Build/install dependencies ----
# FROM node:20-alpine AS builder

# WORKDIR /app

# # Copy only package files first so Docker can cache this layer
# # when only source code changes, not dependencies
# COPY package.json package-lock.json ./

# # Install ONLY production dependencies (skip devDependencies like jest/mongodb-memory-server)
# RUN npm ci --omit=dev

# # ---- Stage 2: Runtime ----
# FROM node:20-alpine AS runtime

# WORKDIR /app

# # Create a non-root user/group to run the app
# RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# # Copy installed node_modules from the builder stage (not reinstalling here)
# COPY --from=builder /app/node_modules ./node_modules

# # Copy application source code
# COPY package.json ./
# COPY index.js db.js Product.js seed.js rabbitmq.js ./

# # Switch to non-root user before running the app
# USER appuser

# # Document the port the app listens on
# EXPOSE 3002

# # Basic healthcheck hitting a /health route (confirm this route exists in index.js —
# # if not, either add one or point this at another lightweight GET route)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#     CMD node -e "require('http').get('http://localhost:3002/health', res => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# CMD ["node", "index.js"]
