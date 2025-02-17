"use client"

import { useState, useEffect, useRef, useCallback, type FormEvent, type KeyboardEvent, type ChangeEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import {
  Paperclip,
  ArrowUp,
  ArrowDown,
  Copy,
  RotateCcw,
  Share,
  User,
  Loader2,
  Check,
  BookOpen,
  Menu,
  ChevronsLeft,
  ChevronsRight,
  Edit,
  Trash2,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { useChat, type Source } from "../hooks/useChat"
import { useTheme } from "next-themes"
import AutoResizingTextarea from "./AutoResizingTextarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { QuickActions } from "./QuickActions"
import { Sidebar } from "./Sidebar"
import Link from "next/link"

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])
  return isMobile
}

const markdownStyles = {
  root: "space-y-4 leading-normal text-sm md:text-base",
  p: "mb-3 leading-relaxed",
  h1: "scroll-m-20 text-xl md:text-2xl font-bold tracking-tight mb-4 pb-2 border-b first:mt-0",
  h2: "scroll-m-20 text-lg md:text-xl font-semibold tracking-tight mb-3 mt-6 first:mt-0",
  h3: "scroll-m-20 text-base md:text-lg font-semibold tracking-tight mb-2 mt-4",
  h4: "scroll-m-20 text-sm md:text-base font-semibold tracking-tight mb-2 mt-3",
  ul: "list-disc list-inside mb-3 space-y-1 [&>li]:mt-1",
  ol: "list-decimal list-inside mb-3 space-y-1 [&>li]:mt-1",
  li: "leading-relaxed [&>p]:inline [&>ul]:mt-2 [&>ol]:mt-2",
  a: "font-medium underline underline-offset-4 decoration-primary/50 hover:decoration-primary transition-colors",
  blockquote: "mt-4 border-l-4 border-primary/20 pl-4 italic [&>p]:text-muted-foreground",
  code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs md:text-sm",
  pre: "mb-3 mt-3 overflow-x-auto rounded-lg border bg-muted p-3",
}

const ThinkingIndicator = () => (
  <div className="inline-flex items-center gap-2 px-3 py-2">
    <span className="align-middle text-sm font-medium animate-pulse bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
      Pensando
    </span>
  </div>
)

interface SourceAccordionProps {
  source: Source
}

const SourceAccordion = ({ source }: SourceAccordionProps) => {
  const [expanded, setExpanded] = useState(false)
  const summary = source.content.length > 100 ? source.content.slice(0, 100).trim() + "..." : source.content

  return (
    <div className="border-b border-border pb-2 mb-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-xs md:text-sm">{source.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">Página {source.meta_data?.page || "N/A"}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs transition-transform duration-200 hover:scale-105 active:scale-95"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Mostrar menos" : "Leer más"}
        </Button>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
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

const SourcesList = ({ sources }: { sources: Source[] }) => (
  <div className="space-y-2">
    {sources.map((source, index) => (
      <SourceAccordion key={index} source={source} />
    ))}
  </div>
)

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
        url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
          window.location.href,
        )}&title=Respuesta del Asistente Legal IA&summary=${text}`
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 transition-transform duration-200 hover:scale-105 active:scale-95"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copiado" : "Copiar"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 transition-transform duration-200 hover:scale-105 active:scale-95"
              onClick={onRegenerate}
            >
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
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 p-0 transition-transform duration-200 hover:scale-105 active:scale-95"
                >
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 transition-transform duration-200 hover:scale-105 active:scale-95"
                onClick={toggleSources}
              >
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

interface SourcesDrawerProps {
  sources: Source[]
  onClose: () => void
}

const SourcesDrawer = ({ sources, onClose }: SourcesDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div ref={drawerRef} className="w-screen max-w-md transform transition-all duration-300 ease-in-out relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-[10000] rounded-md p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-transform duration-200 hover:scale-105 active:scale-95"
            aria-label="Cerrar panel de fuentes"
          >
            <ChevronsRight className="h-6 w-6" />
          </button>
          <div className="flex h-full flex-col overflow-hidden bg-background/50 backdrop-blur-sm rounded-xl shadow-lg">
            <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/70 px-4 py-3">
              <h2 className="text-lg font-semibold">Fuentes</h2>
            </div>
            <div className="relative flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-6">
                <SourcesList sources={sources} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ChatInterfaceProps {
  onChatStarted?: () => void
  onNewChat?: () => void
  isAuthenticated?: boolean
  userName?: string
  onLogout?: () => void
  onLogin?: () => void
}

export default function ChatInterface({
  onChatStarted,
  onNewChat,
  isAuthenticated = false,
  userName = "",
  onLogout,
  onLogin,
}: ChatInterfaceProps) {
  const {
    messages,
    sendMessage,
    isLoading,
    sources,
    userSessions,
    deleteSession,
    renameSession,
    currentUserId,
    currentSessionId,
    loadSession,
  } = useChat()
  const { theme } = useTheme()
  const [isInitialView, setIsInitialView] = useState(true)
  const [input, setInput] = useState("")
  const [showSources, setShowSources] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isMobile = useIsMobile()
  const isScrollingRef = useRef(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [chatStarted, setChatStarted] = useState(false)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)

  useEffect(() => {
    console.log("ChatInterface mounted")
    return () => {
      console.log("ChatInterface unmounted")
    }
  }, [])

  useEffect(() => {
    if (!isInitialView) {
      console.log("Chat started")
      setChatStarted(true)
      onChatStarted?.()
    }
  }, [isInitialView, onChatStarted])

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
  }, [isLoading])

  const handleScroll = () => {
    const container = messagesContainerRef.current
    if (container) {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
      setShowScrollButton(distanceFromBottom > 100)
    }
  }

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && !isScrollingRef.current) {
      isScrollingRef.current = true
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
      setTimeout(() => {
        isScrollingRef.current = false
      }, 500)
    }
  }, [])

  useEffect(() => {
    if (!isLoading) {
      setRegeneratingIndex(null)
    }
  }, [isLoading])

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

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const message = input
    setInput("")
    setIsInitialView(false)
    setErrorMessage(null)
    try {
      console.log("Sending message:", message)
      await sendMessage(message)
    } catch (error) {
      console.error("Error sending message:", error)
      setErrorMessage(`Error al enviar el mensaje: ${error instanceof Error ? error.message : JSON.stringify(error)}`)
    } finally {
      setTimeout(scrollToBottom, 100)
    }
  }

  const handleQuickAction = async (text: string) => {
    setInput("")
    setIsInitialView(false)
    setErrorMessage(null)
    try {
      await sendMessage(text)
    } catch (error) {
      console.error("Error en acción rápida:", error)
      setErrorMessage(`Error al procesar la acción rápida: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleRegenerate = async () => {
    let lastAssistantIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        lastAssistantIndex = i
        break
      }
    }
    if (lastAssistantIndex !== -1) {
      setRegeneratingIndex(lastAssistantIndex)
    }
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    if (lastUserMessage) {
      await sendMessage(lastUserMessage.content, true)
    }
  }

  const handleNewChatRequest = () => {
    if (isAuthenticated) {
      window.location.reload()
    } else if (messages.length > 0) {
      setShowNewChatModal(true)
    } else {
      window.location.reload()
    }
  }

  const handleSessionSelect = async (sessionId: string) => {
    try {
      await loadSession(sessionId)
      setIsInitialView(false)
    } catch (error) {
      console.error("Error loading session:", error)
      setErrorMessage("Error loading chat history")
    }
  }

  const handleSessionDelete = async (sessionId: string) => {
    await deleteSession(sessionId)
  }

  const handleSessionRename = async (sessionId: string, newTitle: string) => {
    await renameSession(sessionId, newTitle)
  }

  useEffect(() => {
    //This effect is now empty because session loading is handled in handleSessionSelect
  }, [])

  return (
    <div
      className={`flex bg-white dark:bg-gray-900 text-sm overflow-hidden fixed inset-x-0 bottom-0 ${
        chatStarted ? "bg-transparent" : ""
      }`}
      style={{ top: "64px" }}
    >
      {!chatStarted && (
        <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
          <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        </div>
      )}
      {!isInitialView && isMobile && (
        <header className="fixed top-0 left-0 right-0 h-16 flex items-center px-3 bg-white dark:bg-gray-900 shadow-md z-50 justify-between">
          <div>
            <Button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              variant="ghost"
              size="icon"
              className="p-2 bg-card/80 hover:bg-card rounded-md shadow-md transition-transform duration-200 hover:scale-105 active:scale-95"
              aria-label={sidebarOpen ? "Cerrar barra lateral" : "Abrir barra lateral"}
            >
              {sidebarOpen ? <ChevronsLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
          <div>
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full px-3 py-1 bg-white text-black dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </header>
      )}

      <div className="flex-1 flex flex-col transition-all duration-300 w-full">
        {errorMessage && (
          <div className="max-w-3xl mx-auto px-4 py-2">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <span className="block sm:inline">{errorMessage}</span>
            </div>
          </div>
        )}
        {sessionError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{sessionError}</span>
          </div>
        )}

        {isInitialView ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl space-y-6 px-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8">
                ¿En qué puedo ayudarte hoy?
              </h2>
              <Card className="p-0 shadow-lg mx-auto w-full bg-white dark:bg-gray-800 backdrop-blur-sm">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex flex-col p-3 md:p-4">
                    <AutoResizingTextarea
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Escribe tu consulta legal aquí..."
                      onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
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
                        className="text-muted-foreground rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
                        disabled={!input.trim()}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        type="submit"
                        size="icon"
                        className="rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
                        disabled={isLoading || !input.trim()}
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
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
              className="relative flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 md:p-4 lg:p-6 bg-white dark:bg-gray-900"
            >
              <div className="max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
                {messages.map((message, index) => {
                  const showThinking =
                    message.role === "assistant" &&
                    (regeneratingIndex === index || (isLoading && message.content.trim() === ""))
                  return (
                    <div key={index} className="group flex justify-center">
                      <div className="w-full max-w-full sm:max-w-3xl">
                        <div
                          className={`flex items-start gap-2 sm:gap-3 md:gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {message.role === "assistant" ? (
                            <Avatar className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 border">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs md:text-sm font-medium">
                                IA
                              </div>
                            </Avatar>
                          ) : (
                            <Avatar className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 order-last border">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs md:text-sm font-medium">
                                <User className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                              </div>
                            </Avatar>
                          )}
                          <div
                            className={`w-full flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                          >
                            <div
                              className={`w-full max-w-[85%] sm:max-w-[90%] px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 ${
                                message.role === "user"
                                  ? "bg-gray-100 dark:bg-gray-800 shadow-sm"
                                  : "bg-white dark:bg-gray-700"
                              } backdrop-blur-sm flex items-center rounded-lg ${
                                message.role === "user" ? "text-primary justify-end" : "text-foreground justify-start"
                              }`}
                            >
                              {message.role === "assistant" && showThinking ? (
                                <ThinkingIndicator />
                              ) : (
                                <div className="prose prose-neutral dark:prose-invert max-w-full overflow-x-hidden text-xs sm:text-sm md:text-base">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    rehypePlugins={[rehypeRaw]}
                                    components={{
                                      p: ({ children }) => <p className={markdownStyles.p}>{children}</p>,
                                      h1: ({ children }) => <h1 className={markdownStyles.h1}>{children}</h1>,
                                      h2: ({ children }) => <h2 className={markdownStyles.h2}>{children}</h2>,
                                      h3: ({ children }) => <h3 className={markdownStyles.h3}>{children}</h3>,
                                      h4: ({ children }) => <h4 className={markdownStyles.h4}>{children}</h4>,
                                      ul: ({ children }) => (
                                        <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>
                                      ),
                                      ol: ({ children }) => (
                                        <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>
                                      ),
                                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
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
                                        <div className="overflow-x-auto" style={{ width: "100%" }}>
                                          <table className="min-w-[600px] table-auto border-collapse border border-border text-sm">
                                            {children}
                                          </table>
                                        </div>
                                      ),
                                      th: ({ children }) => (
                                        <th className="border border-border px-3 py-2 text-left font-bold bg-muted whitespace-nowrap">
                                          {children}
                                        </th>
                                      ),
                                      td: ({ children }) => (
                                        <td className="border border-border px-3 py-2 whitespace-normal">{children}</td>
                                      ),
                                      hr: () => <hr className="my-6 border-border" />,
                                      img: (props) => (
                                        <img {...props} className="rounded-lg border border-border max-w-full h-auto" />
                                      ),
                                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                      em: ({ children }) => <em className="italic">{children}</em>,
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
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900">
              <div className="max-w-3xl mx-auto px-3 md:px-4 py-3 md:py-4">
                <Card className="p-0 shadow-lg mx-auto w-full bg-white dark:bg-gray-800 backdrop-blur-sm rounded-xl border-0 relative">
                  <div className="relative flex flex-col gap-2 p-3 md:p-4">
                    {showScrollButton && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-50">
                        <button
                          className="shadow-lg bg-background/90 hover:bg-muted/90 flex items-center justify-center rounded-full text-primary drop-shadow-md p-2.5 backdrop-blur-sm transition-all duration-200 ease-in-out"
                          type="button"
                          onClick={scrollToBottom}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
                      <AutoResizingTextarea
                        value={input}
                        onChange={handleInputChange}
                        placeholder="Escribe tu consulta legal aquí..."
                        onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
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
                          className="text-muted-foreground rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
                          disabled={isLoading || !input.trim()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                          type="submit"
                          size="icon"
                          className="rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
                          disabled={isLoading || !input.trim()}
                        >
                          {isLoading ? (
                            <Loader2 className="                          h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowUp className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
        {isAuthenticated && (
          <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold mb-2">Your Sessions</h2>
            <div className="space-y-2">
              {userSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between">
                  <button
                    onClick={() => handleSessionSelect(session.session_id)}
                    className={`text-left ${selectedSession === session.session_id ? "font-bold" : ""}`}
                  >
                    {session.title}
                  </button>
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleSessionRename(session.session_id, prompt("Enter new title") || session.title)
                      }
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleSessionDelete(session.session_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... (keep existing code) */}
      </div>

      {showSources && sources.length > 0 && <SourcesDrawer sources={sources} onClose={() => setShowSources(false)} />}

      {!isInitialView && (
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          isAuthenticated={isAuthenticated}
          userName={userName}
          onNewChat={handleNewChatRequest}
          onLogout={onLogout}
          onLogin={onLogin}
          sessions={userSessions}
          onSessionSelect={handleSessionSelect}
          onSessionDelete={deleteSession}
          onSessionRename={renameSession}
          currentSessionId={currentSessionId}
        />
      )}

      {showNewChatModal && !isAuthenticated && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">¿Quieres borrar el chat actual?</h3>
            <p className="text-sm mb-6">
              Tu conversación actual se descartará al iniciar un nuevo chat. Suscríbete o inicia sesión para guardar los
              chats.
            </p>
            <div className="flex flex-col gap-4">
              <Button
                onClick={() => window.location.reload()}
                className="w-full rounded-full px-4 py-2 text-sm font-medium bg-black text-white border border-gray-300 hover:bg-gray-800 transition-all"
              >
                Borrar chat
              </Button>
              <Button
                onClick={() => (window.location.href = "/auth/login")}
                className="w-full rounded-full px-4 py-2 text-sm font-medium bg-white text-black border border-gray-300 hover:bg-gray-100 transition-all"
              >
                Iniciar Sesión
              </Button>
              <Button
                onClick={() => setShowNewChatModal(false)}
                variant="ghost"
                className="w-full rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-all"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

