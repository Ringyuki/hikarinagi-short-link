module.exports = {
  apps: [
    {
      name: 'hikarinagi-short-link',
      script: 'node',
      args: '.next/standalone/server.js',
      cwd: __dirname,
      exec_mode: 'cluster',
      instances: 'max',
      watch: false,
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
        PRISMA_LOG_QUERIES: 'false',
        DATABASE_URL: '',
        JWT_SECRET: '',
        IP_HEADER: 'cf-connecting-ip',
        IP_FALLBACK_HEADERS: 'x-forwarded-for,x-real-ip,x-client-ip,fastly-client-ip',
        COUNTRY_HEADER: 'cf-ipcountry',
        CITY_HEADER: '',
        REFERER_HEADER: 'referer',
        REF_AGG_LEVEL: 'domain_path2',
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


