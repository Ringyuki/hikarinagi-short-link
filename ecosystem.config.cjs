module.exports = {
  apps: [
    {
      name: 'hikarinagi-short-link',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      exec_mode: 'cluster',
      instances: 1,
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production'
      },
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
    }
  ]
}