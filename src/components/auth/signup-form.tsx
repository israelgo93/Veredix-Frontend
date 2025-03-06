"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, MailOpen, AlertCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export function SignUpForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [name, setName] = useState<string>("")
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState<boolean>(false)
  const [resendLoading, setResendLoading] = useState<boolean>(false)
  const [resendSuccess, setResendSuccess] = useState<boolean>(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const router = useRouter()
  const { resendVerificationEmail } = useAuth()

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
          emailRedirectTo: `${window.location.origin}/auth/login`,
        },
      })

      if (error) {
        throw error
      }

      if (data.user) {
        setIsRegistered(true)
        // No redirigimos al usuario aún, primero le mostramos el mensaje de confirmación
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendVerification() {
    setResendLoading(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      const { success, error } = await resendVerificationEmail(email)
      
      if (error) {
        throw new Error(error)
      }

      setResendSuccess(true)
    } catch (error) {
      setResendError(error instanceof Error ? error.message : String(error))
    } finally {
      setResendLoading(false)
    }
  }

  if (isRegistered) {
    return (
      <Card className={cn("w-full max-w-sm", className)} {...props}>
        <div className="absolute top-0 left-0 right-0 p-4 bg-transparent">
          <Link href="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
            Veredix
          </Link>
        </div>
        <CardHeader className="space-y-1">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <MailOpen className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-center mt-4">Verifica tu cuenta</CardTitle>
          <CardDescription className="text-sm text-muted-foreground text-center">
            Hemos enviado un correo de verificación a <span className="font-medium">{email}</span>. Por favor, revisa tu bandeja de entrada y sigue las instrucciones para completar tu registro.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {resendSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center text-sm">
              <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>Correo de verificación reenviado correctamente.</span>
            </div>
          )}
          
          {resendError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center text-sm">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <span>{resendError}</span>
            </div>
          )}
          
          <div className="text-sm text-muted-foreground">
            <p>¿No recibiste el correo? Revisa tu carpeta de spam o solicita un nuevo correo de verificación.</p>
          </div>
          
          <Button
            onClick={handleResendVerification}
            disabled={resendLoading}
            className="w-full rounded-full px-4 py-2 text-sm font-medium bg-white text-black border border-gray-300 hover:bg-gray-100 transition-all"
          >
            {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reenviar correo de verificación
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground text-center w-full">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/auth/login" className="text-primary hover:underline underline-offset-4">
              Inicia sesión
            </Link>
          </div>
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => router.push("/")}
          >
            Volver al inicio
          </Button>
        </CardFooter>
      </Card>
    )
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