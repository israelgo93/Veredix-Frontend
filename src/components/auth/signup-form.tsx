//home/phiuser/phi/chat-legal/src/components/auth/signup-form.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface SignUpFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SignUpForm({ className, ...props }: SignUpFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 3000);
  }

  return (
    <Card className={cn("w-full max-w-sm", className)} {...props}>
      {/* Botón para volver al inicio */}
      <div className="flex justify-end p-2">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-3 py-1 border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition-all"
          >
            Volver a inicio
          </Button>
        </Link>
      </div>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight">Crear cuenta</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Crea una cuenta para acceder a todas las funcionalidades
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-2 gap-6">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-3 py-1 border border-gray-300"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full px-3 py-1 border border-gray-300"
          >
            <Github className="mr-2 h-4 w-4" />
            GitHub
          </Button>
        </div>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              O regístrate con
            </span>
          </div>
        </div>
        <form onSubmit={onSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm">
                Nombre completo
              </Label>
              <Input
                id="name"
                placeholder="Juan Pérez"
                autoCapitalize="words"
                disabled={isLoading}
                className="text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-sm">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="nombre@ejemplo.com"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isLoading}
                className="text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password" className="text-sm">
                Contraseña
              </Label>
              <Input id="password" type="password" disabled={isLoading} className="text-sm" />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full px-4 py-2 text-sm font-medium bg-black text-white border border-gray-300 hover:bg-gray-800 transition-all"
            >
              {isLoading && <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />}
              Crear cuenta
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground text-center w-full">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/auth/login" className="text-primary hover:underline underline-offset-4">
            Inicia sesión
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
