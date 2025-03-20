module.exports = {
  apps: [
    {
      name: "veredix",
      script: "npm",
      args: "run start",
      autorestart: true,
      env: {
        NODE_ENV: "production"
      },
      watch: false
    }
  ]
};
