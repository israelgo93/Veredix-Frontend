module.exports = {
  apps: [
    {
      name: "veredx",
      cwd: "/home/phiuser/phi/chat-legal", // Ajusta esta ruta a la ubicación de tu proyecto
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: "3000"
      },
      exec_mode: "fork", // Next.js maneja su propio clustering
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      time: true
    }
  ]
};