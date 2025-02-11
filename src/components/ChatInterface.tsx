"use client"

import * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Paperclip, ArrowUp, ArrowDown, Copy, RotateCcw, Share, User, Loader2, Check, BookOpen } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { useChat, type Source } from "../hooks/useChat"
import { useTheme } from "next-themes"
import { ThemeToggle } from "./theme-toggle"
import AutoResizingTextarea from "./AutoResizingTextarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QuickActions } from "./QuickActions"

// Hook para detectar si se está en modo móvil (ancho menor a 768px)
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  return isMobile
}

// Estilos para Markdown
const markdownStyles = {
  root: "space-y-4 leading-normal text-sm md:text-base",
  p: "mb-3 leading-relaxed",
  h1: "scroll-m-20 text-2xl font-bold tracking-tight mb-4 pb-2 border-b first:mt-0",
  h2: "scroll-m-20 text-xl font-semibold tracking-tight mb-3 mt-6 first:mt-0",
  h3: "scroll-m-20 text-lg font-semibold tracking-tight mb-2 mt-4",
  h4: "scroll-m-20 text-base font-semibold tracking-tight mb-2 mt-3",
  ul: "list-disc list-inside mb-3 space-y-1 [&>li]:mt-1",
  ol: "list-decimal list-inside mb-3 space-y-1 [&>li]:mt-1",
  li: "leading-relaxed [&>p]:inline [&>ul]:mt-2 [&>ol]:mt-2",
  a: "font-medium underline underline-offset-4 decoration-primary/50 hover:decoration-primary transition-colors",
  blockquote: "mt-4 border-l-4 border-primary/20 pl-4 italic [&>p]:text-muted-foreground",
  code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs md:text-sm",
  pre: "mb-3 mt-3 overflow-x-auto rounded-lg border bg-muted p-3",
  table: "w-full my-4 border-collapse border border-border text-sm",
  th: "border border-border px-3 py-2 text-left font-bold bg-muted",
  td: "border border-border px-3 py-2",
  hr: "my-6 border-border",
  img: "rounded-lg border border-border max-w-full h-auto",
  strong: "font-semibold",
  em: "italic",
}

// Indicador "Pensando..."
const ThinkingIndicator = () => (
  <div className="inline-flex items-center gap-2 px-3 py-2">
    <Loader2 className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
    <div
      className="animate-shimmer translate-y-px bg-[length:800%_100%] bg-clip-text text-transparent text-xs md:text-sm"
      style={{
        backgroundImage:
          "linear-gradient(90deg, rgb(161, 161, 170) 0%, rgb(212, 212, 216) 50%, rgb(161, 161, 170) 100%)",
      }}
    >
      Pensando...
    </div>
  </div>
)

// Componente para cada fuente en formato acordeón
interface SourceAccordionProps {
  source: Source
}
const SourceAccordion = ({ source }: SourceAccordionProps) => {
  const [expanded, setExpanded] = useState(false)
  const summary = source.content.length > 100 ? source.content.slice(0, 100).trim() + "..." : source.content

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-2 mb-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-xs md:text-sm">{source.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">Página {source.meta_data?.page || "N/A"}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Mostrar menos" : "Leer más"}
        </Button>
      </div>
      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        {expanded ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {source.content}
          </ReactMarkdown>
        ) : (
          <p>{summary}</p>
        )}
      </div>
    </div>
  )
}

// Lista de Fuentes
const SourcesList = ({ sources }: { sources: Source[] }) => {
  return (
    <div className="space-y-2">
      {sources.map((source, index) => (
        <SourceAccordion key={index} source={source} />
      ))}
    </div>
  )
}

// Botones de acciones para cada mensaje
interface MessageActionsProps {
  content: string
  copyToClipboard: (text: string) => void
  onRegenerate: () => void
  hasSources?: boolean
  toggleSources?: () => void
}
const MessageActions = ({
  content,
  copyToClipboard,
  onRegenerate,
  hasSources = false,
  toggleSources,
}: MessageActionsProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    copyToClipboard(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleShare = (platform: string) => {
    let url = ""
    const text = encodeURIComponent(content)
    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${text}`
        break
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${text}`
        break
      case "linkedin":
        url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(window.location.href)}&title=Respuesta del Asistente Legal IA&summary=${text}`
        break
      case "whatsapp":
        url = `https://api.whatsapp.com/send?text=${text}`
        break
    }
    window.open(url, "_blank")
  }

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1 mt-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copiado" : "Copiar"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={onRegenerate}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Regenerar respuesta</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                  <Share className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Compartir respuesta</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleShare("twitter")}>Twitter</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("facebook")}>Facebook</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("linkedin")}>LinkedIn</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("whatsapp")}>WhatsApp</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasSources && toggleSources && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={toggleSources}>
                <BookOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Fuentes</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}

// Panel de Fuentes para desktop
interface SourcesDrawerProps {
  sources: Source[]
  onClose: () => void
}
const SourcesDrawer = ({ sources, onClose }: SourcesDrawerProps) => {
  return (
    <div className="flex flex-col w-full md:w-[400px] bg-background dark:bg-gray-900 shadow-message border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-base font-bold">Fuentes</h2>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={onClose}>
          Cerrar
        </Button>
      </div>
      <div className="p-4">
        <SourcesList sources={sources} />
      </div>
    </div>
  )
}

const ChatInterface = () => {
  const { messages, sendMessage, isLoading, cancelRequest, canStopResponse, sources } = useChat()
  const { theme } = useTheme()
  const [isInitialView, setIsInitialView] = useState(true)
  const [input, setInput] = useState("")
  const [showSources, setShowSources] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobile()

  // Función para copiar texto al portapapeles
  const copyToClipboard = useCallback((text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => console.log("Texto copiado al portapapeles"))
        .catch((err) => console.error("Error al copiar texto: ", err))
    } else {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      try {
        document.execCommand("copy")
        console.log("Texto copiado con fallback")
      } catch (err) {
        console.error("Fallback: Error al copiar texto", err)
      }
      document.body.removeChild(textarea)
    }
  }, [])

  // Efecto para auto scroll en cada actualización de mensajes o cuando el asistente responde
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    if (isLoading) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
    } else {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceFromBottom < 100) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
      }
    }
  }, [messages, isLoading])

  // Control del scroll para mostrar/ocultar el botón
  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (container) {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      if (distanceFromBottom > 100) {
        setShowScrollButton(true)
      } else {
        setShowScrollButton(false)
      }
    }
  }

  const scrollToBottom = () => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
      setShowScrollButton(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const message = input
    setInput("")
    setIsInitialView(false)
    setErrorMessage(null)
    try {
      await sendMessage(message)
    } catch (error) {
      setErrorMessage(`Error al enviar el mensaje: ${error instanceof Error ? error.message : String(error)}`)
      console.error("Error al enviar el mensaje:", error)
    }
  }

  const handleQuickAction = async (text: string) => {
    setInput("")
    setIsInitialView(false)
    setErrorMessage(null)
    try {
      await sendMessage(text)
    } catch (error) {
      setErrorMessage(`Error al procesar la acción rápida: ${error instanceof Error ? error.message : String(error)}`)
      console.error("Error en acción rápida:", error)
    }
  }

  const handleRegenerate = async () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content, true)
    }
  }

  return (
    <div className="flex h-screen bg-background text-sm overflow-hidden">
      {/* Contenedor principal: chat y panel de Fuentes */}
      <div
        className="flex flex-1 flex-col transition-all duration-300"
        style={{
          width: isMobile ? "100%" : showSources ? "calc(100% - 400px)" : "100%",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <h1 className="text-xl md:text-3xl font-semibold bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
            Asistente Legal IA
          </h1>
          <ThemeToggle />
        </div>

        {errorMessage && (
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          </div>
        )}

        {isInitialView ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl space-y-6 px-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8 bg-gradient-to-r from-primary via-primary/80 to-primary/50 bg-clip-text text-transparent">
                ¿En qué puedo ayudarte hoy?
              </h2>
              <Card className="p-0 shadow-lg mx-auto w-full bg-background/50 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex flex-col p-3 md:p-4">
                    <AutoResizingTextarea
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Escribe tu consulta legal aquí..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit(e)
                        }
                      }}
                      autoFocus
                      ref={textareaRef}
                      className="min-h-[60px] md:min-h-[100px]"
                    />
                    <div className="flex items-center justify-end gap-2 mt-3 md:mt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground rounded-full transition-colors"
                        disabled={!input.trim()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        type="submit"
                        size="icon"
                        className="rounded-full transition-colors"
                        disabled={!input.trim()}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
              <QuickActions onQuickAction={handleQuickAction} />
            </div>
          </div>
        ) : (
          <>
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="relative flex-1 overflow-y-auto p-3 md:p-4 lg:p-6"
            >
              <div className="max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto space-y-6 md:space-y-8">
                {messages.map((message, index) => (
                  <div key={index} className="group flex justify-center">
                    <div className="w-full max-w-3xl">
                      <div
                        className={`flex items-start gap-3 md:gap-4 ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <Avatar className="w-8 h-8 md:w-10 md:h-10 border">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs md:text-sm font-medium">
                              IA
                            </div>
                          </Avatar>
                        ) : (
                          <Avatar className="w-8 h-8 md:w-10 md:h-10 order-last border">
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs md:text-sm font-medium">
                              <User className="h-5 w-5 md:h-6 md:w-6" />
                            </div>
                          </Avatar>
                        )}
                        <div className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}>
                          <div
                            className={`max-w-[85%] px-4 md:px-6 py-3 md:py-4 bg-card/30 backdrop-blur-sm flex items-center ${
                              message.role === "user" ? "text-primary justify-end" : "text-foreground justify-start"
                            }`}
                          >
                            {message.content === "Pensando..." ? (
                              <ThinkingIndicator />
                            ) : (
                              <div className="prose prose-neutral dark:prose-invert max-w-none text-sm md:text-base">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  rehypePlugins={[rehypeRaw]}
                                  components={{
                                    p: ({ children }) => <p className={markdownStyles.p}>{children}</p>,
                                    h1: ({ children }) => <h1 className={markdownStyles.h1}>{children}</h1>,
                                    h2: ({ children }) => <h2 className={markdownStyles.h2}>{children}</h2>,
                                    h3: ({ children }) => <h3 className={markdownStyles.h3}>{children}</h3>,
                                    h4: ({ children }) => <h4 className={markdownStyles.h4}>{children}</h4>,
                                    ul: ({ children }) => <ul className={markdownStyles.ul}>{children}</ul>,
                                    ol: ({ children }) => <ol className={markdownStyles.ol}>{children}</ol>,
                                    li: ({ children }) => <li className={markdownStyles.li}>{children}</li>,
                                    a: ({ href, children }) => (
                                      <a href={href} className={markdownStyles.a}>
                                        {children}
                                      </a>
                                    ),
                                    blockquote: ({ children }) => (
                                      <blockquote className={markdownStyles.blockquote}>{children}</blockquote>
                                    ),
                                    code: ({ inline, children }) =>
                                      inline ? (
                                        <code className={markdownStyles.code}>{children}</code>
                                      ) : (
                                        <pre className={markdownStyles.pre}>
                                          <code>{children}</code>
                                        </pre>
                                      ),
                                    table: ({ children }) => (
                                      <div className="overflow-x-auto">
                                        <table className={markdownStyles.table}>{children}</table>
                                      </div>
                                    ),
                                    th: ({ children }) => <th className={markdownStyles.th}>{children}</th>,
                                    td: ({ children }) => <td className={markdownStyles.td}>{children}</td>,
                                    hr: () => <hr className={markdownStyles.hr} />,
                                    img: (props) => <img {...props} className={markdownStyles.img} />,
                                    strong: ({ children }) => (
                                      <strong className={markdownStyles.strong}>{children}</strong>
                                    ),
                                    em: ({ children }) => <em className={markdownStyles.em}>{children}</em>,
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                          {message.role === "assistant" && (
                            <MessageActions
                              content={message.content}
                              copyToClipboard={copyToClipboard}
                              onRegenerate={handleRegenerate}
                              hasSources={sources.length > 0}
                              toggleSources={() => setShowSources((prev) => !prev)}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>
            {/* Botón de scroll: se ubica justo arriba del input */}
            {showScrollButton && (
              <div className="flex justify-center mb-2">
                <button
                  className="animate-slowBounce shadow-base bg-background hover:bg-muted flex items-center justify-center rounded-full text-gray-500 drop-shadow-md p-2"
                  type="button"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="bg-transparent">
              <div className="max-w-3xl mx-auto px-3 md:px-4 py-3 md:py-4">
                <Card className="p-0 shadow-lg mx-auto w-full bg-background/50 backdrop-blur-sm rounded-xl border-0">
                  <form onSubmit={handleSubmit} className="relative flex flex-col gap-2 p-3 md:p-4">
                    <AutoResizingTextarea
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Escribe tu consulta legal aquí..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault()
                          handleSubmit(e)
                        }
                      }}
                      autoFocus
                      ref={textareaRef}
                      className="min-h-[60px] md:min-h-[100px] text-sm border-0 focus-visible:ring-0 bg-transparent resize-none"
                    />
                    <div className="flex items-center justify-end pt-2 border-t border-border/40">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground rounded-full transition-colors"
                        disabled={!input.trim()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        type="submit"
                        size="icon"
                        className="rounded-full transition-colors"
                        disabled={isLoading || !input.trim()}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Panel de Fuentes */}
      {showSources &&
        sources.length > 0 &&
        (isMobile ? (
          <div className="fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black opacity-50" onClick={() => setShowSources(false)}></div>
            <div className="relative w-full bg-background dark:bg-gray-900 shadow-message overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-bold">Fuentes</h2>
                <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowSources(false)}>
                  Cerrar
                </Button>
              </div>
              <div className="p-4">
                <SourcesList sources={sources} />
              </div>
            </div>
          </div>
        ) : (
          <SourcesDrawer sources={sources} onClose={() => setShowSources(false)} />
        ))}
    </div>
  )
}

export default ChatInterface
