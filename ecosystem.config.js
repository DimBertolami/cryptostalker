module.exports = {
  apps: [{
    name: 'cryptostalker-frontend',
    script: 'npm',
    args: 'run dev',
    cwd: './src',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
