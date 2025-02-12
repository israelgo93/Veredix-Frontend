//home/phiuser/phi/chat-legal/src/components/Sidebar.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  LogOut,
  MessageSquarePlus,
  Menu,
  User,
  LogIn,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SidebarProps {
  isAuthenticated?: boolean;
  userName?: string;
  onNewChat: () => void;
  onLogout?: () => void;
  onLogin?: () => void;
}

export function Sidebar({
  isAuthenticated = false,
  userName = "",
  onNewChat,
  onLogout,
  onLogin,
}: SidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          // Se aumenta el z-index para asegurar que se muestre sobre el header
          className="fixed left-4 top-4 z-60 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[280px] border-r bg-background/80 backdrop-blur-sm p-0"
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="flex items-center justify-between">
            <span>Menú</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronRight
                className={cn(
                  "h-4 w-4 transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Contenido principal */}
          <div className="flex-1 overflow-auto px-4 py-4">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 mb-2"
              onClick={onNewChat}
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Nuevo Chat</span>
            </Button>
          </div>

          {/* Footer con opciones de usuario */}
          <div className="border-t p-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span>{userName}</span>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={onLogin}
              >
                <LogIn className="h-4 w-4" />
                <span>Iniciar Sesión</span>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
