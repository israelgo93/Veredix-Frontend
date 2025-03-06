// src/app/auth/verification-expired/page.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, MailOpen, CheckCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

export default function VerificationExpiredPage() {
  const [email, setEmail] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { resendVerificationEmail } = useAuth()

  async function handleResendVerification() {
    if (!email || !email.includes("@")) {
      setError("Por favor, introduce un correo electrónico válido")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const { success, error } = await resendVerificationEmail(email)
      
      if (error) {
        throw new Error(error)
      }

      setSuccess(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex flex-col min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>
        
        <Card className="w-full max-w-sm">
          <div className="absolute top-0 left-0 right-0 p-4 bg-transparent">
            <Link href="/" className="text-2xl font-bold text-primary hover:text-primary/80 transition-colors">
              Veredix
            </Link>
          </div>
          
          <CardHeader className="space-y-1">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
              <MailOpen className="h-10 w-10 text-yellow-600" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-center mt-4">Verificación expirada</CardTitle>
            <CardDescription className="text-sm text-muted-foreground text-center">
              El enlace de verificación ha expirado o no es válido. Ingresa tu correo electrónico para recibir un nuevo enlace de verificación.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="grid gap-4">
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center text-sm">
                <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>Correo de verificación enviado correctamente. Por favor, revisa tu bandeja de entrada.</span>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center text-sm">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
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
            
            <Button
              onClick={handleResendVerification}
              disabled={isLoading}
              className="w-full rounded-full px-4 py-2 text-sm font-medium bg-black text-white border border-gray-300 hover:bg-gray-800 transition-all"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar nuevo enlace
            </Button>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground text-center w-full">
              ¿Ya tienes una cuenta verificada?{" "}
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
      </div>
      
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        <p>&copy; 2025 Veredix. Todos los derechos reservados.</p>
      </footer>
    </main>
  )
}