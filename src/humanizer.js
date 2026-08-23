/**
 * ============================================================
 *  ALPHA NIXUS AFK BOT | src/humanizer.js
 *  Random human-jaisa movement — kabhi fixed pattern nahi.
 *  Creator: Deep Mallick (AKA Mr.Mallick)
 * ============================================================
 */
'use strict';

const cfg = require('./config');
const log = require('./logger');

const rnd = (a, b) => a + Math.random() * (b - a);
const rndInt = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const swallow = (p) => { if (p && p.catch) p.catch(() => {}); };

const MOVES = ['forward', 'back', 'left', 'right'];
const IDLE_CHATS = ['hmm', 'ok', 'brb', 'afk', 'gg', 'nice', 'hi', 'wb', ':)', 'lol'];

class Humanizer {
  constructor(bot) {
    this.bot = bot;
    this.stopped = true;
    this.timers = {};
    this.actions = 0;
  }

  /* ---------------- lifecycle ---------------- */

  start() {
    if (!cfg.human.enabled) {
      log.warn('HUMAN_MODE=false — bot hilega nahi.');
      return false;
    }
    if (!this.stopped) return false;
    this.stopped = false;
    log.ok('Movement engine STARTED (random human mode)');
    this.loop();
    this.lookLoop();
    this.pulseLoop();
    if (cfg.human.chat) this.chatLoop();
    return true;
  }

  stop() {
    this.stopped = true;
    for (const k of Object.keys(this.timers)) clearTimeout(this.timers[k]);
    this.timers = {};
    this.release();
  }

  release() {
    try {
      for (const s of ['forward', 'back', 'left', 'right', 'jump', 'sneak', 'sprint']) {
        this.bot.setControlState(s, false);
      }
    } catch (_) {}
  }

  alive() {
    return !this.stopped && this.bot && this.bot.entity;
  }

  /* ---------------- loops ---------------- */

  loop() {
    if (this.stopped) return;
    this.timers.main = setTimeout(() => {
      if (this.alive()) this.act();
      this.loop();
    }, rnd(cfg.human.minGapMs, cfg.human.maxGapMs));
  }

  lookLoop() {
    if (this.stopped) return;
    this.timers.look = setTimeout(() => {
      if (this.alive()) this.lookAround();
      this.lookLoop();
    }, rnd(1800, 7000));
  }

  /** har 20-45s guaranteed movement — chahe kuch bhi ho */
  pulseLoop() {
    if (this.stopped) return;
    this.timers.pulse = setTimeout(() => {
      if (this.alive()) {
        try {
          this.bot.setControlState('jump', true);
          setTimeout(() => { try { this.bot.setControlState('jump', false); } catch (_) {} }, 250);
          this.bot.swingArm('right');
        } catch (_) {}
      }
      this.pulseLoop();
    }, rnd(20000, 45000));
  }

  chatLoop() {
    if (this.stopped) return;
    const base = Math.max(1, cfg.human.chatEveryMin) * 60000;
    this.timers.chat = setTimeout(() => {
      if (this.alive()) { try { this.bot.chat(pick(IDLE_CHATS)); } catch (_) {} }
      this.chatLoop();
    }, rnd(base * 0.6, base * 1.6));
  }

  /* ---------------- actions ---------------- */

  act() {
    const r = Math.random();
    this.actions++;
    try {
      if (r < 0.30) this.walk();
      else if (r < 0.45) this.jump();
      else if (r < 0.58) this.lookAround();
      else if (r < 0.68) this.swing();
      else if (r < 0.78) this.sneak();
      else if (r < 0.86) this.hotbar();
      else if (r < 0.93) this.spin();
      else log.act('idle pause');
    } catch (_) { /* action fail ho to bot crash na ho */ }
  }

  walk() {
    const dir = pick(MOVES);
    const dur = rndInt(400, 2200);
    const sprint = dir === 'forward' && Math.random() < 0.35;
    this.bot.setControlState(dir, true);
    if (sprint) this.bot.setControlState('sprint', true);
    if (Math.random() < 0.25) this.bot.setControlState('jump', true);
    setTimeout(() => {
      try {
        this.bot.setControlState(dir, false);
        this.bot.setControlState('sprint', false);
        this.bot.setControlState('jump', false);
      } catch (_) {}
    }, dur);
    log.act(`walk ${dir}${sprint ? ' +sprint' : ''} ${dur}ms`);
  }

  jump() {
    let n = rndInt(1, 3);
    const hop = () => {
      if (!this.alive() || n-- <= 0) return;
      try {
        this.bot.setControlState('jump', true);
        setTimeout(() => {
          try { this.bot.setControlState('jump', false); } catch (_) {}
          setTimeout(hop, rnd(150, 500));
        }, rnd(120, 300));
      } catch (_) {}
    };
    hop();
    log.act('jump');
  }

  lookAround() {
    swallow(this.bot.look(rnd(-Math.PI, Math.PI), rnd(-0.9, 0.9), false));
  }

  swing() {
    this.bot.swingArm('right');
    log.act('swing arm');
  }

  sneak() {
    this.bot.setControlState('sneak', true);
    setTimeout(() => { try { this.bot.setControlState('sneak', false); } catch (_) {} }, rnd(300, 1500));
    log.act('sneak');
  }

  hotbar() {
    const slot = rndInt(0, 8);
    this.bot.setQuickBarSlot(slot);
    log.act(`hotbar ${slot + 1}`);
  }

  spin() {
    let n = rndInt(3, 7);
    const step = () => {
      if (!this.alive() || n-- <= 0) return;
      swallow(this.bot.look(rnd(-Math.PI, Math.PI), rnd(-0.4, 0.4), false));
      setTimeout(step, rnd(120, 380));
    };
    step();
    log.act('look spin');
  }
}

module.exports = Humanizer;
