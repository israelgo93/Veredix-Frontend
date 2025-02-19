"use client"

import type React from "react"
import { ThemeToggle } from "./theme-toggle"
import Link from "next/link"
import { Button } from "./ui/button"
import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  return isMobile
}

interface ClientLayoutProps {
  children: React.ReactNode
  hideLayout?: boolean
}

export default function ClientLayout({ children, hideLayout = false }: ClientLayoutProps) {
  const isMobile = useIsMobile()
  const { isAuthenticated, loading } = useAuth()

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-gray-900">
      {/* Muestra el header sólo si NO está oculto y el usuario NO está autenticado */}
      {!hideLayout && !isAuthenticated && (
        <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-900 shadow-sm">
          <div className="container flex h-14 items-center px-2 md:px-4">
            <div className="flex flex-1 items-center">
              <Link href="/" className="flex items-center">
                <span className="font-bold text-2xl dark:text-gray-200 text-gray-700">Veredix</span>
              </Link>
            </div>

            <div className={isMobile ? "flex items-center space-x-2" : "hidden md:flex items-center space-x-2"}>
              {loading ? (
                <span>Cargando...</span>
              ) : (
                <>
                  <Link href="/auth/login">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3 py-1 bg-white text-black dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                      Iniciar Sesión
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full px-3 py-1 bg-black text-white dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-800 dark:hover:bg-gray-600 transition-all"
                    >
                      Registrarse
                    </Button>
                  </Link>
                </>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col">{children}</main>

      {!hideLayout && (
        <footer className="border-t py-6 md:py-0 bg-white dark:bg-gray-900">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
            <p className="text-center text-sm leading-loose text-muted-foreground">
              Al enviar un mensaje a Veredix, aceptas nuestras{" "}
              <a href="/condiciones" className="underline underline-offset-4 hover:text-primary">
                condiciones
              </a>{" "}
              y confirmas que has leído nuestra{" "}
              <a href="/privacidad" className="underline underline-offset-4 hover:text-primary">
                política de privacidad
              </a>
              .
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}
