//chat-legal/src/app/page.tsx
"use client";
import ChatInterface from '../components/ChatInterface'
// O alternativamente:
// import ChatInterface from '@/components/ChatInterface'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <ChatInterface />
    </main>
  )
}

