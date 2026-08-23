# 🌍 Hosting Guide

> Kahan aur kaise host karein — **ALPHA NIXUS** 24/7 chalane ke saare tareeke.
> *Creator: Deep Mallick (AKA Mr.Mallick)*

---

## 📊 Quick comparison

| Host | Free? | Sach me 24/7? | Ban risk | Difficulty |
|---|---|---|---|---|
| 🥇 **Oracle Cloud** (Always Free VM) | ✅ forever | ✅✅ | 🟢 zero | ⭐⭐⭐ |
| 🥈 **bot-hosting.net** / Sillydev / Katabump | ✅ | ✅ | 🟢 low | ⭐ |
| 🥉 **Fly.io** | 💳 card | ✅ | 🟡 low | ⭐⭐ |
| **Koyeb** | ✅ 1 service | ✅ | 🟡 medium | ⭐⭐ |
| **Railway** | $5 credit/mo | ✅ till credit | 🟢 low | ⭐ |
| **Apna PC / Raspberry Pi** | ✅ | PC on ho to | 🟢 zero | ⭐ |
| ❌ ~~Render / Vercel / Netlify~~ | – | ❌ | 🔴 **high** | – |

> ### ⚠️ Render jaise web hosts kyun nahi?
> Wo free instances ko idle rakhna chahte hain. Ek bot jo 24/7 TCP connection rakhta hai aur keep-alive pings bhejta hai, unke fraud-detection ko **"suspicious activity"** lagta hai — account suspend ho jata hai. Bot me koi galti nahi, bas platform ka use-case alag hai.

---

## 🥇 Oracle Cloud — Always Free VM *(best)*

Poora Linux VPS, hamesha free (trial nahi), 4 ARM cores + 24 GB RAM tak. Machine tumhari, isliye **ban ka risk zero**.

### Setup

1. [cloud.oracle.com](https://cloud.oracle.com) par free account banao
   *(card sirf verification ke liye — Always Free resources par charge nahi hota)*
2. **Compute → Instances → Create Instance**
   - Shape: **Ampere A1 (ARM)** — 1 OCPU / 6 GB kaafi hai
   - Image: **Ubuntu 22.04**
   - SSH key save kar lo
3. SSH karo aur ye chalao:

```bash
# Node.js 20
sudo apt update && sudo apt install -y git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Bot
git clone https://github.com/mrdeep07k/alpha-nixus-bot.git
cd alpha-nixus-bot
npm install
cp .env.example .env
nano .env                 # MC_HOST, AUTH_PASSWORD, DISCORD_WEBHOOK bharo

# 24/7 process manager
sudo npm i -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup               # jo command output me aaye, usse copy-paste karo
```

### Rozana kaam

```bash
pm2 logs alpha-nixus-bot      # live logs
pm2 restart alpha-nixus-bot   # restart
pm2 monit                     # CPU / RAM monitor
pm2 stop alpha-nixus-bot      # band karo
```

### Update karna

```bash
cd alpha-nixus-bot
git pull
npm install
pm2 restart alpha-nixus-bot
```

---

## 🥈 Bot panels — bot-hosting.net, Sillydev, Katabump, Puggy

Ye platforms **bots ke liye hi bane** hain, isliye AFK bot chalana allowed hai.

### Setup

| Setting | Value |
|---|---|
| **Type** | Application |
| **Source** | GitHub → `mrdeep07k/alpha-nixus-bot` |
| **Branch** | `main` (+ "pull on restart" ON) |
| **Runtime** | Node.js 20 |
| **Startup file** | `index.js` |
| **Install command** | `npm install --no-fund --no-audit` |
| **RAM** | 256 MB kaafi hai |
| **Storage** | ~55 MB (auto cleanup ke baad) |

### Env variables (panel ke **Env** tab me)

```
MC_HOST=play.yourserver.net
MC_PORT=25565
MC_VERSION=1.12.1
AUTH_PASSWORD=YourPassword123
DISCORD_WEBHOOK=https://discord.com/api/webhooks/xxxx/yyyy
BOT_NAME_BASE=ALPHA_NIXUS
BOT_NAME_COUNT=5
ROTATE_HOURS=3
HUMAN_MODE=true
```

> ℹ️ Panel ke **system** variables (`SERVER_PORT`, `STARTUP_FILE`) ko haath mat lagao — bot unhe khud handle kar leta hai.

---

## 🥉 Fly.io

`fly.toml` repo me ready hai (`auto_stop_machines = false` — bot kabhi sota nahi).

```bash
# CLI install
curl -L https://fly.io/install.sh | sh          # Linux / Mac
# iwr https://fly.io/install.ps1 -useb | iex    # Windows PowerShell

fly auth signup
cd alpha-nixus-bot
fly launch --no-deploy        # app name: alpha-nixus-bot

# secrets (password kabhi code/repo me mat daalo)
fly secrets set \
  MC_HOST=play.yourserver.net \
  AUTH_PASSWORD=YourPassword123 \
  DISCORD_WEBHOOK=https://discord.com/api/webhooks/xxxx/yyyy

fly deploy
fly logs
```

---

## 🐳 Docker (kahin bhi)

```bash
docker build -t alpha-nixus .

docker run -d --name alpha-nixus --restart unless-stopped \
  -e MC_HOST=play.yourserver.net \
  -e MC_PORT=25565 \
  -e MC_VERSION=1.12.1 \
  -e AUTH_PASSWORD=YourPassword123 \
  -e DISCORD_WEBHOOK=https://discord.com/api/webhooks/xxxx/yyyy \
  -p 3000:3000 \
  alpha-nixus

docker logs -f alpha-nixus
```

---

## 💻 Apna PC / Raspberry Pi

Bilkul free, zero ban risk. Raspberry Pi sirf ~3 watt kha ta hai — 24/7 chalane ke liye perfect.

```bash
git clone https://github.com/mrdeep07k/alpha-nixus-bot.git
cd alpha-nixus-bot
npm install
cp .env.example .env      # details bharo
npm start
```

Background me chalane ke liye:

```bash
npm i -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup               # Windows par: npm i -g pm2-windows-startup && pm2-startup install
```

---

## 🛡️ Ban se bachne ke rules

1. **Keep-alive pings mat lagao** general web hosts par — wahi suspension ki wajah banta hai. Aisa host lo jo sleep karta hi nahi.
2. **Ek account = ek service.** Multiple free accounts banane par permanent ban milta hai.
3. **Honest description** rakho — "Minecraft utility bot", chhupao mat.
4. **Sirf apne server** par bot chalao, ya jahan owner ne permission di ho.
5. `HUMAN_CHAT` default **OFF** hi rehne do — chat spam sabse jaldi ban karwata hai.
