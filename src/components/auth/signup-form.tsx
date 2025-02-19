"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export function SignUpForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [name, setName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        router.push("/")
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className={cn("w-full max-w-sm", className)} {...props}>
      <div className="absolute top-0 left-0 right-0 p-4 bg-transparent">
        <Link href="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
          Veredix
        </Link>
      </div>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight">Crear cuenta</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Crea una cuenta para acceder a todas las funcionalidades
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form onSubmit={onSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-sm">
                Nombre completo
              </Label>
              <Input
                id="name"
                placeholder="Juan Pérez"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="text-sm"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full px-4 py-2 text-sm font-medium bg-black text-white border border-gray-300 hover:bg-gray-800 transition-all"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
  )
}

