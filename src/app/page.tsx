// chat-legal/src/app/page.tsx
"use client";

import { useState } from "react";
import ClientLayout from "../components/ClientLayout";
import ChatInterface from "../components/ChatInterface";

export default function Home() {
  const [hideLayout, setHideLayout] = useState(false);
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
    <ClientLayout
      hideLayout={hideLayout}
      isAuthenticated={isAuthenticated}
      onLogin={handleLogin}
      onLogout={handleLogout}
    >
      <main className="flex-1 relative min-h-screen">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-background to-muted/50" />
          <div className="wave-background" />
        </div>
        <div className="relative z-10 h-full">
          <ChatInterface
            onChatStarted={() => setHideLayout(true)}
            onNewChat={handleNewChat}
            isAuthenticated={isAuthenticated}
            userName={userName}
            onLogout={handleLogout}
            onLogin={handleLogin}
          />
        </div>
      </main>
    </ClientLayout>
  );
}
