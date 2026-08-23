# 📜 Changelog

All notable changes to **ALPHA NIXUS** are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/) · Versioning follows [SemVer](https://semver.org/).

---

## [2.0.0] — 2026-08-24

### ✨ Added
- **Discord Webhook logging** — batched rich embeds, zero local storage
  - Events: boot, join, auth, death (killer detect), disconnect, kick + reason, name rotation, error, crash, ban
  - IST (`Asia/Kolkata`) timestamps on every line
  - Live status fields: health, food, position, players, uptime, session stats, RAM
  - Anti-spam engine: batching, min-gap, critical-instant, hourly heartbeat
  - Discord `429` rate-limit auto-handling with retry
  - Optional role mention on crash / ban
- **Automatic storage cleanup** — trims `minecraft-data` from **426 MB → ~15 MB** on first boot
- **Guaranteed anti-AFK pulse** every 20–45 s (never AFK-kicked)
- **Movement fallback** — engine starts even if the `spawn` event never fires
- Smart error hints (`ECONNREFUSED` → "server band hai ya port galat")
- Wrong-password detection with a clear alert
- CI workflow (Node 18 / 20 / 22), issue & PR templates, contributing docs

### ♻️ Changed
- Full source restructure: `src/bot.js`, `src/discord.js`, `src/humanizer.js`, `src/web.js`, `src/config.js`, `src/logger.js`
- Entry point moved to root `index.js` (panel-friendly)
- Memory ceiling lowered to **200 MB** heap for 256 MB free panels
- `SERVER_PORT` support (Pterodactyl-style panels)
- Graceful shutdown now sends exactly one final report

### 🗑️ Removed
- All Render-specific files and keep-alive/self-ping logic
  *(Render suspends accounts running AFK bots — see README)*

### 🐛 Fixed
- Webhook URLs with a custom port were ignored
- `bot.look()` promise rejections could silently stall movement
- Duplicate Discord message on shutdown

---

## [1.0.0] — 2026-08-23

### ✨ Added
- Initial release: 24/7 Minecraft **1.12.1** AFK bot
- Auto `/register` + `/login` (AuthMe-aware)
- Random human-like movement engine
- Auto reconnect in 2–5 s, auto respawn on death
- Username rotation `ALPHA_NIXUS1…5` with random jitter
- Web status dashboard + `/health` + `/logs`
