FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src/ ./src/

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev && rm -rf /root/.npm
COPY --from=builder /app/src ./src/
EXPOSE 8002
CMD ["node", "src/index.js"]