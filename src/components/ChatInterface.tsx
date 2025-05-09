"use client"

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import {
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
  Mic,
  Activity,
  Brain,
  RefreshCw,
  AlertTriangle,
  X,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { useChat } from "../hooks/useChat"
import type { Source, AgentTask } from "../hooks/types"
import AutoResizingTextarea from "./AutoResizingTextarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QuickActions } from "./QuickActions"
import { Sidebar } from "./Sidebar"
import Link from "next/link"
import { useAuth } from "../contexts/AuthContext"
import { ThemeToggle } from "./theme-toggle"
import Image from "next/image"
import { 
  SmartProcessingIndicator,
  ProcessingIndicator 
} from "./enhanced-indicators"
// Importamos los nuevos componentes personalizados
import TaskAccordion from "./TaskAccordion"
import SourceAccordion from "./SourceAccordion"

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

// Componente para mostrar un mensaje de error con opción de reintentar
interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  isRetryable?: boolean;
}

const ErrorMessage = ({ message, onRetry, isRetryable = true }: ErrorMessageProps) => (
  <div className="max-w-3xl mx-auto px-4 py-2">
    <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative flex items-center justify-between" role="alert">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
        <span className="block sm:inline text-sm">{message}</span>
      </div>
      {isRetryable && onRetry && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRetry}
          className="text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 ml-2"
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Reintentar
        </Button>
      )}
    </div>
  </div>
);

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
  blockquote:
    "mt-4 border-l-4 border-primary/20 pl-4 italic [&>p]:text-muted-foreground",
  code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-xs md:text-sm",
  pre: "mb-3 mt-3 overflow-x-auto rounded-lg border bg-muted p-3",
}

const SourcesList = ({ sources }: { sources: Source[] }) => (
  <div className="space-y-2">
    {sources.map((source, index) => (
      <SourceAccordion key={index} source={source} />
    ))}
  </div>
)

const TasksList = ({ tasks }: { tasks: AgentTask[] }) => {
  // Detectar si hay tareas de tipo "think"
  const hasThinkingTasks = tasks.some(task => task.agent === "think");

  return (
    <div className="space-y-2">
      {/* Sección de tareas thinking, si existen */}
      {hasThinkingTasks && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-primary mb-3 border-b pb-1">Proceso de Razonamiento</h3>
          {tasks.filter(task => task.agent === "think").map((task) => (
            <TaskAccordion key={task.id} task={task} />
          ))}
        </div>
      )}
      
      {/* Sección para otras tareas */}
      {tasks.some(task => task.agent !== "think") && (
        <div>
          {hasThinkingTasks && <h3 className="text-sm font-semibold text-primary mb-3 border-b pb-1">Tareas del Agente</h3>}
          {tasks.filter(task => task.agent !== "think").map((task) => (
            <TaskAccordion key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

interface MessageActionsProps {
  content: string | Record<string, unknown> | Array<Record<string, unknown>>
  copyToClipboard: (text: string) => void
  onRegenerate: () => void
  hasSources?: boolean
  toggleSources?: () => void
  hasTasks?: boolean
  toggleTasks?: () => void
  isThinking?: boolean // Nueva propiedad para detectar proceso de pensamiento
}

// Definir un tipo para los elementos dentro de los arrays de contenido
interface ContentItem {
  type: string;
  content: string | Record<string, unknown>;
  tool_use_id?: string;
  [key: string]: unknown;
}

const MessageActions = ({
  content,
  copyToClipboard,
  onRegenerate,
  hasSources = false,
  toggleSources,
  hasTasks = false,
  toggleTasks,
  isThinking = false,
}: MessageActionsProps) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    try {
      // Si el contenido no es un string, convertirlo
      const textToCopy = typeof content === "string" 
        ? content
        : JSON.stringify(content, null, 2);
      
      copyToClipboard(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Error copying content:", error);
      // Intentar un enfoque menos refinado
      const fallbackText = typeof content === "string" 
        ? content 
        : "No se pudo copiar el contenido complejo";
      copyToClipboard(fallbackText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const handleShare = (platform: string) => {
    try {
      let url = ""
      // Si el contenido no es un string, convertirlo
      const textForSharing = typeof content === "string" 
        ? content
        : JSON.stringify(content, null, 2);
      
      const text = encodeURIComponent(textForSharing)
      switch (platform) {
        case "twitter":
          url = `https://twitter.com/intent/tweet?text=${text}`
          break
        case "facebook":
          url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            window.location.href
          )}&quote=${text}`
          break
        case "linkedin":
          url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(
            window.location.href
          )}&title=Respuesta del Asistente Legal IA&summary=${text}`
          break
        case "whatsapp":
          url = `https://api.whatsapp.com/send?text=${text}`
          break
      }
      window.open(url, "_blank")
    } catch (error) {
      console.error("Error sharing content:", error);
      alert("No se pudo compartir el contenido. Intente copiar y compartir manualmente.");
    }
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
            <DropdownMenuItem onClick={() => handleShare("twitter")}>
              Twitter
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("facebook")}>
              Facebook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("linkedin")}>
              LinkedIn
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare("whatsapp")}>
              WhatsApp
            </DropdownMenuItem>
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

        {/* Mostrar el botón de tareas si hay tareas o si está en proceso de pensamiento */}
        {(hasTasks || isThinking) && toggleTasks && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 transition-transform duration-200 hover:scale-105 active:scale-95"
                onClick={toggleTasks}
              >
                {isThinking && !hasTasks ? (
                  <Brain className="h-4 w-4" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isThinking && !hasTasks ? "Ver razonamiento" : "Tareas de agentes"}</p>
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
    <div className="fixed inset-0 z-[999999] overflow-hidden">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md transform transition-all duration-300 ease-in-out relative"
        >
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

interface TasksDrawerProps {
  tasks: AgentTask[]
  onClose: () => void
}

const TasksDrawer = ({ tasks, onClose }: TasksDrawerProps) => {
  const drawerRef = useRef<HTMLDivElement>(null)
  
  // Detectar si hay tareas de tipo "think"
  const hasThinkingTasks = tasks.some(task => task.agent === "think");

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
    <div className="fixed inset-0 z-[999999] overflow-hidden">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md transform transition-all duration-300 ease-in-out relative"
        >
          <button
            onClick={onClose}
            className="absolute top-2 right-2 z-[10000] rounded-md p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-transform duration-200 hover:scale-105 active:scale-95"
            aria-label="Cerrar panel de tareas"
          >
            <ChevronsRight className="h-6 w-6" />
          </button>
          <div className="flex h-full flex-col overflow-hidden bg-background/50 backdrop-blur-sm rounded-xl shadow-lg">
            <div className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/70 px-4 py-3">
              <h2 className="text-lg font-semibold flex items-center">
                {hasThinkingTasks ? (
                  <>
                    <Brain className="h-5 w-5 mr-2 text-primary" />
                    Razonamiento y Tareas
                  </>
                ) : (
                  <>
                    <Activity className="h-5 w-5 mr-2 text-primary" />
                    Tareas de Agentes
                  </>
                )}
              </h2>
            </div>
            <div className="relative flex-1 overflow-y-auto px-4 py-6">
              <div className="space-y-6">
                <TasksList tasks={tasks} />
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
}

// Función auxiliar para renderizar contenido de mensaje que puede ser objeto, array o string
const renderMessageContent = (content: string | Record<string, unknown> | Array<Record<string, unknown>>) => {
  try {
    // Si es string, usar ReactMarkdown normalmente
    if (typeof content === "string") {
      return (
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
            code: ({ inline, children }: React.PropsWithChildren<{ inline?: boolean }>) =>
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
              <td className="border border-border px-3 py-2 whitespace-normal">
                {children}
              </td>
            ),
            hr: () => <hr className="my-6 border-border" />,
            img: (props) => {
              const { src, alt, width, height, ...rest } = props
              if (!src) return null
              try {
                return (
                  <Image
                    src={src!}
                    alt={alt || ""}
                    width={width ? parseInt(width.toString(), 10) : 600}
                    height={height ? parseInt(height.toString(), 10) : 400}
                    {...rest}
                    className="rounded-lg border border-border max-w-full h-auto"
                    unoptimized
                  />
                )
              } catch (imageError) {
                console.warn("Error rendering image:", imageError);
                return <span className="text-red-500">[Error al cargar imagen]</span>;
              }
            },
            strong: ({ children }) => (
              <strong className="font-semibold">{children}</strong>
            ),
            em: ({ children }) => <em className="italic">{children}</em>,
          }}
        >
          {content}
        </ReactMarkdown>
      );
    }
    
    // Si es un array (caso Claude con tools)
    if (Array.isArray(content)) {
      return (
        <div className="space-y-4">
          {(content as Array<ContentItem>).map((item, idx) => (
            <div key={idx} className="border-l-2 border-primary/30 pl-3 py-1 mb-3">
              <div className="flex items-center mb-1 gap-1">
                <span className="font-semibold text-xs">
                  {item.type === "tool_result" ? "Resultado de herramienta" : item.type}
                </span>
                {item.tool_use_id && (
                  <span className="text-xs text-muted-foreground">ID: {item.tool_use_id.substring(0, 10)}...</span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {typeof item.content === "string" ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    className="text-xs overflow-x-auto"
                  >
                    {item.content.length > 300 
                      ? `${item.content.substring(0, 300)}...` 
                      : item.content}
                  </ReactMarkdown>
                ) : (
                  <pre className="text-xs overflow-x-auto bg-muted p-2 rounded">
                    {JSON.stringify(item.content, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Si es un objeto y no es un array
    if (typeof content === "object" && content !== null) {
      return (
        <pre className="text-xs overflow-x-auto bg-muted p-2 rounded whitespace-pre-wrap">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
    }
    
    // Fallback
    return <p>{String(content)}</p>;
  } catch (error) {
    // Si hay un error al renderizar, mostrar un mensaje genérico
    console.error("Error rendering message content:", error);
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-md border border-red-200 dark:border-red-800">
        <p className="text-sm font-medium mb-1">Error al mostrar el contenido</p>
        <p className="text-xs">
          {typeof content === "string" 
            ? content.substring(0, 500) + (content.length > 500 ? "..." : "")
            : "El contenido no se puede mostrar correctamente. Por favor, intente regenerar la respuesta."}
        </p>
      </div>
    );
  }
};

export default function ChatInterface({ onChatStarted, onNewChat }: ChatInterfaceProps) {
  const {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    sources,
    agentTasks,
    isGeneratingTask,
    processingState,
    currentModel,
    userSessions,
    currentChatId,
    loadSession,
    createNewChat,
    deleteSession,
    renameSession,
    cancelRequest,
  } = useChat()
  const { isAuthenticated, user, logout } = useAuth()
  const [isInitialView, setIsInitialView] = useState(true)
  const [input, setInput] = useState("")
  const [showSources, setShowSources] = useState(false)
  const [showTasks, setShowTasks] = useState(false)
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
  // Nuevo estado para la conectividad
  const [isOnline, setIsOnline] = useState(true)
  // Estados para reintentar la última acción
  const [lastUserMessage, setLastUserMessage] = useState("")
  const [wasRegenerating, setWasRegenerating] = useState(false)

  // Monitoreo de conectividad
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    console.log("ChatInterface mounted")
    return () => {
      console.log("ChatInterface unmounted")
    }
  }, [])

  useEffect(() => {
    if (!isInitialView) {
      onChatStarted?.()
    }
  }, [isInitialView, onChatStarted])

  // Mejorado para manejar errores en el scroll
  useEffect(() => {
    try {
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
    } catch (error) {
      console.warn("Error scrolling container:", error)
      // En caso de error, intentar un enfoque más directo
      try {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: "auto" })
        }
      } catch (fallbackError) {
        console.error("Failed fallback scrolling:", fallbackError)
      }
    }
  }, [isLoading, messages])

  const handleScroll = () => {
    try {
      const container = messagesContainerRef.current
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight
        setShowScrollButton(distanceFromBottom > 100)
      }
    } catch (error) {
      console.warn("Error handling scroll:", error)
    }
  }

  const scrollToBottom = useCallback(() => {
    try {
      if (messagesEndRef.current && !isScrollingRef.current) {
        isScrollingRef.current = true
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
        setTimeout(() => {
          isScrollingRef.current = false
        }, 500)
      }
    } catch (error) {
      console.warn("Error scrolling to bottom:", error)
      // Fallback directo
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "auto" })
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoading) {
      setRegeneratingIndex(null)
      setWasRegenerating(false)
    }
  }, [isLoading])

  const copyToClipboard = useCallback((text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => console.log("Texto copiado al portapapeles"))
        .catch((err) => {
          console.error("Error al copiar texto: ", err)
          // Usar fallback en caso de error
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
        })
    } else {
      // Fallback para navegadores sin soporte de clipboard API
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
    
    // Guardar el mensaje para posible reintento
    setLastUserMessage(message)
    setWasRegenerating(false)
    
    try {
      // Comprobar conectividad
      if (!isOnline) {
        setErrorMessage("No hay conexión a internet. Por favor, verifica tu conexión e intenta de nuevo.");
        return;
      }
      
      console.log("Sending message:", message)
      await sendMessage(message)
    } catch (error) {
      console.error("Error sending message:", error)
      setErrorMessage(
        error instanceof Error 
        ? `Error al enviar el mensaje: ${error.message}` 
        : "Error al enviar el mensaje. Por favor, intenta de nuevo."
      )
    } finally {
      setTimeout(scrollToBottom, 100)
    }
  }

  // Función para reintentar la última operación
  const retryLastOperation = async () => {
    setErrorMessage(null);
    
    try {
      // Comprobar conectividad
      if (!isOnline) {
        setErrorMessage("No hay conexión a internet. Por favor, verifica tu conexión e intenta de nuevo.");
        return;
      }
      
      if (wasRegenerating) {
        await handleRegenerate();
      } else if (lastUserMessage) {
        await sendMessage(lastUserMessage);
      } else {
        setErrorMessage("No hay operación para reintentar.");
      }
    } catch (error) {
      console.error("Error retrying operation:", error);
      setErrorMessage(
        error instanceof Error 
        ? `Error al reintentar: ${error.message}` 
        : "Error al reintentar la operación. Por favor, intenta de nuevo."
      );
    }
  };

  const handleQuickAction = async (text: string) => {
    setInput("")
    setIsInitialView(false)
    setErrorMessage(null)
    
    // Guardar para posible reintento
    setLastUserMessage(text)
    setWasRegenerating(false)
    
    try {
      // Comprobar conectividad
      if (!isOnline) {
        setErrorMessage("No hay conexión a internet. Por favor, verifica tu conexión e intenta de nuevo.");
        return;
      }
      
      await sendMessage(text)
    } catch (error) {
      console.error("Error en acción rápida:", error)
      setErrorMessage(
        error instanceof Error 
        ? `Error al procesar la acción rápida: ${error.message}` 
        : "Error al procesar la acción rápida. Por favor, intenta de nuevo."
      )
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
      // Guardar para posible reintento
      setLastUserMessage(lastUserMessage.content as string)
      setWasRegenerating(true)
      
      try {
        // Comprobar conectividad
        if (!isOnline) {
          setErrorMessage("No hay conexión a internet. Por favor, verifica tu conexión e intenta de nuevo.");
          return;
        }
        
        await sendMessage(lastUserMessage.content as string, true)
      } catch (error) {
        console.error("Error regenerating:", error)
        setErrorMessage(
          error instanceof Error 
          ? `Error al regenerar: ${error.message}` 
          : "Error al regenerar la respuesta. Por favor, intenta de nuevo."
        )
      }
    }
  }

  const handleNewChatRequest = async () => {
    if (!isAuthenticated) {
      setShowNewChatModal(true)
      return
    }
    
    try {
      await createNewChat()
      setIsInitialView(true)
      setMessages([])
      setErrorMessage(null)
      onNewChat?.()
    } catch (error) {
      console.error("Error creating new chat:", error)
      setErrorMessage(
        error instanceof Error 
        ? `Error al crear nuevo chat: ${error.message}` 
        : "Error al crear un nuevo chat. Por favor, intenta de nuevo."
      )
    }
  }

  // Agregar funcionalidad para detener la respuesta
  const handleStopResponse = () => {
    if (isLoading) {
      cancelRequest();
    }
  };

  const showMobileHeader = isMobile && (isAuthenticated || !isInitialView)

  // Función para determinar qué indicador mostrar basado en el estado
  const getThinkingIndicator = (messageIndex: number) => {
    if (regeneratingIndex === messageIndex) {
      // Si estamos regenerando este mensaje específico
      return <ProcessingIndicator state={processingState} model={currentModel} />
    } else if (messageIndex === messages.length - 1 && isLoading) {
      // Si es el último mensaje y está cargando
      return <SmartProcessingIndicator 
                state={processingState} 
                isGeneratingTask={isGeneratingTask}
                model={currentModel} 
             />
    }
    return null;
  }

  return (
    <div
      className="flex bg-white dark:bg-gray-900 text-sm overflow-hidden fixed inset-x-0 bottom-0"
      style={{ top: "64px" }}
    >
      {/* Fondo siempre visible */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-white dark:bg-gray-950">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Alerta de conexión */}
      {!isOnline && (
        <div className="fixed top-16 left-0 right-0 z-50 bg-yellow-500 text-black py-1 px-4 text-center text-sm shadow-md">
          <p className="font-medium">Sin conexión a internet. Es posible que algunas funciones no estén disponibles.</p>
        </div>
      )}

      {/* Header móvil */}
      {showMobileHeader && (
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
          <div className="flex items-center gap-2">
            {!isAuthenticated && (
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full px-3 py-1 bg-white text-black dark:bg-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  Iniciar Sesión
                </Button>
              </Link>
            )}
            <ThemeToggle />
          </div>
        </header>
      )}

      <div className="flex-1 flex flex-col transition-all duration-300 w-full">
        {errorMessage && (
          <ErrorMessage 
            message={errorMessage} 
            onRetry={retryLastOperation} 
            isRetryable={!!(lastUserMessage || wasRegenerating)}
          />
        )}
        {isInitialView ? (
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-3xl space-y-6 px-4">
              <h2 className="text-2xl md:text-3xl font-semibold text-center mb-6 md:mb-8">
                ¿En qué puedo ayudarte hoy?
              </h2>
              <Card className="p-0 shadow-lg mx-auto w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 rounded-2xl">
                <form onSubmit={handleSubmit} className="relative">
                  <div className="flex flex-col p-3 md:p-4">
                    <div className="relative">
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
                        className="min-h-[60px] md:min-h-[80px] pr-16 pl-5 py-4"
                      />
                      <div className="absolute right-2 bottom-2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
                          disabled={!input.trim()}
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                        <Button
                          type="submit"
                          size="icon"
                          className="rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 bg-primary/90 hover:bg-primary"
                          disabled={isLoading || !input.trim() || !isOnline}
                        >
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                        </Button>
                      </div>
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
                    (regeneratingIndex === index || (isLoading && index === messages.length - 1 && !message.content));
                  
                  // Detectar si hay proceso de pensamiento activo (para mostrar el botón de tareas)
                  const isThinking = processingState === "thinking" || agentTasks.some(task => task.agent === "think");
                  
                  // Verificar si el mensaje es un mensaje de error
                  const isErrorMessage = 
                    message.role === "assistant" && 
                    typeof message.content === "string" && 
                    message.content.includes("Error al procesar el mensaje");
                  
                  return (
                    <div key={index} className="group flex justify-center">
                      <div className="w-full max-w-full sm:max-w-3xl">
                        <div
                          className={`flex items-start gap-2 sm:gap-3 md:gap-4 ${
                            message.role === "user" ? "justify-end" : "justify-start"
                          }`}
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
                            className={`w-full flex flex-col ${
                              message.role === "user" ? "items-end" : "items-start"
                            }`}
                          >
                            <div
                              className={`w-full max-w-[85%] sm:max-w-[90%] px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 ${
                                message.role === "user"
                                  ? "bg-gray-100 dark:bg-gray-800 shadow-sm"
                                  : isErrorMessage
                                    ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30"
                                    : "bg-white dark:bg-gray-700"
                              } backdrop-blur-sm flex items-center rounded-lg ${
                                message.role === "user"
                                  ? "text-primary justify-end"
                                  : "text-foreground justify-start"
                              }`}
                            >
                              {message.role === "assistant" && showThinking ? (
                                getThinkingIndicator(index)
                              ) : (
                                <div className="prose prose-neutral dark:prose-invert max-w-full overflow-x-hidden text-xs sm:text-sm md:text-base">
                                  {renderMessageContent(message.content)}
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
                                hasTasks={agentTasks.length > 0}
                                toggleTasks={() => setShowTasks((prev) => !prev)}
                                isThinking={isThinking}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900">
              <div className="max-w-3xl mx-auto px-3 md:px-4 py-3 md:py-4">
                <Card className="p-0 shadow-lg mx-auto w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-0 relative">
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
                    
                    {/* Se eliminan los indicadores sobre el textarea */}
                    
                    <form onSubmit={handleSubmit} className="relative flex flex-col gap-2">
                      <div className="relative">
                        <AutoResizingTextarea
                          value={input}
                          onChange={handleInputChange}
                          placeholder={isOnline ? "Escribe tu consulta legal aquí..." : "Sin conexión..."}
                          onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              handleSubmit(e)
                            }
                          }}
                          autoFocus
                          ref={textareaRef}
                          className={`min-h-[60px] md:min-h-[60px] resize-none pr-20 pl-5 py-4 ${!isOnline ? 'opacity-70' : ''}`}
                          disabled={!isOnline}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-2">
                          {isLoading ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={handleStopResponse}
                              className="text-red-500 dark:text-red-400 rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 hover:bg-red-100 dark:hover:bg-red-900/30"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
                              disabled={isLoading || !input.trim() || !isOnline}
                            >
                              <Mic className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            type="submit"
                            size="icon"
                            className="rounded-full transition-transform duration-200 hover:scale-105 active:scale-95 bg-primary/90 hover:bg-primary disabled:opacity-50"
                            disabled={isLoading || !input.trim() || !isOnline}
                          >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>
                </Card>
                {/* Mensaje de advertencia en el footer del chat activo */}
                <div className="text-center text-[10px] md:text-[11px] text-muted-foreground mt-1 leading-tight tracking-tight opacity-80">
                  Veredix puede cometer errores. Considera verificar la información importante.
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Panel de Fuentes */}
      {showSources && sources.length > 0 && (
        <SourcesDrawer sources={sources} onClose={() => setShowSources(false)} />
      )}
      
      {/* Panel de Tareas de Agentes */}
      {showTasks && agentTasks.length > 0 && (
        <TasksDrawer tasks={agentTasks} onClose={() => setShowTasks(false)} />
      )}

      {/* Renderizado del Sidebar */}
      {isAuthenticated ? (
        <Sidebar
          isOpen={sidebarOpen}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
          isAuthenticated={isAuthenticated}
          userName={user?.user_metadata?.full_name || user?.email || ""}
          userEmail={user?.email || ""}
          onNewChat={handleNewChatRequest}
          onLogout={() => {
            logout()
              .then(() => window.location.reload())
              .catch((error) => console.error("Error on logout:", error))
          }}
          onLogin={() => {}}
          sessions={userSessions}
          currentSessionId={currentChatId}
          onSessionSelect={(sessionId: string) => {
            loadSession(sessionId)
              .then(() => {
                setIsInitialView(false)
                if (isMobile) {
                  setSidebarOpen(false)
                }
              })
              .catch((error) => {
                console.error("Error loading session:", error)
                setErrorMessage(`Error al cargar la conversación: ${error instanceof Error ? error.message : "Intenta de nuevo"}`)
              })
          }}
          onSessionDelete={(sessionId: string) => {
            deleteSession(sessionId)
              .then(() => {
                window.location.reload()
              })
              .catch((error) => {
                console.error("Error deleting session:", error)
                setErrorMessage(`Error al eliminar la conversación: ${error instanceof Error ? error.message : "Intenta de nuevo"}`)
              })
          }}
          onSessionRename={(sessionId: string, newName: string) => {
            renameSession(sessionId, newName)
              .then(() => {})
              .catch((error) => {
                console.error("Error renaming session:", error)
                setErrorMessage(`Error al renombrar la conversación: ${error instanceof Error ? error.message : "Intenta de nuevo"}`)
              })
          }}
        />
      ) : (
        !isInitialView && (
          <Sidebar
            isOpen={sidebarOpen}
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onClose={() => setSidebarOpen(false)}
            isMobile={isMobile}
            isAuthenticated={isAuthenticated}
            userName={user?.user_metadata?.full_name || user?.email || ""}
            userEmail={user?.email || ""}
            onNewChat={handleNewChatRequest}
            onLogout={() => {
              logout()
                .then(() => window.location.reload())
                .catch((error) => console.error("Error on logout:", error))
            }}
            onLogin={() => {}}
            sessions={userSessions}
            currentSessionId={currentChatId}
            onSessionSelect={(sessionId: string) => {
              loadSession(sessionId)
                .then(() => {
                  setIsInitialView(false)
                  if (isMobile) {
                    setSidebarOpen(false)
                  }
                })
                .catch((error) => {
                  console.error("Error loading session:", error)
                  setErrorMessage(`Error al cargar la conversación: ${error instanceof Error ? error.message : "Intenta de nuevo"}`)
                })
            }}
            onSessionDelete={(sessionId: string) => {
              deleteSession(sessionId)
                .then(() => {
                  window.location.reload()
                })
                .catch((error) => {
                  console.error("Error deleting session:", error)
                  setErrorMessage(`Error al eliminar la conversación: ${error instanceof Error ? error.message : "Intenta de nuevo"}`)
                })
            }}
            onSessionRename={(sessionId: string, newName: string) => {
              renameSession(sessionId, newName)
                .then(() => {})
                .catch((error) => {
                  console.error("Error renaming session:", error)
                  setErrorMessage(`Error al renombrar la conversación: ${error instanceof Error ? error.message : "Intenta de nuevo"}`)
                })
            }}
          />
        )
      )}
      
      {/* Modal de advertencia para usuarios no autenticados al iniciar nuevo chat */}
      {showNewChatModal && !isAuthenticated && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">¿Quieres borrar el chat actual?</h3>
            <p className="text-sm mb-6">
              Tu conversación actual se descartará al iniciar un nuevo chat. Suscríbete o inicia sesión para guardar los chats.
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