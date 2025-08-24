module.exports = {
  apps: [
    {
      name: 'hikarinagi-short-link',
      script: 'pnpm',
      args: 'start',
      cwd: __dirname,
      exec_mode: 'cluster',
      instances: 1,
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3009
      },
      env_production: {
        NODE_ENV: 'production'
      },
      out_file: 'logs/out.log',
      error_file: 'logs/error.log',
      merge_logs: true,
    }
  ]
}