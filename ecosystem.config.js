// PM2 Configuration for Production & Staging

module.exports = {
  apps: [
    {
      name: 'invoice-processing-production',
      script: './src/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false
    },
    {
      name: 'invoice-processing-staging',
      script: './src/server.js',
      instances: 1,
      exec_mode: 'cluster',
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 3001
      },
      error_file: './logs/pm2-staging-error.log',
      out_file: './logs/pm2-staging-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '512M',
      watch: false
    }
  ]
};
