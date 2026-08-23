/**
 * ============================================================
 *  ALPHA NIXUS AFK BOT  |  src/config.js
 *  Creator : Deep Mallick  (AKA Mr.Mallick)
 * ============================================================
 */
'use strict';

/* ---------- mini .env loader (koi extra package nahi) ---------- */
try {
  const fs = require('fs');
  const path = require('path');
  for (const f of [path.join(__dirname, '..', '.env'), path.join(process.cwd(), '.env')]) {
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const v = m[2].trim().replace(/^["']|["']$/g, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
    break;
  }
} catch (_) { /* ignore */ }

const num = (v, d) => (Number.isFinite(Number(v)) && String(v).trim() !== '' ? Number(v) : d);
const bool = (v, d) => (v === undefined || v === '' ? d : /^(true|1|yes|on)$/i.test(String(v)));

function buildNames() {
  if (process.env.BOT_NAMES && process.env.BOT_NAMES.trim()) {
    return process.env.BOT_NAMES.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
  }
  const base = process.env.BOT_NAME_BASE || 'ALPHA_NIXUS';
  const count = Math.max(1, Math.min(10, num(process.env.BOT_NAME_COUNT, 5)));
  return Array.from({ length: count }, (_, i) => `${base}${i + 1}`);
}

module.exports = {
  brand: {
    name: 'ALPHA NIXUS',
    creator: 'Deep Mallick',
    alias: 'Mr.Mallick',
    watermark: 'ALPHA NIXUS • Deep Mallick (Mr.Mallick)',
    version: '2.0.0',
    github: 'https://github.com/mrdeep07k/alpha-nixus-bot',
  },

  server: {
    host: process.env.MC_HOST || 'localhost',
    port: num(process.env.MC_PORT, 25565),
    version: process.env.MC_VERSION || '1.12.1',
    auth: 'offline',
  },

  names: buildNames(),
  rotateHours: num(process.env.ROTATE_HOURS, 3),
  rotateJitterMin: num(process.env.ROTATE_JITTER_MIN, 25),

  auth: {
    // auto = server ka message padh kar khud decide | login | register | none
    mode: (process.env.AUTH_MODE || 'auto').toLowerCase(),
    password: process.env.AUTH_PASSWORD || 'AlphaNixus@123',
    registerCmd: process.env.REGISTER_CMD || '/register {pass} {pass}',
    loginCmd: process.env.LOGIN_CMD || '/login {pass}',
    firstDelayMs: num(process.env.AUTH_DELAY_MS, 4000),
    retryMs: num(process.env.AUTH_RETRY_MS, 6000),
    maxRetry: num(process.env.AUTH_MAX_RETRY, 7),
  },

  // Server ke chat messages console/Discord me mirror karo (debugging ke liye)
  debug: {
    serverChat: bool(process.env.LOG_SERVER_CHAT, true),
    // join ke baad itne second tak chat mirror karo (0 = hamesha)
    chatWindowSec: num(process.env.LOG_CHAT_WINDOW_SEC, 90),
  },

  reconnect: {
    minMs: num(process.env.RECONNECT_MIN_MS, 2000),
    maxMs: num(process.env.RECONNECT_MAX_MS, 5000),
  },

  human: {
    enabled: bool(process.env.HUMAN_MODE, true),
    minGapMs: num(process.env.ACTION_MIN_MS, 2500),
    maxGapMs: num(process.env.ACTION_MAX_MS, 11000),
    chat: bool(process.env.HUMAN_CHAT, false),
    chatEveryMin: num(process.env.CHAT_EVERY_MIN, 25),
  },

  /* ---------------- DISCORD WEBHOOK LOGGING ---------------- */
  discord: {
    webhook: (process.env.DISCORD_WEBHOOK || '').trim(),
    enabled: !!(process.env.DISCORD_WEBHOOK || '').trim(),
    // itne second me ek baar batch bhejo (spam se bachne ke liye)
    flushSec: num(process.env.LOG_FLUSH_SEC, 120),
    // itne events jama ho jaayein to turant bhej do
    flushCount: num(process.env.LOG_FLUSH_COUNT, 12),
    // do messages ke beech kam se kam itna gap (hard anti-spam)
    minGapSec: num(process.env.LOG_MIN_GAP_SEC, 45),
    // kuch na ho tab bhi itne minute me ek "sab theek hai" report
    heartbeatMin: num(process.env.LOG_HEARTBEAT_MIN, 60),
    // critical event (death / kick / crash) turant bheje?
    instantCritical: bool(process.env.LOG_INSTANT_CRITICAL, true),
    name: process.env.LOG_BOT_NAME || 'ALPHA NIXUS',
    avatar: process.env.LOG_AVATAR_URL || '',
    mention: (process.env.LOG_MENTION || '').trim(), // e.g. <@&1234567890>
    // in events ke liye mention karo
    mentionOn: (process.env.LOG_MENTION_ON || 'crash,ban').split(',').map((s) => s.trim()),
  },

  timezone: process.env.TZ_NAME || 'Asia/Kolkata',

  web: {
    port: num(process.env.PORT || process.env.SERVER_PORT, 3000),
  },
};
