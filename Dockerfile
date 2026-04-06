FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/.env.example ./

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npx", "tsx", "backend/server.ts"]
