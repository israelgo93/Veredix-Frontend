import React from "react"
import { X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <div
      className={`
        fixed top-0 left-0 h-full w-64 bg-background shadow-lg z-50
        transform transition-transform duration-300
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
    >
      <div className="flex flex-col h-full">
        {/* Encabezado del Sidebar */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-base font-semibold">Menú</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Contenido principal del Sidebar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
          {/* Ejemplo de secciones que aparecen en tu screenshot */}
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

          {/* Ejemplo: sección "Recent Chats" */}
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

          {/* Podrías añadir más enlaces, secciones, etc. */}
        </div>

        {/* Footer del Sidebar */}
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          © 2025 - Chat Legal IA
        </div>
      </div>
    </div>
  )
}
