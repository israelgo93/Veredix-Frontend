"use client"

import { useState } from "react"
import ClientLayout from "../components/ClientLayout"
import ChatInterface from "../components/ChatInterface"

export default function Home() {
  const [hideLayout, setHideLayout] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const userName = "Usuario"

  const handleNewChat = () => {
    console.log("Nuevo Chat")
  }

  const handleLogout = () => {
    console.log("Cerrar Sesión")
    setIsAuthenticated(false)
  }

  const handleLogin = () => {
    console.log("Iniciar Sesión")
    setIsAuthenticated(true)
  }

  return (
    <ClientLayout
      hideLayout={hideLayout}
      isAuthenticated={isAuthenticated}
      onLogin={handleLogin}
      onLogout={handleLogout}
    >
      <main className="flex-1 relative min-h-screen">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
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
  )
}


