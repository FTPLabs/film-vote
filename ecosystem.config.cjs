module.exports = {
  apps: [{
    name: 'film-vote-api',
    script: './artifacts/api-server/dist/index.mjs',
    cwd: '/var/www/film-vote',
    env: {
      PORT: 8080,
      DATABASE_URL: 'postgresql://filmvote:filmvote2024@localhost/filmvote',
      ADMIN_PASSWORD: 'admin@123',
      SESSION_SECRET: 'vps-super-secret-2024-film-vote',
      NODE_ENV: 'production'
    }
  }]
}
