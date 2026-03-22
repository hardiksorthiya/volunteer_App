module.exports = {
  apps: [{
    name: 'volunteer-connect-backend',
    script: './server.js',
    interpreter: '/root/.nvm/versions/node/v20.20.0/bin/node',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      NVM_DIR: '/root/.nvm',
      PATH: '/root/.nvm/versions/node/v20.20.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      NVM_DIR: '/root/.nvm',
      PATH: '/root/.nvm/versions/node/v20.20.0/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};

