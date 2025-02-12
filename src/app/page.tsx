// chat-legal/src/app/page.tsx
"use client";

import { useState } from "react";
import ClientLayout from "../components/ClientLayout";
import ChatInterface from "../components/ChatInterface";
import { Sidebar } from "../components/Sidebar";

export default function Home() {
  const [hideLayout, setHideLayout] = useState(false);
  // Simulación del estado de autenticación
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const userName = "Usuario";

  const handleNewChat = () => {
    console.log("Nuevo Chat");
  };

  const handleLogout = () => {
    console.log("Cerrar Sesión");
    setIsAuthenticated(false);
  };

  const handleLogin = () => {
    console.log("Iniciar Sesión");
    setIsAuthenticated(true);
  };

  return (
    <ClientLayout hideLayout={hideLayout} isAuthenticated={isAuthenticated}>
      <Sidebar
        isAuthenticated={isAuthenticated}
        userName={userName}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        onLogin={handleLogin}
      />
      <main className="flex-1 relative min-h-screen">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-background to-muted/50" />
          <div className="wave-background" />
        </div>
        <div className="relative z-10 h-full">
          <ChatInterface onChatStarted={() => setHideLayout(true)} />
        </div>
      </main>
    </ClientLayout>
  );
}
