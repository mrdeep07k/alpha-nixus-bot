/**
 * ALPHA NIXUS AFK BOT — PM2 config (VPS / Oracle Cloud ke liye)
 * Creator: Deep Mallick (AKA Mr.Mallick)
 *
 *   npm i -g pm2
 *   pm2 start ecosystem.config.js
 *   pm2 save && pm2 startup      <- reboot ke baad bhi auto start
 */
module.exports = {
  apps: [{
    name: 'alpha-nixus-bot',
    script: 'index.js',
    node_args: '--max-old-space-size=200',
    instances: 1,
    autorestart: true,
    max_restarts: 9999,
    restart_delay: 3000,
    max_memory_restart: '400M',
    env: { NODE_ENV: 'production' },
  }],
};
