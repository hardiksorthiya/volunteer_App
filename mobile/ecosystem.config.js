// PM2 config: run Expo with tunnel as a persistent service (live link 24/7)
// Usage: cd mobile && npm run pm2:start
const path = require('path');
const { execSync } = require('child_process');

const mobileDir = path.resolve(__dirname);
const nodeBin = path.dirname(execSync('which node', { encoding: 'utf8' }).trim());
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
    min_uptime: '30s',
    max_restarts: 15,
    restart_delay: 5000,
    kill_timeout: 8000,
    env: {
      NODE_ENV: 'development',
      PATH: pathEnv,
      CI: '0',
      EXPO_NO_TELEMETRY: '1',
      RCT_METRO_PORT: '8081',
    },
    error_file: path.join(mobileDir, 'logs', 'expo-err.log'),
    out_file: path.join(mobileDir, 'logs', 'expo-out.log'),
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,
  }],
};
