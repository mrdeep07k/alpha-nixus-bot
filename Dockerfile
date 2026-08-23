# ============================================================
#  ALPHA NIXUS AFK BOT — Dockerfile
#  Creator: Deep Mallick (AKA Mr.Mallick)
#  Kaam karta hai: Fly.io, Koyeb, Railway, Docker, VPS, Pterodactyl
# ============================================================
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src ./src
COPY index.js ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "--max-old-space-size=200", "index.js"]
