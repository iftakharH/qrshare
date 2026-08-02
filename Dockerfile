# Stage 1: Build Frontend Client
# Use Debian Slim (glibc) instead of Alpine (musl libc).
# LightningCSS (a Vite/TailwindCSS dependency) ships platform-specific native
# binaries. Alpine uses musl libc, which requires a separate 'musl' binary that
# is often NOT installed by npm ci from a cross-platform lockfile. Debian Slim
# uses glibc, which is the standard Linux ABI and works reliably.
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Production Node Server & Static Host
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

EXPOSE 3000

CMD ["node", "server/index.js"]
