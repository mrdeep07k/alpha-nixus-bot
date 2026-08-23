# 🏗️ Architecture

> Technical overview of **ALPHA NIXUS** — for contributors and curious developers.
> *Creator: Deep Mallick (AKA Mr.Mallick)*

---

## 📦 Module map

```
index.js                 Entry point
 │
 ├─ slim()               Storage cleanup — trims minecraft-data 426MB → 15MB
 ├─ banner()             Console branding
 │
 ├─→ src/config.js       Env parsing + .env loader (zero deps)
 ├─→ src/logger.js       Console logging + IST time helpers
 ├─→ src/discord.js      Webhook queue → batched embeds (singleton)
 ├─→ src/web.js          HTTP status dashboard / health / logs
 └─→ src/bot.js          Connection manager (the brain)
      └─→ src/humanizer.js   Random movement engine
```

---

## 🔄 Connection lifecycle

```
        ┌──────────────┐
        │   connect()  │◄────────────────────────┐
        └──────┬───────┘                         │
               │ mineflayer.createBot()          │
               ▼                                 │
        ┌──────────────┐                         │
        │  'login'     │ ─► auth.begin()         │
        │              │ ─► Discord: ✅ join     │
        └──────┬───────┘                         │
               ▼                                 │
        ┌──────────────┐                         │
        │  'spawn'     │ ─► humanizer.start()    │
        │              │ ─► status timer         │
        └──────┬───────┘                         │
               │                                 │
     ┌─────────┼─────────┬──────────┐            │
     ▼         ▼         ▼          ▼            │
  'death'   'kicked'   'end'     'error'         │
     │         │         │          │            │
     └─────────┴────┬────┴──────────┘            │
                    ▼                            │
             cleanup() + scheduleReconnect()  ───┘
                 (random 2000–5000 ms)
```

### Failsafes

| Scenario | Handling |
|---|---|
| `spawn` never fires (some servers) | Movement starts anyway via `login-fallback` after ~20 s |
| Username already in use | Auto-rotates to the next name from the pool |
| Unhandled exception | `uncaughtException` handler → Discord alert → bot keeps running |
| RSS memory > 210 MB | Session refresh (protects 256 MB panels) |
| Discord returns `429` | Exponential retry honouring `retry_after` |

---

## 🔑 Authentication state machine

```
  spawn ──(AUTH_DELAY_MS)──► send /register
                                  │
      server says "already        │  server says
      registered / use /login"    │  "not registered"
                ▼                 ▼
            send /login      send /register
                │                 │
                └────────┬────────┘
                         ▼
             "success / logged in / welcome back"
                         ▼
                      DONE ✅
```

The bot **reads server chat** rather than blindly firing commands — so it works with AuthMe, nLogin, and most custom auth plugins. Retries are capped by `AUTH_MAX_RETRY` (default 4) so it never spams.

---

## 📨 Discord logging pipeline

```
  bot event ──► dc.push(type, text, severity)
                        │
                        ▼
                 ┌─────────────┐
                 │   queue[]   │  (max 80, FIFO)
                 └──────┬──────┘
                        │  flush triggers:
                        │   • timer      (LOG_FLUSH_SEC)
                        │   • count      (LOG_FLUSH_COUNT)
                        │   • critical   (death/kick/crash/ban)
                        │   • heartbeat  (LOG_HEARTBEAT_MIN)
                        ▼
              ┌─────────────────────┐
              │  minGapSec gate     │ ◄── hard anti-spam
              └──────────┬──────────┘
                         ▼
                  buildPayload()
                   • severity → embed colour
                   • events → code-block, IST times
                   • live state → 8 fields
                   • footer watermark
                         ▼
                   https POST (429-aware)
```

**Severity → colour**

| Severity | Colour | Used for |
|---|---|---|
| `good` | 🟢 `#22c55e` | join, auth success, boot |
| `info` | 🔵 `#3b82f6` | rotation, routine notices |
| `warn` | 🟠 `#f59e0b` | death, disconnect, kick |
| `crit` | 🔴 `#ef4444` | crash, ban, wrong password |

---

## 🎭 Humanizer action pool

Probability distribution per tick (tick gap = random `2.5 s – 11 s`):

| Action | Chance | Detail |
|---|---|---|
| `walk` | 30 % | Random direction, 0.4–2.2 s, 35 % sprint chance |
| `jump` | 15 % | 1–3 hops, randomised timing |
| `lookAround` | 13 % | Full-range yaw, ±0.9 pitch |
| `swing` | 10 % | Arm swing |
| `sneak` | 10 % | 0.3–1.5 s |
| `hotbar` | 8 % | Random slot 1–9 |
| `spin` | 7 % | 3–7 chained look steps |
| `idle` | 7 % | Deliberate pause |

Plus two independent loops:
- **Look loop** — every 1.8–7 s
- **Anti-AFK pulse** — guaranteed jump + swing every 20–45 s

Nothing is on a fixed interval; every delay is drawn fresh from a random range.

---

## 🧠 Memory profile

| Component | Approx |
|---|---|
| Node runtime baseline | ~40 MB |
| mineflayer + protocol | ~35 MB |
| World chunks (`viewDistance: tiny`) | ~30 MB |
| **Total RSS** | **~105–130 MB** |
| Heap ceiling | 200 MB (`--max-old-space-size`) |
| Auto-refresh trigger | 210 MB RSS |

## 💾 Disk profile

| Stage | Size |
|---|---|
| Fresh `npm install` | 464 MB |
| After auto-slim | **51 MB** |
| Source code | 137 KB |

---

## 🧪 Testing notes

The bot was validated against a synthetic `minecraft-protocol` server and a local HTTPS webhook receiver:

- ✅ Join → `/register` → "Successfully registered" → auth marked done
- ✅ 13 failed reconnects produced only **2** Discord messages (anti-spam)
- ✅ Fresh install → slim → boot → reconnect loop
- ✅ Graceful `SIGTERM` sends exactly one final report
- ✅ All humanizer actions exercised against a mock bot with zero unhandled rejections
