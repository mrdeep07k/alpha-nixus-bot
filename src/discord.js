/**
 * ============================================================
 *  ALPHA NIXUS AFK BOT | src/discord.js
 *  Discord Webhook logging — batched rich embeds, zero spam.
 *  Creator: Deep Mallick (AKA Mr.Mallick)
 * ------------------------------------------------------------
 *  - Events queue hote hain, phir ek bade embed me jaate hain
 *  - Critical events (death / kick / crash) turant jaate hain
 *  - Discord rate-limit (429) khud handle karta hai
 *  - Koi npm package nahi — sirf Node ka https module
 * ============================================================
 */
'use strict';

const https = require('https');
const { URL } = require('url');
const cfg = require('./config');
const log = require('./logger');

const COLORS = {
  good: 0x22c55e,   // green
  info: 0x3b82f6,   // blue
  warn: 0xf59e0b,   // amber
  crit: 0xef4444,   // red
  idle: 0x64748b,   // slate
};

const RANK = { good: 0, info: 1, warn: 2, crit: 3 };

class DiscordLogger {
  constructor() {
    this.queue = [];
    this.lastSentAt = 0;
    this.timer = null;
    this.heartbeatTimer = null;
    this.pending = false;
    this.sentCount = 0;
    this.failCount = 0;
    this.getState = () => ({});
    this.enabled = cfg.discord.enabled;

    if (this.enabled) {
      this.timer = setInterval(() => this.flush('timer'), cfg.discord.flushSec * 1000);
      this.heartbeatTimer = setInterval(
        () => this.flush('heartbeat', true),
        Math.max(10, cfg.discord.heartbeatMin) * 60 * 1000
      );
      log.ok(`Discord logging ON — batch every ${cfg.discord.flushSec}s, heartbeat ${cfg.discord.heartbeatMin}min`);
    } else {
      log.dim('Discord logging OFF (DISCORD_WEBHOOK set nahi hai)');
    }
  }

  bindState(fn) { this.getState = fn; }

  /**
   * Event queue me daalo.
   * @param {string} type   join | leave | death | auth | rotate | error | kick | boot | move | info
   * @param {string} text   readable line
   * @param {string} sev    good | info | warn | crit
   */
  push(type, text, sev = 'info') {
    if (!this.enabled) return;

    this.queue.push({ at: new Date(), type, text, sev });
    if (this.queue.length > 80) this.queue.shift();

    const critical = sev === 'crit' && cfg.discord.instantCritical;
    if (critical || this.queue.length >= cfg.discord.flushCount) {
      this.flush(critical ? 'critical' : 'full');
    }
  }

  /* ---------------- flushing / anti-spam ---------------- */

  flush(reason, allowEmpty = false) {
    if (!this.enabled) return;
    if (!this.queue.length && !allowEmpty) return;
    if (this.pending) return;

    const since = (Date.now() - this.lastSentAt) / 1000;
    if (since < cfg.discord.minGapSec) {
      // abhi mat bhejo — gap poora hone par khud chala jayega
      if (!this._delayed) {
        this._delayed = setTimeout(() => {
          this._delayed = null;
          this.flush('delayed', allowEmpty);
        }, (cfg.discord.minGapSec - since) * 1000 + 250);
      }
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    this.pending = true;
    this.lastSentAt = Date.now();

    this.send(this.buildPayload(batch, reason))
      .then(() => { this.sentCount++; })
      .catch((e) => {
        this.failCount++;
        log.warn(`Discord webhook fail: ${e.message}`);
      })
      .finally(() => { this.pending = false; });
  }

  /* ---------------- embed builder ---------------- */

  buildPayload(batch, reason) {
    const s = this.getState() || {};
    const worst = batch.reduce((a, e) => (RANK[e.sev] > RANK[a] ? e.sev : a), 'good');
    const color = batch.length ? COLORS[worst] : COLORS[s.online ? 'good' : 'idle'];

    /* --- event lines --- */
    let lines = batch.map((e) => `${log.istTime(e.at)}  ${iconOf(e.type)} ${e.text}`);
    let extra = 0;
    while (lines.join('\n').length > 3600 && lines.length > 5) {
      lines.shift(); extra++;
    }
    const desc = lines.length
      ? '```\n' + lines.join('\n') + (extra ? `\n… +${extra} aur events` : '') + '\n```'
      : '```\nKoi nayi activity nahi — bot chup-chaap kaam kar raha hai.\n```';

    /* --- stats --- */
    const rss = Math.round(process.memoryUsage().rss / 1048576);
    const counts = countBy(batch);

    const fields = [
      {
        name: '🔌 Status',
        value: `${s.online ? '🟢 **ONLINE**' : '🔴 **OFFLINE**'}\n\`${s.username || '-'}\`\n${s.lastEvent || '-'}`,
        inline: true,
      },
      {
        name: '🌍 Server',
        value: `\`${cfg.server.host}:${cfg.server.port}\`\nMinecraft \`${cfg.server.version}\``,
        inline: true,
      },
      {
        name: '⏱️ Uptime',
        value: `${fmtUptime(s.startedAt)}\nSession: ${fmtUptime(s.sessionStart)}`,
        inline: true,
      },
      {
        name: '❤️ Health',
        value: `HP \`${fmtNum(s.health)}/20\`\nFood \`${fmtNum(s.food)}/20\``,
        inline: true,
      },
      {
        name: '📍 Position',
        value: `\`${s.position || 'unknown'}\`\n${s.dimension || '-'}`,
        inline: true,
      },
      {
        name: '👥 Players',
        value: `Online: \`${s.players ?? '-'}\``,
        inline: true,
      },
      {
        name: '📊 Total Session Stats',
        value:
          `✅ Joins \`${s.connects ?? 0}\`  •  🔄 Reconnects \`${s.reconnects ?? 0}\`\n` +
          `💀 Deaths \`${s.deaths ?? 0}\`  •  🚪 Kicks \`${s.kicks ?? 0}\`  •  🪪 Name changes \`${s.rotations ?? 0}\``,
        inline: false,
      },
    ];

    if (batch.length) {
      fields.push({
        name: '🧾 Is report me',
        value: Object.entries(counts).map(([k, v]) => `${iconOf(k)} ${k} \`${v}\``).join('  •  ') || '-',
        inline: false,
      });
    }

    fields.push({
      name: '🖥️ System',
      value: `RAM \`${rss} MB\`  •  Node \`${process.version}\`  •  Logs sent \`${this.sentCount}\``,
      inline: false,
    });

    const embed = {
      title: `📋 ${cfg.brand.name} — Activity Report`,
      url: cfg.brand.github,
      description: desc,
      color,
      fields,
      footer: {
        text: `${cfg.brand.watermark}  •  ${log.istFull()} IST  •  ${reason}`,
      },
      timestamp: new Date().toISOString(),
    };

    const payload = {
      username: cfg.discord.name,
      embeds: [embed],
      allowed_mentions: { parse: ['roles', 'users'] },
    };
    if (cfg.discord.avatar) payload.avatar_url = cfg.discord.avatar;

    // sirf important cheezon par mention
    const needMention =
      cfg.discord.mention &&
      batch.some((e) => cfg.discord.mentionOn.includes(e.type) || e.sev === 'crit');
    if (needMention) payload.content = cfg.discord.mention;

    return payload;
  }

  /* ---------------- raw sender (429 safe) ---------------- */

  send(payload, attempt = 0) {
    return new Promise((resolve, reject) => {
      let u;
      try { u = new URL(cfg.discord.webhook); } catch { return reject(new Error('invalid webhook URL')); }

      const body = Buffer.from(JSON.stringify(payload));
      const req = https.request(
        {
          hostname: u.hostname,
          port: u.port || 443,
          path: u.pathname + u.search,
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': body.length },
          timeout: 12000,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => { data += c; });
          res.on('end', () => {
            if (res.statusCode === 429 && attempt < 3) {
              let wait = 3000;
              try { wait = Math.ceil((JSON.parse(data).retry_after || 3) * 1000) + 500; } catch (_) {}
              return setTimeout(
                () => this.send(payload, attempt + 1).then(resolve).catch(reject),
                Math.min(wait, 30000)
              );
            }
            if (res.statusCode >= 200 && res.statusCode < 300) return resolve();
            reject(new Error(`HTTP ${res.statusCode} ${String(data).slice(0, 120)}`));
          });
        }
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      req.end(body);
    });
  }

  /** shutdown se pehle aakhri report — sirf EK message */
  async final(text) {
    if (!this.enabled) return;
    clearInterval(this.timer);
    clearInterval(this.heartbeatTimer);
    clearTimeout(this._delayed);
    this.enabled = false; // ab koi naya message na jaye

    const batch = this.queue.splice(0, this.queue.length);
    batch.push({ at: new Date(), type: 'leave', text, sev: 'warn' });
    try { await this.send(this.buildPayload(batch, 'shutdown')); } catch (_) {}
  }
}

/* ---------------- helpers ---------------- */

function iconOf(type) {
  return {
    boot: '🚀', join: '✅', leave: '📴', death: '💀', kill: '⚔️',
    auth: '🔑', rotate: '🪪', error: '⚠️', kick: '🚪', crash: '🔥',
    move: '🎮', info: 'ℹ️', ban: '🛑', chat: '💬',
  }[type] || 'ℹ️';
}

function countBy(batch) {
  const o = {};
  for (const e of batch) o[e.type] = (o[e.type] || 0) + 1;
  return o;
}

function fmtNum(v) {
  return v === null || v === undefined ? '-' : Math.round(v);
}

function fmtUptime(from) {
  if (!from) return '-';
  const s = Math.floor((Date.now() - from) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${s % 60}s`;
}

module.exports = new DiscordLogger();
