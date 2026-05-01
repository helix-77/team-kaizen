FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY . .
RUN npm run build 2>/dev/null || true

FROM node:20-alpine
WORKDIR /app
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
EXPOSE 3000
CMD ["node", "server.js"]
