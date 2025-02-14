//home/phiuser/phi/chat-legal/src/components/auth/login-form.tsx
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
import { Github, Loader2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LoginFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function LoginForm({ className, ...props }: LoginFormProps) {
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
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight">Iniciar sesión</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email" className="text-sm">Correo electrónico</Label>
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm">Contraseña</Label>
            <Link href="/auth/reset-password" className="text-sm text-muted-foreground hover:text-primary">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input id="password" type="password" disabled={isLoading} className="text-sm" />
        </div>
        <Button className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Iniciar sesión
        </Button>
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground text-center w-full">
          ¿No tienes una cuenta?{" "}
          <Link href="/auth/signup" className="text-primary hover:underline underline-offset-4">
            Regístrate
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
