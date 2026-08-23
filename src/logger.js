/**
 * ALPHA NIXUS AFK BOT | src/logger.js
 * Console logging + IST time helpers.
 * Creator: Deep Mallick (AKA Mr.Mallick)
 */
'use strict';

const cfg = require('./config');

const MAX = 150;
const buffer = [];

const C = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', magenta: '\x1b[35m', gray: '\x1b[90m',
};

/** "24 Aug 2026, 02:15:07 am" — Indian Standard Time */
function istFull(d = new Date()) {
  return d.toLocaleString('en-IN', {
    timeZone: cfg.timezone, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

/** "02:15:07 am" */
function istTime(d = new Date()) {
  return d.toLocaleString('en-IN', {
    timeZone: cfg.timezone,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

function push(level, msg) {
  const line = `[${istTime()}] [${level}] ${msg}`;
  buffer.push(line);
  if (buffer.length > MAX) buffer.shift();
  return line;
}

module.exports = {
  istFull,
  istTime,
  info: (m) => console.log(C.cyan + push('INFO', m) + C.reset),
  ok: (m) => console.log(C.green + push('OK  ', m) + C.reset),
  warn: (m) => console.log(C.yellow + push('WARN', m) + C.reset),
  err: (m) => console.log(C.red + push('ERR ', m) + C.reset),
  act: (m) => console.log(C.magenta + push('ACT ', m) + C.reset),
  dim: (m) => console.log(C.gray + push('LOG ', m) + C.reset),
  tail: () => buffer.slice(),
};
