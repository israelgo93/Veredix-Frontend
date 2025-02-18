"use client"

import { Menu, ChevronsLeft, LogIn, UserPlus, LogOut, MessageSquare, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"
import { useState, useEffect } from "react"
import { Input } from "./ui/input"
import type { UserSession } from "../types"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  toggleSidebar: () => void
  isMobile: boolean
  isAuthenticated?: boolean
  userName?: string
  onNewChat?: () => void
  onLogout?: () => void
  onLogin?: () => void
  sessions?: UserSession[]
  onSessionSelect?: (sessionId: string) => void
  onSessionDelete?: (sessionId: string) => void
  onSessionRename?: (sessionId: string, newName: string) => void
  currentSessionId?: string | null
}

export function Sidebar({
  isOpen,
  onClose,
  toggleSidebar,
  isMobile,
  isAuthenticated,
  userName,
  onNewChat,
  onLogout,
  onLogin,
  sessions = [],
  onSessionSelect,
  onSessionDelete,
  onSessionRename,
  currentSessionId,
}: SidebarProps) {
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [newSessionName, setNewSessionName] = useState("")

  useEffect(() => {
    if (isAuthenticated && !isMobile && !isOpen) {
      toggleSidebar()
    }
  }, [isAuthenticated, isMobile, isOpen, toggleSidebar])

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat()
    }
    if (isMobile) {
      onClose()
    }
  }

  const handleSessionRename = (sessionId: string, currentName: string) => {
    setEditingSessionId(sessionId)
    setNewSessionName(currentName)
  }

  const submitRename = (sessionId: string) => {
    if (onSessionRename && newSessionName.trim()) {
      onSessionRename(sessionId, newSessionName.trim())
    }
    setEditingSessionId(null)
    setNewSessionName("")
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Menú</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={isMobile ? onClose : toggleSidebar}
          aria-label="Cerrar barra lateral"
          className="transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <ChevronsLeft className="h-5 w-5" />
        </Button>
      </div>
      <div className="p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleNewChat}
          className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Nuevo chat</span>
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {isAuthenticated && sessions && sessions.length > 0 && (
          <div className="mt-2">
            <h3 className="text-xs font-bold uppercase mb-2 text-muted-foreground">Chats recientes</h3>
            <ul className="space-y-1">
              {sessions.map((session) => (
                <li key={session.session_id} className="group">
                  <div className="flex items-center gap-1">
                    {editingSessionId === session.session_id ? (
                      <div className="flex-1 flex items-center gap-1">
                        <Input
                          value={newSessionName}
                          onChange={(e) => setNewSessionName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              submitRename(session.session_id)
                            }
                          }}
                          className="h-8 text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => submitRename(session.session_id)}
                          className="h-8 px-2"
                        >
                          ✓
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSessionId(null)}
                          className="h-8 px-2"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onSessionSelect?.(session.session_id)}
                          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors ${
                            currentSessionId === session.session_id ? "bg-accent" : ""
                          }`}
                        >
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="truncate-sidebar">{session.title}</span>
                        </button>
                        <div className="hidden group-hover:flex items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSessionRename(session.session_id, session.title)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSessionDelete?.(session.session_id)}
                            className="h-8 w-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
      <div className="p-4 border-t border-border">
        {!isAuthenticated ? (
          <div className="flex flex-col gap-2">
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-background text-foreground hover:bg-accent transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar Sesión</span>
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrarse</span>
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </Button>
          </div>
        )}
      </div>
      <div className="p-4 text-xs text-center text-muted-foreground">© 2025 Chat Legal IA</div>
    </>
  )

  if (isMobile) {
    return (
      <div className={`fixed inset-0 z-50 ${isOpen ? "" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        <div
          className={`fixed inset-y-0 left-0 w-64 bg-background shadow-lg transform transition-transform duration-300 ease-in-out ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {sidebarContent}
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className={`fixed top-0 left-0 h-full w-16 bg-background shadow-lg z-50 flex flex-col justify-between transition-all duration-300 ${
          isOpen ? "hidden" : "translate-x-0"
        }`}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={isOpen ? "Cerrar barra lateral" : "Abrir barra lateral"}
          className="m-2 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {isOpen ? <ChevronsLeft className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNewChat}
          aria-label="Nuevo chat"
          className="m-2 transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
        <div className="m-2 mt-auto">
          <ThemeToggle />
        </div>
      </div>
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-background shadow-lg z-40 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  )
}


