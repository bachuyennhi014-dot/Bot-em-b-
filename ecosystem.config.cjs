/**
 * PM2 Configuration File for 24/7 Bot Deployment
 * Run with: pm2 start ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'discord-order-bot',
      script: 'bot.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      restart_delay: 2000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production'
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true
    }
  ]
};
