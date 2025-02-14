import React from "react"
import { Menu, ChevronsLeft, LogIn, UserPlus, LogOut } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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
  onLogin 
}: SidebarProps) {

  // --- Modo escritorio ---
  if (!isMobile) {
    if (!isOpen) {
      // Sidebar colapsado (barra estrecha con botón inferior)
      return (
        <div className="fixed top-0 left-0 h-full w-16 bg-background shadow-lg z-50 flex flex-col justify-end">
          <div className="p-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Abrir barra lateral"
              className="transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )
    }

    // Sidebar expandido
    return (
      <div className="fixed top-0 left-0 h-full w-64 bg-background shadow-lg z-50 transform transition-transform duration-300 translate-x-0">
        <div className="flex flex-col h-full">
          {/* Cabecera con botón de toggle en la parte superior */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-base font-semibold">Menú</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Cerrar barra lateral"
              className="transition-transform duration-200 hover:scale-105 active:scale-95"
            >
              <ChevronsLeft className="h-5 w-5" />
            </Button>
          </div>

          {/* Contenido principal */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
            <Link href="/community" className="hover:underline">
              Community
            </Link>
            <Link href="/library" className="hover:underline">
              Library
            </Link>
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>
            <Link href="/feedback" className="hover:underline">
              Feedback
            </Link>
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase mb-2 text-muted-foreground">
                Recent Chats
              </h3>
              <ul className="space-y-1">
                <li>
                  <Link href="/chat/document-translation" className="hover:underline">
                    Document translation
                  </Link>
                </li>
                <li>
                  <Link href="/chat/abogado-labor-laws" className="hover:underline">
                    Abogado labor laws
                  </Link>
                </li>
                <li>
                  <Link href="/chat/invalid-input" className="hover:underline">
                    Invalid input
                  </Link>
                </li>
                <li>
                  <Link href="/chat/python-xml-api" className="hover:underline">
                    Python xml api
                  </Link>
                </li>
                <li>
                  <Link href="/chat/inpaint" className="hover:underline">
                    Inpaint input
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Pie (opcional) */}
          <div className="p-4 border-t border-border text-xs text-muted-foreground">
            © 2025 - Chat Legal IA
          </div>
        </div>
      </div>
    )
  }

  // --- Modo móvil ---
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      {/* Panel lateral */}
      <div className="fixed inset-y-0 left-0 flex max-w-full pr-10">
        <div className="w-screen max-w-md transform transition-all duration-300 ease-in-out relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-50 rounded-md p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-transform duration-200 hover:scale-105 active:scale-95"
            aria-label="Cerrar panel"
          >
            <ChevronsLeft className="h-6 w-6" />
          </button>
          <div className="flex h-full flex-col overflow-hidden bg-background/50 backdrop-blur-sm rounded-xl shadow-lg">
            <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/70 px-4 py-3">
              <h2 className="text-lg font-semibold">Menú</h2>
            </div>
            <div className="relative flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-2 text-sm">
                <Link href="/community" className="hover:underline">
                  Community
                </Link>
                <Link href="/library" className="hover:underline">
                  Library
                </Link>
                <Link href="/projects" className="hover:underline">
                  Projects
                </Link>
                <Link href="/feedback" className="hover:underline">
                  Feedback
                </Link>
                <div className="mt-4">
                  <h3 className="text-xs font-bold uppercase mb-2 text-muted-foreground">
                    Recent Chats
                  </h3>
                  <ul className="space-y-1">
                    <li>
                      <Link href="/chat/document-translation" className="hover:underline">
                        Document translation
                      </Link>
                    </li>
                    <li>
                      <Link href="/chat/abogado-labor-laws" className="hover:underline">
                        Abogado labor laws
                      </Link>
                    </li>
                    <li>
                      <Link href="/chat/invalid-input" className="hover:underline">
                        Invalid input
                      </Link>
                    </li>
                    <li>
                      <Link href="/chat/python-xml-api" className="hover:underline">
                        Python xml api
                      </Link>
                    </li>
                    <li>
                      <Link href="/chat/inpaint" className="hover:underline">
                        Inpaint input
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Si el usuario no está autenticado, mostramos Login/Signup en el sidebar (versión móvil) */}
                {!isAuthenticated && (
                  <div className="mt-6 flex flex-col gap-2">
                    <Link href="/auth/login">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 transition-transform duration-200 hover:scale-105 active:scale-95 w-full justify-center"
                      >
                        <LogIn className="w-4 h-4" />
                        <span>Iniciar Sesión</span>
                      </Button>
                    </Link>
                    <Link href="/auth/signup">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2 transition-transform duration-200 hover:scale-105 active:scale-95 w-full justify-center"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Registrarse</span>
                      </Button>
                    </Link>
                  </div>
                )}

                {/* Si el usuario está autenticado, mostramos el botón de Logout */}
                {isAuthenticated && (
                  <div className="mt-6 flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onLogout}
                      className="flex items-center gap-2 transition-transform duration-200 hover:scale-105 active:scale-95 w-full justify-center"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Salir</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-border text-xs text-muted-foreground">
              © 2025 - Chat Legal IA
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
