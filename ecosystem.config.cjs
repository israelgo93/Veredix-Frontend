module.exports = {
  apps: [
    {
      name: "veredix",
      script: "npm",
      args: "run start",
      env: {
        NODE_ENV: "production"
      },
      watch: false
    }
  ]
};
