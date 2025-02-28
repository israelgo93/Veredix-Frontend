// chat-legal/src/components/theme-toggle.tsx
"use client";

import { Moon, Sun, Laptop, Settings, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../contexts/AuthContext";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      // Puedes recargar la página o realizar cualquier otra acción si lo deseas:
      // window.location.reload();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Configuraciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isAuthenticated && (
          <>
            {/* Datos del usuario */}
            <div className="px-3 py-2">
              <p className="text-sm font-semibold">
                {user?.user_metadata?.full_name || user?.email}
              </p>
              {user?.email && (
                <p className="text-xs text-muted-foreground">{user.email}</p>
              )}
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Etiqueta "Tema" */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center gap-2">
          <Moon className="h-4 w-4" />
          <span>Oscuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center gap-2">
          <Laptop className="h-4 w-4" />
          <span>Sistema</span>
        </DropdownMenuItem>

        {isAuthenticated && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
