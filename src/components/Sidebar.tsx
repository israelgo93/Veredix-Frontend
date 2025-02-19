"use client"

import {
  Menu,
  ChevronsLeft,
  LogIn,
  UserPlus,
  LogOut,
  MessageSquare,
  Edit,
  Trash2,
  MoreHorizontal,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "./theme-toggle"
import { useState } from "react"
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
  const [openMenuSessionId, setOpenMenuSessionId] = useState<string | null>(null)

  const handleNewChat = () => {
    onNewChat?.()
    if (isMobile) {
      onClose()
    }
  }

  const handleSessionRename = (sessionId: string, currentName: string) => {
    setOpenMenuSessionId(null)
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

  const handleSessionDelete = (sessionId: string) => {
    setOpenMenuSessionId(null)
    onSessionDelete?.(sessionId)
  }

  const sidebarContent = (
    <div className="relative h-full flex flex-col">
      {/* Encabezado con ThemeToggle en vista móvil */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Menú</h2>
          {isMobile && <ThemeToggle />}
        </div>
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

      {/* Botón Nuevo Chat */}
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

      {/* Lista de sesiones */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-4 text-sm overflow-x-hidden">
        {isAuthenticated && sessions && sessions.length > 0 && (
          <div className="mt-2">
            <h3 className="text-xs font-bold uppercase mb-2 text-muted-foreground">Chats recientes</h3>
            <ul className="space-y-1">
              {sessions.map((session) => {
                const isEditing = editingSessionId === session.session_id
                const isOpenMenu = openMenuSessionId === session.session_id

                const displayTitle =
                  session.title.length > 20
                    ? session.title.slice(0, 20) + "..."
                    : session.title

                return (
                  <li key={session.session_id} className="group relative w-full">
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full">
                        <Input
                          value={newSessionName}
                          onChange={(e) => setNewSessionName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              submitRename(session.session_id)
                            }
                          }}
                          className="h-8 text-sm flex-1"
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
                          onClick={() => {
                            setEditingSessionId(null)
                            setNewSessionName("")
                          }}
                          className="h-8 px-2"
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center w-full">
                        <button
                          onClick={() => onSessionSelect?.(session.session_id)}
                          className={`flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors ${
                            currentSessionId === session.session_id ? "bg-accent" : ""
                          }`}
                        >
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {displayTitle}
                          </span>
                        </button>

                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setOpenMenuSessionId(isOpenMenu ? null : session.session_id)
                            }
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                          {isOpenMenu && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-md z-50 flex flex-col py-1">
                              <button
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                                onClick={() => handleSessionRename(session.session_id, session.title)}
                              >
                                <Edit className="h-4 w-4" />
                                <span>Cambiar nombre</span>
                              </button>
                              <button
                                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100"
                                onClick={() => handleSessionDelete(session.session_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Botón Cerrar Sesión fijo al fondo */}
      <div className="absolute bottom-0 w-full p-4 border-t border-border bg-background">
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
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="w-full rounded-full px-3 py-2 border border-gray-300 text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </Button>
        )}
        <div className="pt-2 text-xs text-center text-muted-foreground">© 2025 Chat Legal IA</div>
      </div>
    </div>
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
