// src/app/about/page.tsx
"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import { useAuth } from "@/contexts/AuthContext"
import {
  ArrowRight,
  Brain,
  Scale,
  Shield,
  Search,
  BookOpen,
  Files,
  PenLine,
  BookOpenCheck,
  Building2,
  BadgeCheck,
  Clock,
  Bot,
  User,
  Loader2,
} from "lucide-react"

export default function AboutPage() {
  const { isAuthenticated, user, loading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Asegurarse de que el componente está montado para evitar problemas de hidratación
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <main className="flex min-h-screen flex-col bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white dark:bg-gray-900 shadow-sm">
        <div className="container flex h-14 items-center px-4">
          <div className="flex flex-1 items-center">
            <Link href="/" className="flex items-center">
              <span className="font-bold text-2xl dark:text-gray-200 text-gray-700">Veredix</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Solo mostrar indicador de usuario o carga */}
            {loading ? (
              // Mostrar indicador de carga mientras se verifica la autenticación
              <div className="w-8 h-8 flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : isAuthenticated ? (
              // Mostrar un indicador del usuario cuando está autenticado
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium hidden md:block">
                  {user?.user_metadata?.full_name || user?.email || "Usuario"}
                </div>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
              </div>
            ) : null}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>
        <div className="container mx-auto px-4 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Acerca de <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">Veredix</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
            El asistente legal inteligente diseñado para transformar la forma en que accedes a información jurídica
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/">
              <Button className="rounded-full gap-2 px-6">
                Comenzar ahora <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ¿Qué es Veredix? */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">¿Qué es Veredix?</h2>
            <p className="text-muted-foreground">
              Veredix es un asistente legal impulsado por inteligencia artificial, diseñado para proporcionar información jurídica precisa, 
              responder consultas legales y ayudar en la redacción de documentos jurídicos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-primary/10 p-1.5 rounded-full">
                    <Scale className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Asistencia legal accesible</h3>
                    <p className="text-muted-foreground text-sm">
                      Democratizamos el acceso a la información jurídica con una interfaz intuitiva y respuestas claras en lenguaje natural.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-primary/10 p-1.5 rounded-full">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Potenciado por IA avanzada</h3>
                    <p className="text-muted-foreground text-sm">
                      Utilizamos tecnología de punta en inteligencia artificial para proporcionar respuestas precisas basadas en conocimiento legal.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-primary/10 p-1.5 rounded-full">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Fiabilidad y precisión</h3>
                    <p className="text-muted-foreground text-sm">
                      Nuestro sistema se conecta a fuentes legales confiables y proporciona citas a las normativas correspondientes.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 bg-primary/10 p-1.5 rounded-full">
                    <PenLine className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Asistencia en redacción</h3>
                    <p className="text-muted-foreground text-sm">
                      Ayuda en la elaboración de documentos legales como contratos, recursos y solicitudes legales.
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="relative rounded-xl overflow-hidden aspect-video shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-600/20 backdrop-blur-sm"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg max-w-xs">
                  <Scale className="h-12 w-12 mx-auto text-primary mb-4" />
                  <h3 className="font-bold text-lg mb-2">Veredix</h3>
                  <p className="text-sm text-muted-foreground">
                    Asistente legal inteligente disponible 24/7 para resolver tus consultas jurídicas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">¿Cómo funciona Veredix?</h2>
            <p className="text-muted-foreground">
              Veredix utiliza tecnología RAG (Retrieval-Augmented Generation) combinada con modelos avanzados de IA para proporcionar respuestas precisas.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 rounded-xl shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">1. Búsqueda inteligente</h3>
                  <p className="text-muted-foreground text-sm">
                    Tu consulta es analizada por nuestros modelos de IA para entender el contexto legal y requisitos específicos.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 rounded-xl shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">2. Recuperación de información</h3>
                  <p className="text-muted-foreground text-sm">
                    El sistema busca en bases de datos jurídicas y fuentes legales verificadas para obtener información relevante.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 rounded-xl shadow-md">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-primary/10 p-3 rounded-full mb-4">
                    <Files className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-bold mb-2">3. Generación de respuestas</h3>
                  <p className="text-muted-foreground text-sm">
                    La IA genera una respuesta clara en lenguaje natural, citando las fuentes legales pertinentes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Tecnología */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">Tecnología de vanguardia</h2>
            <p className="text-muted-foreground">
              Veredix está impulsado por los modelos de inteligencia artificial más avanzados del mercado.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 rounded-xl shadow-md">
              <CardContent className="pt-6">
                <h3 className="font-bold text-xl mb-4 flex items-center">
                  <Bot className="h-5 w-5 mr-2 text-primary" />
                  Modelos de IA avanzados
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Claude 3.7 de Anthropic para razonamiento legal complejo</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>o3-mini de OpenAI para procesamiento eficiente de consultas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Modelos especializados en razonamiento jurídico</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-0 rounded-xl shadow-md">
              <CardContent className="pt-6">
                <h3 className="font-bold text-xl mb-4 flex items-center">
                  <BookOpenCheck className="h-5 w-5 mr-2 text-primary" />
                  Tecnología RAG
                </h3>
                <p className="text-muted-foreground mb-4">
                  La tecnología de Retrieval-Augmented Generation (RAG) permite que Veredix:
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Acceda a bases de datos jurídicas actualizadas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Proporcione respuestas fundamentadas en legislación vigente</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>Cite artículos y normativas específicas relevantes</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Casos de uso */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">¿Para quién está diseñado Veredix?</h2>
            <p className="text-muted-foreground">
              Veredix es una herramienta versátil que ofrece valor para diversos usuarios en el ámbito legal.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 rounded-xl shadow-md p-6">
              <div className="mb-4">
                <div className="bg-primary/10 p-2 rounded-full w-fit">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h3 className="font-bold mb-2">Profesionales legales</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Investigación jurídica eficiente</li>
                <li>• Asistencia en redacción de documentos</li>
                <li>• Consulta rápida de normativas específicas</li>
                <li>• Automatización de tareas repetitivas</li>
              </ul>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 rounded-xl shadow-md p-6">
              <div className="mb-4">
                <div className="bg-primary/10 p-2 rounded-full w-fit">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h3 className="font-bold mb-2">Empresas y organizaciones</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Asistencia en compliance legal</li>
                <li>• Consultas sobre normativa laboral</li>
                <li>• Orientación en trámites administrativos</li>
                <li>• Redacción de contratos y acuerdos</li>
              </ul>
            </Card>

            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 rounded-xl shadow-md p-6">
              <div className="mb-4">
                <div className="bg-primary/10 p-2 rounded-full w-fit">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <h3 className="font-bold mb-2">Ciudadanos</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Orientación legal general</li>
                <li>• Consultas sobre derechos y obligaciones</li>
                <li>• Ayuda con procedimientos legales comunes</li>
                <li>• Asistencia en la interpretación de documentos legales</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-primary/5 rounded-2xl p-8 md:p-12 text-center relative">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">Comienza a utilizar Veredix hoy</h2>
            <p className="text-muted-foreground mb-6">
              Descubre cómo Veredix puede transformar tu forma de acceder a información legal.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/">
                  <Button className="rounded-full px-6">
                    Ir al chat
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/">
                    <Button className="rounded-full px-6">
                      Probar Veredix gratis
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button variant="outline" className="rounded-full px-6">
                      Crear cuenta
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0 bg-white dark:bg-gray-900">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground">
            © 2025 Veredix. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary">
              Términos de servicio
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary">
              Política de privacidad
            </Link>
          </div>
        </div>
      </footer>
    </main>
  )
}