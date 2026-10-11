// How pm2 runs the app on the server; used by deploy/deploy.sh.
module.exports = {
  apps: [
    {
      name: "docs-clone",
      script: "node_modules/next/dist/bin/next",
      args: "start --port 3001",
      env: { NODE_ENV: "production" },
    },
  ],
};
