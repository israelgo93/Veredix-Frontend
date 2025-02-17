//home/phiuser/phi/chat-legal/src/components/auth/login-form.tsx
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface LoginFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function LoginForm({ className, ...props }: LoginFormProps) {
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 3000)
  }

  return (
    <Card className={cn("w-full max-w-sm", className)} {...props}>
      <div className="absolute top-0 left-0 right-0 p-4 bg-transparent">
        <Link href="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
          Veredix
        </Link>
      </div>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight">Te damos la bienvenida de nuevo</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm">
              Contraseña
            </Label>
            <Link href="/auth/reset-password" className="text-sm text-muted-foreground hover:text-primary">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input id="password" type="password" disabled={isLoading} className="text-sm" />
        </div>
        <Button
          onClick={onSubmit}
          disabled={isLoading}
          className="w-full rounded-full px-4 py-2 text-sm font-medium bg-white text-black border border-gray-300 hover:bg-gray-100 transition-all"
        >
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
  )
}

