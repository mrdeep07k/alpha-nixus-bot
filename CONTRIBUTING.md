# 🤝 Contributing to ALPHA NIXUS

Contributions ka swagat hai! Chhota typo fix ho ya bada feature — sab welcome.

## 🚀 Quick start

```bash
git clone https://github.com/mrdeep07k/alpha-nixus-bot.git
cd alpha-nixus-bot
npm install
cp .env.example .env    # apni test server details bharo
npm start
```

## 📐 Code guidelines

| Rule | Why |
|---|---|
| **Zero new dependencies** jab tak bilkul zaruri na ho | Bot 256 MB panels par chalta hai |
| Har naya file `'use strict'` se shuru | Consistency |
| Async errors hamesha `try/catch` ya `.catch()` me | Bot kabhi crash nahi hona chahiye |
| Timers hamesha `clear` karo cleanup me | Memory leak se bachne ke liye |
| User-facing logs Hinglish me, code comments bhi | Project ki audience Indian players hai |
| Passwords / tokens kabhi log mat karo | `mask()` helper use karo |

## ✅ PR bhejne se pehle

```bash
node --check index.js
for f in src/*.js; do node --check "$f"; done
```

Aur local par kam se kam 2 minute bot chala ke dekh lo ki reconnect + movement theek hai.

## 🐛 Bug report

[Issue template](https://github.com/mrdeep07k/alpha-nixus-bot/issues/new/choose) use karo aur console logs zaroor daalo (password hata ke!).

## 📜 License

Contribute karke tum maante ho ki tumhara code **MIT License** ke under release hoga.

---

*Maintained by **Deep Mallick** (AKA **Mr.Mallick**)*
