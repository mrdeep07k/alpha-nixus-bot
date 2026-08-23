/**
 * ALPHA NIXUS AFK BOT | src/web.js
 * Chhota status dashboard + /health + /logs (port bind ke liye bhi).
 * Creator: Deep Mallick (AKA Mr.Mallick)
 */
'use strict';

const http = require('http');
const cfg = require('./config');
const log = require('./logger');

function up(ms) {
  if (!ms) return '-';
  const s = Math.floor((Date.now() - ms) / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function page(s) {
  const on = s.online;
  const row = (k, v) => `<tr><td>${k}</td><td>${v ?? '-'}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${cfg.brand.name} • AFK Bot</title><style>
*{box-sizing:border-box}body{margin:0;font-family:ui-monospace,Menlo,Consolas,monospace;
background:radial-gradient(circle at 20% 0%,#12263f,#05070d 60%);color:#d7e3f4;min-height:100vh;padding:26px}
.card{max-width:700px;margin:0 auto;background:rgba(12,20,34,.85);border:1px solid #1e3a5f;
border-radius:16px;padding:26px;box-shadow:0 18px 50px rgba(0,0,0,.5)}
h1{margin:0;font-size:23px;letter-spacing:3px;color:#4ade80}
.sub{color:#7b93b3;font-size:12px;margin:6px 0 18px;letter-spacing:1px}
.badge{display:inline-block;padding:5px 14px;border-radius:99px;font-size:12px;font-weight:700;
background:${on ? '#0f3d24' : '#3d1414'};color:${on ? '#4ade80' : '#f87171'};
border:1px solid ${on ? '#1f7a45' : '#7a1f1f'}}
table{width:100%;border-collapse:collapse;margin-top:16px;font-size:13px}
td{padding:8px 6px;border-bottom:1px solid #17293f}
td:first-child{color:#7b93b3;width:44%}
.wm{margin-top:20px;padding-top:14px;border-top:1px dashed #1e3a5f;font-size:12px;color:#6f88a8;line-height:1.7}
</style></head><body><div class="card">
<h1>${cfg.brand.name.toUpperCase()}</h1>
<div class="sub">24/7 MINECRAFT AFK BOT • v${cfg.brand.version}</div>
<span class="badge">${on ? '● ONLINE' : '● RECONNECTING'}</span>
<table>
${row('Username', `<b style="color:#facc15">${s.username}</b>`)}
${row('Server', `${cfg.server.host}:${cfg.server.port}`)}
${row('MC Version', cfg.server.version)}
${row('Status', s.lastEvent)}
${row('Health / Food', `${s.health ?? '-'} / ${s.food ?? '-'}`)}
${row('Position', s.position)}
${row('Players online', s.players)}
${row('Joins', s.connects)}
${row('Reconnects', s.reconnects)}
${row('Deaths', s.deaths)}
${row('Kicks', s.kicks)}
${row('Name changes', s.rotations)}
${row('Uptime', up(s.startedAt))}
${row('Current session', up(s.sessionStart))}
${row('Discord logging', cfg.discord.enabled ? '🟢 ON' : '⚪ OFF')}
${row('Name pool', cfg.names.join(', '))}
</table>
<div class="wm">⚡ ${cfg.brand.watermark}<br>Creator: <b>${cfg.brand.creator}</b> (AKA ${cfg.brand.alias})<br>${log.istFull()} IST</div>
</div><script>setTimeout(()=>location.reload(),15000)</script></body></html>`;
}

module.exports = function startWeb(state) {
  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];

    if (url === '/health' || url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true, online: state.online, username: state.username,
        status: state.lastEvent, uptimeMs: Date.now() - state.startedAt,
        deaths: state.deaths, reconnects: state.reconnects,
        creator: `${cfg.brand.creator} (${cfg.brand.alias})`,
      }));
    }
    if (url === '/logs') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`# ${cfg.brand.watermark}\n\n${log.tail().join('\n')}`);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page(state));
  });

  server.on('error', (e) => log.warn(`Web server: ${e.message}`));
  server.listen(cfg.web.port, '0.0.0.0', () => log.ok(`Status page on port ${cfg.web.port}`));
  return server;
};
