module.exports = {
  apps: [
    {
      name: "checkpoint-backend",
      script: "src/server.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "checkpoint-tunnel-notifier",
      script: "scripts/telegramTunnelNotifier.js",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
