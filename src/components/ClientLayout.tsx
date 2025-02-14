//src/components/ClientLayout.tsx
"use client";

import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";
import { LogIn, LogOut, UserPlus, Home } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";

// Hook para detectar dispositivos móviles
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
}

interface ClientLayoutProps {
  children: React.ReactNode;
  hideLayout?: boolean;
  isAuthenticated?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
}

export default function ClientLayout({
  children,
  hideLayout = false,
  isAuthenticated = false,
  onLogin,
  onLogout,
}: ClientLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen flex-col">
      {!hideLayout && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center px-2 md:px-4">
            {/* Izquierda: ícono y nombre de la app (clic para volver al chat principal) */}
            <div className="flex flex-1 items-center">
              <Link href="/" className="flex items-center space-x-2">
                <Home className="w-5 h-5 text-primary" />
                <span className="font-bold text-lg bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                  Veredix
                </span>
              </Link>
            </div>

            {/* Derecha: botones (solo en escritorio) */}
            <div className="hidden md:flex items-center space-x-2">
              {!isAuthenticated ? (
                <>
                  <Link href="/auth/login">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 transition-transform duration-200 hover:scale-105 active:scale-95"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Iniciar Sesión</span>
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1 transition-transform duration-200 hover:scale-105 active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Registrarse</span>
                    </Button>
                  </Link>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="flex items-center gap-1 transition-transform duration-200 hover:scale-105 active:scale-95"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Salir</span>
                </Button>
              )}

              {/* Toggle Theme */}
              <ThemeToggle />
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col">{children}</main>

      {!hideLayout && (
        <footer className="border-t py-6 md:py-0">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Desarrollado con{" "}
              <span className="font-semibold">Tecnología Avanzada</span>
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
