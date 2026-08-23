/**
 * ============================================================
 *   █████╗ ██╗     ██████╗ ██╗  ██╗ █████╗
 *  ██╔══██╗██║     ██╔══██╗██║  ██║██╔══██╗   N I X U S
 *  ███████║██║     ██████╔╝███████║███████║   24/7 AFK BOT
 *  ██╔══██║██║     ██╔═══╝ ██╔══██║██╔══██║
 *  ██║  ██║███████╗██║     ██║  ██║██║  ██║
 *  ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝
 * ------------------------------------------------------------
 *  Creator : Deep Mallick  (AKA Mr.Mallick)
 *  Entry point — storage cleanup + bot start
 * ============================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* ============================================================
 *  1) STORAGE CLEANUP
 *  minecraft-data 426 MB ka aata hai jisme 330 MB Bedrock ka
 *  bekar data hai. Ye usse ~15 MB kar deta hai.
 *  Sirf pehli baar chalta hai, baad me instant skip.
 * ============================================================ */
function slim() {
  const ROOT = path.join(__dirname, 'node_modules', 'minecraft-data', 'minecraft-data', 'data');
  if (!fs.existsSync(ROOT)) return;

  const size = (dir) => {
    let t = 0;
    try {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        t += e.isDirectory() ? size(p) : fs.statSync(p).size;
      }
    } catch (_) {}
    return t;
  };
  const mb = (b) => (b / 1048576).toFixed(1) + ' MB';

  const before = size(ROOT);
  if (before < 60 * 1048576) return; // already slim

  console.log('[slim] Storage cleanup shuru… (sirf pehli baar)');

  const WANT = new Set(
    (process.env.KEEP_MC_VERSIONS || '1.12,1.12.1,1.12.2,1.16.5,1.20.1')
      .split(',').map((v) => v.trim()).filter(Boolean)
  );
  if (process.env.MC_VERSION) WANT.add(process.env.MC_VERSION.trim());

  // Bedrock: sirf 'common' rakho (features.json zaruri hai)
  const bedrock = path.join(ROOT, 'bedrock');
  if (fs.existsSync(bedrock)) {
    let n = 0;
    for (const e of fs.readdirSync(bedrock)) {
      if (e === 'common') continue;
      fs.rmSync(path.join(bedrock, e), { recursive: true, force: true });
      n++;
    }
    console.log(`[slim] bedrock: ${n} folders deleted`);
  }

  // PC: sirf kaam ke version folders
  const dpFile = path.join(ROOT, 'dataPaths.json');
  const pcDir = path.join(ROOT, 'pc');
  if (fs.existsSync(dpFile) && fs.existsSync(pcDir)) {
    const dp = JSON.parse(fs.readFileSync(dpFile, 'utf8'));
    const keys = Object.keys(dp.pc || {});

    const wanted = new Set();
    for (const v of WANT) {
      if (keys.includes(v)) { wanted.add(v); continue; }
      keys.filter((k) => v.startsWith(k) || k.startsWith(v)).forEach((k) => wanted.add(k));
    }

    const keep = new Set(['common']);
    for (const [ver, files] of Object.entries(dp.pc || {})) {
      if (!wanted.has(ver)) continue;
      for (const rel of Object.values(files)) {
        const parts = String(rel).split('/');
        keep.add(parts.length > 1 ? parts[1] : parts[0]);
      }
    }

    if (keep.size > 2) {
      let n = 0;
      for (const e of fs.readdirSync(pcDir)) {
        if (keep.has(e)) continue;
        fs.rmSync(path.join(pcDir, e), { recursive: true, force: true });
        n++;
      }
      console.log(`[slim] pc: ${keep.size} folders rakhe, ${n} deleted`);
    }
  }

  console.log(`[slim] minecraft-data: ${mb(before)} -> ${mb(size(ROOT))} ✅`);
}

try { slim(); } catch (e) { console.log('[slim] skipped:', e.message); }

/* ============================================================
 *  2) BOT START
 * ============================================================ */
const cfg = require('./src/config');
const log = require('./src/logger');
const dc = require('./src/discord');
const botMgr = require('./src/bot');
const startWeb = require('./src/web');

function banner() {
  const W = 64;
  const row = (t) => '║ ' + String(t).padEnd(W - 3).slice(0, W - 3) + '║';
  console.log('\n\x1b[36m' + [
    '╔' + '═'.repeat(W - 2) + '╗',
    row('A L P H A   N I X U S   —  24/7 MINECRAFT AFK BOT'),
    '╠' + '═'.repeat(W - 2) + '╣',
    row(`Creator  : ${cfg.brand.creator}  (AKA ${cfg.brand.alias})`),
    row(`Version  : ${cfg.brand.version}   |   MC : ${cfg.server.version}`),
    row(`Target   : ${cfg.server.host}:${cfg.server.port}`),
    row(`Names    : ${cfg.names.join(', ')}`),
    row(`Discord  : ${cfg.discord.enabled ? 'ON (webhook logging)' : 'OFF'}`),
    row(`Time     : ${log.istFull()} IST`),
    '╚' + '═'.repeat(W - 2) + '╝',
  ].join('\n') + '\x1b[0m\n');
}

banner();
startWeb(botMgr.state);
dc.push('boot', `Bot start hua 🚀 — target \`${cfg.server.host}:${cfg.server.port}\` · MC \`${cfg.server.version}\` · ${cfg.names.length} usernames ready`, 'good');
botMgr.start();

/* ---------------- crash-proof ---------------- */
process.on('uncaughtException', (e) => {
  log.err(`uncaughtException: ${e.message}`);
  dc.push('crash', `Crash pakda gaya 🔥\n\`\`\`${String(e.stack || e.message).slice(0, 500)}\`\`\`\n➡️ Bot khud recover kar raha hai`, 'crit');
});
process.on('unhandledRejection', (e) => {
  log.err(`unhandledRejection: ${(e && e.message) || e}`);
});

let bye = false;
async function goodbye(sig) {
  if (bye) return;
  bye = true;
  log.warn(`${sig} mila — shutting down`);
  try { await botMgr.shutdown(sig); } catch (_) {}
  process.exit(0);
}
process.on('SIGTERM', () => goodbye('SIGTERM'));
process.on('SIGINT', () => goodbye('SIGINT'));
