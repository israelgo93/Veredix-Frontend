//src/components/ClientLayout.tsx
"use client";

import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";

interface ClientLayoutProps {
  children: React.ReactNode;
  hideLayout?: boolean;
}

export default function ClientLayout({ children, hideLayout = false }: ClientLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {!hideLayout && (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-14 items-center">
            <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
              <div className="w-full flex justify-between items-center">
                {/* Logo y título */}
                <Link href="/" className="flex items-center space-x-2">
                  <span className="font-bold inline-block bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                    Veredix
                  </span>
                </Link>

                {/* Controles del lado derecho */}
                <div className="flex items-center space-x-1">
                  <nav className="flex items-center space-x-1">
                    <ThemeToggle />
                  </nav>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 flex flex-col">
        {children}
      </main>

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
