"use client"

import { useState } from "react"
import ClientLayout from "../components/ClientLayout"
import ChatInterface from "../components/ChatInterface"
import { useAuth } from "../contexts/AuthContext"

export default function Home() {
  const [hideLayout, setHideLayout] = useState(false)
  const { isAuthenticated } = useAuth()

  const handleNewChat = () => {
    // Si el usuario no está autenticado, mostramos el layout de nuevo
    if (!isAuthenticated) {
      setHideLayout(false)
    }
  }

  return (
    <ClientLayout hideLayout={hideLayout}>
      <main className="flex-1 relative min-h-screen">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>
        <div className="relative z-10 h-full">
          <ChatInterface
            onChatStarted={() => setHideLayout(true)}
            onNewChat={handleNewChat}
          />
        </div>
      </main>
    </ClientLayout>
  )
}
