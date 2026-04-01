// PM2 config: run Expo with tunnel as a persistent service (live link 24/7)
// Usage: cd mobile && pm2 start ecosystem.config.js
const path = require('path');
const mobileDir = path.resolve(__dirname);
const nodeBin = '/root/.nvm/versions/node/v20.20.0/bin';
const pathEnv = `${nodeBin}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`;

module.exports = {
  apps: [{
    name: 'volunteer-connect-expo',
    script: './start-expo-pm2.sh',
    cwd: mobileDir,
    interpreter: '/bin/bash',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '800M',
    env: {
      NODE_ENV: 'development',
      PATH: pathEnv
    },
    error_file: path.join(mobileDir, 'logs', 'expo-err.log'),
    out_file: path.join(mobileDir, 'logs', 'expo-out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
