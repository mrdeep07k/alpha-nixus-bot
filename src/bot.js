/**
 * ============================================================
 *  ALPHA NIXUS AFK BOT | src/bot.js
 *  Connection manager: join, auth, reconnect, respawn, rotation.
 *  Creator: Deep Mallick (AKA Mr.Mallick)
 * ============================================================
 */
'use strict';

const mineflayer = require('mineflayer');
const cfg = require('./config');
const log = require('./logger');
const dc = require('./discord');
const Humanizer = require('./humanizer');

const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------------- shared state (web + discord isse padhte hain) ---------------- */
const state = {
  online: false,
  username: cfg.names[0],
  nameIndex: 0,
  lastEvent: 'booting',
  startedAt: Date.now(),
  sessionStart: null,
  connects: 0,
  reconnects: 0,
  deaths: 0,
  kicks: 0,
  rotations: 0,
  errors: 0,
  health: null,
  food: null,
  position: null,
  dimension: null,
  players: null,
  lastDeathBy: null,
};

let bot = null;
let human = null;
let timers = { reconnect: null, rotate: null, auth: null, status: null };
let shuttingDown = false;

/* ---------------- username rotation ---------------- */

function nextName() {
  state.nameIndex = (state.nameIndex + 1) % cfg.names.length;
  state.username = cfg.names[state.nameIndex];
  return state.username;
}

function scheduleRotation() {
  clearTimeout(timers.rotate);
  const base = cfg.rotateHours * 3600000;
  const jit = cfg.rotateJitterMin * 60000;
  const wait = Math.max(60000, base + rnd(-jit, jit));
  timers.rotate = setTimeout(() => {
    const old = state.username;
    const now = nextName();
    state.rotations++;
    log.info(`Username rotation: ${old} -> ${now}`);
    dc.push('rotate', `Username badla: **${old}** ➜ **${now}** (ban se bachne ke liye)`, 'info');
    restart('name-rotation');
  }, wait);
  log.info(`Next username rotation in ${(wait / 3600000).toFixed(2)} h`);
}

/* ---------------- auth (/register + /login) ---------------- */

function makeAuth() {
  const pass = cfg.auth.password;
  const regCmd = cfg.auth.registerCmd.split('{pass}').join(pass);
  const logCmd = cfg.auth.loginCmd.split('{pass}').join(pass);
  const mask = (c) => c.split(pass).join('****');

  let done = false;
  let tries = 0;
  let mode = 'register';

  function tick() {
    if (done || !bot || tries >= cfg.auth.maxRetry) return;
    tries++;
    const cmd = mode === 'register' ? regCmd : logCmd;
    try { bot.chat(cmd); } catch (_) {}
    log.info(`AUTH -> ${mask(cmd)} (try ${tries})`);
    mode = mode === 'register' ? 'login' : 'register';
    timers.auth = setTimeout(tick, cfg.auth.retryMs);
  }

  return {
    begin() {
      done = false; tries = 0; mode = 'register';
      clearTimeout(timers.auth);
      timers.auth = setTimeout(tick, cfg.auth.firstDelayMs);
    },
    stop() { clearTimeout(timers.auth); },
    isDone: () => done,
    feed(raw) {
      if (done) return;
      const m = String(raw).toLowerCase();

      if (/(success|logged in|welcome back|authenticated|you are now logged|successfully registered|login successful)/.test(m)) {
        done = true;
        clearTimeout(timers.auth);
        log.ok('Auth complete (server confirmed)');
        state.lastEvent = 'logged in';
        dc.push('auth', 'Login/Register **successful** ✔️ — bot ab fully active hai', 'good');
        return;
      }
      if (/(already registered|already exists|use \/login|please login|please, login|type \/login)/.test(m)) {
        clearTimeout(timers.auth);
        mode = 'login';
        timers.auth = setTimeout(tick, 1200);
        return;
      }
      if (/(not registered|please register|use \/register|type \/register|register first)/.test(m)) {
        clearTimeout(timers.auth);
        mode = 'register';
        timers.auth = setTimeout(tick, 1200);
        return;
      }
      if (/(wrong password|incorrect password|galat password|invalid password)/.test(m)) {
        clearTimeout(timers.auth);
        log.err('Password galat hai! AUTH_PASSWORD check karo.');
        dc.push('error', '**Password galat hai** — `AUTH_PASSWORD` env variable check karo ❌', 'crit');
      }
    },
  };
}

/* ---------------- connect ---------------- */

function connect() {
  if (shuttingDown) return;
  clearTimeout(timers.reconnect);

  const username = state.username;
  state.lastEvent = 'connecting';
  log.info(`Connecting as ${username} -> ${cfg.server.host}:${cfg.server.port} (${cfg.server.version})`);

  try {
    bot = mineflayer.createBot({
      host: cfg.server.host,
      port: cfg.server.port,
      username,
      version: cfg.server.version,
      auth: cfg.server.auth,
      hideErrors: true,
      checkTimeoutInterval: 30000,
      viewDistance: 'tiny',
      chatLengthLimit: 100,
    });
  } catch (e) {
    log.err(`createBot failed: ${e.message}`);
    dc.push('error', `Bot banane me error: \`${e.message}\``, 'crit');
    return scheduleReconnect();
  }

  const auth = makeAuth();
  human = new Humanizer(bot);
  let started = false;
  let lastErr = null;

  const startMovement = (why) => {
    if (started || !bot) return;
    started = true;
    try { bot.physicsEnabled = true; } catch (_) {}
    if (human.start()) log.info(`Movement engine trigger: ${why}`);
  };

  /* ---- joined ---- */
  bot.once('login', () => {
    state.online = true;
    state.connects++;
    state.sessionStart = Date.now();
    state.lastEvent = 'joined, authenticating';
    log.ok(`Joined server as ${username}`);
    dc.push('join', `**${username}** server par join ho gaya 🎉`, 'good');
    auth.begin();
    setTimeout(() => startMovement('login-fallback'), cfg.auth.firstDelayMs + 14000);
  });

  bot.once('spawn', () => {
    state.lastEvent = 'active in world';
    log.ok(`Spawned in world as ${username}`);
    setTimeout(() => startMovement('spawn'), cfg.auth.firstDelayMs + 2000);
    startStatusTimer();
  });

  /* ---- chat / server messages ---- */
  bot.on('messagestr', (msg) => {
    const text = String(msg);
    auth.feed(text);
    detectDeathMessage(text);
    detectBan(text);
  });

  /* ---- death ---- */
  bot.on('death', () => {
    state.deaths++;
    state.lastEvent = 'died, respawning';
    const by = state.lastDeathBy || 'unknown';
    log.warn(`Bot died (${by}) — respawning`);
    dc.push('death', `**${state.username}** mar gaya 💀 — wajah: **${by}**  ·  Total deaths: \`${state.deaths}\``, 'warn');
    state.lastDeathBy = null;
    setTimeout(() => { try { bot && bot.respawn && bot.respawn(); } catch (_) {} }, 1200);
  });

  bot.on('respawn', () => log.ok('Respawned'));

  bot.on('health', () => {
    try {
      state.health = bot.health;
      state.food = bot.food;
      if (bot.health > 0 && bot.health <= 6) {
        dc.push('death', `⚠️ Health kam hai: \`${Math.round(bot.health)}/20\` — koi maar raha hai?`, 'warn');
      }
    } catch (_) {}
  });

  /* ---- kicked ---- */
  bot.on('kicked', (reason) => {
    const txt = cleanReason(reason);
    state.kicks++;
    state.lastEvent = 'kicked';
    log.warn(`Kicked: ${txt}`);

    let sev = 'warn';
    let note = '';
    if (/already|logged in|in use|duplicate|taken/i.test(txt)) {
      note = `\n➡️ Naam busy tha, ab **${nextName()}** try karenge`;
    } else if (/ban|blacklist/i.test(txt)) {
      sev = 'crit';
      note = '\n🛑 **Lagta hai bot BAN ho gaya** — dusra naam ya server check karo';
      dc.push('ban', `Ban detect hua: \`${txt}\``, 'crit');
    }
    dc.push('kick', `Server ne kick kiya 🚪\n\`\`\`${txt}\`\`\`${note}`, sev);

    cleanup();
    scheduleReconnect();
  });

  /* ---- disconnected ---- */
  bot.on('end', (reason) => {
    const r = reason || lastErr || 'unknown';
    log.warn(`Disconnected (${r})`);
    if (state.online) {
      state.lastEvent = 'disconnected';
      dc.push('leave', `Connection toot gaya 📴 — wajah: \`${r}\`  ·  2-5s me wapas judne ki koshish`, 'warn');
    }
    cleanup();
    scheduleReconnect();
  });

  bot.on('error', (err) => {
    lastErr = (err && (err.code || err.message)) || String(err);
    state.errors++;
    log.err(`Error: ${lastErr}`);
    if (state.errors <= 3 || state.errors % 20 === 0) {
      dc.push('error', `Connection error: \`${lastErr}\`${hintFor(lastErr)}`, state.errors <= 3 ? 'warn' : 'info');
    }
  });
}

/* ---------------- helpers ---------------- */

function detectDeathMessage(text) {
  const me = state.username.toLowerCase();
  const t = text.toLowerCase();
  if (!t.includes(me)) return;
  if (/(was slain by|was shot by|was killed by|was blown up|burned to death|drowned|fell from|hit the ground|was pricked|starved|suffocated|tried to swim in lava|went up in flames|was squashed|was impaled|withered away|was stung)/.test(t)) {
    state.lastDeathBy = text.replace(/§./g, '').trim();
  }
}

function detectBan(text) {
  if (/(you are banned|you have been banned|banned from this server)/i.test(text)) {
    dc.push('ban', `Server ne BAN message bheja 🛑\n\`\`\`${text.slice(0, 300)}\`\`\``, 'crit');
  }
}

function cleanReason(reason) {
  try {
    if (typeof reason === 'string') {
      const p = JSON.parse(reason);
      return extractText(p).slice(0, 300) || reason.slice(0, 300);
    }
    return extractText(reason).slice(0, 300);
  } catch (_) {
    return String(reason).replace(/§./g, '').slice(0, 300);
  }
}

function extractText(o) {
  if (!o) return '';
  if (typeof o === 'string') return o;
  let s = o.text || '';
  if (Array.isArray(o.extra)) s += o.extra.map(extractText).join('');
  if (Array.isArray(o)) s += o.map(extractText).join('');
  return s.replace(/§./g, '');
}

function hintFor(err) {
  const e = String(err).toUpperCase();
  if (e.includes('ECONNREFUSED')) return '\n💡 Server band hai ya `MC_PORT` galat hai';
  if (e.includes('ENOTFOUND')) return '\n💡 `MC_HOST` galat hai (IP check karo)';
  if (e.includes('ETIMEDOUT')) return '\n💡 Server response nahi de raha / firewall';
  if (e.includes('ECONNRESET')) return '\n💡 Server ne connection kaat diya (anti-bot plugin?)';
  if (e.includes('VERSION')) return '\n💡 `MC_VERSION` galat hai — 1.12.2 try karo';
  return '';
}

function startStatusTimer() {
  clearInterval(timers.status);
  timers.status = setInterval(() => {
    try {
      if (!bot || !bot.entity) return;
      const p = bot.entity.position;
      state.position = `${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`;
      state.health = bot.health;
      state.food = bot.food;
      state.dimension = bot.game && bot.game.dimension;
      state.players = bot.players ? Object.keys(bot.players).length : null;
    } catch (_) {}
  }, 20000);
}

function cleanup() {
  state.online = false;
  clearInterval(timers.status);
  clearTimeout(timers.auth);
  if (human) { human.stop(); human = null; }
  if (bot) {
    try { bot.removeAllListeners(); } catch (_) {}
    try { bot.end(); } catch (_) {}
    bot = null;
  }
  if (global.gc) { try { global.gc(); } catch (_) {} }
}

function restart(why) {
  log.info(`Session restart (${why})`);
  cleanup();
  scheduleReconnect();
}

function scheduleReconnect() {
  if (shuttingDown) return;
  clearTimeout(timers.reconnect);
  state.reconnects++;
  const wait = rnd(cfg.reconnect.minMs, cfg.reconnect.maxMs);
  log.info(`Reconnecting in ${(wait / 1000).toFixed(1)}s`);
  timers.reconnect = setTimeout(connect, wait);
}

/* ---------------- memory guard (256MB panels) ---------------- */
setInterval(() => {
  const mb = process.memoryUsage().rss / 1048576;
  if (mb > 210) {
    log.warn(`Memory high (${mb.toFixed(0)} MB) — session refresh`);
    dc.push('info', `RAM zyada ho gaya (\`${mb.toFixed(0)} MB\`) — safety ke liye session refresh 🔄`, 'info');
    restart('memory-cleanup');
  }
}, 300000);

module.exports = {
  state,
  start() {
    dc.bindState(() => state);
    connect();
    scheduleRotation();
  },
  shutdown(reason) {
    shuttingDown = true;
    for (const k of Object.keys(timers)) { clearTimeout(timers[k]); clearInterval(timers[k]); }
    cleanup();
    return dc.final(`Bot band ho raha hai 🔻 — ${reason}`);
  },
};
