// src/components/auth/update-password-form.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"

export function UpdatePasswordForm({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const { updatePassword } = useAuth()
  const router = useRouter()

  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setIsLoading(false)
      return
    }

    try {
      const { success, error } = await updatePassword(password)
      
      if (error) {
        throw new Error(error)
      }

      if (success) {
        setSuccess(true)
        setTimeout(() => {
          router.push("/auth/login")
        }, 3000)
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
        <CardTitle className="text-xl font-bold tracking-tight">Actualizar contraseña</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Ingresa tu nueva contraseña para tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {success ? (
          <div className="flex flex-col items-center text-center space-y-4 py-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div className="space-y-2">
              <h3 className="font-medium text-lg">¡Contraseña actualizada!</h3>
              <p className="text-sm text-muted-foreground">
                Tu contraseña ha sido actualizada con éxito. Serás redirigido a la página de inicio de sesión...
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm">
                  Nueva contraseña
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
              <div className="grid gap-2">
                <Label htmlFor="confirm-password" className="text-sm">
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="text-sm"
                />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button
                type="submit"
                disabled={isLoading || !password || !confirmPassword}
                className="w-full rounded-full px-4 py-2 text-sm font-medium bg-black text-white border border-gray-300 hover:bg-gray-800 transition-all"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar contraseña
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground text-center w-full">
          <Link href="/auth/login" className="flex items-center justify-center text-primary hover:underline underline-offset-4">
            <ArrowLeft className="mr-1 h-4 w-4" /> Volver a inicio de sesión
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}