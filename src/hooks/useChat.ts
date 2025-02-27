// chat-legal/src/hooks/useChat.ts
"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { getUserId } from "../lib/utils"
import type { Session } from "@supabase/supabase-js"

export interface Message {
  role: "user" | "assistant"
  content: string
  status?: "thinking" | "responding" | "complete"
  tool_call_id?: string
}

export interface ToolMessage {
  role: "tool"
  content: string
  tool_call_id?: string
  session_id?: string
  [key: string]: unknown
}

export interface Source {
  meta_data: {
    page: number
    chunk: number
    chunk_size: number
  }
  name: string
  content: string
}

export interface ExtraData {
  // No se utiliza para obtener fuentes
  session_id?: string
}

export interface ApiResponse {
  content: string
  content_type: string
  event: string
  model?: string
  run_id?: string
  agent_id?: string
  session_id?: string
  created_at?: number
  messages: Array<Message | ToolMessage>
  sources?: Source[]
  extra_data?: ExtraData
  status?: "thinking" | "reasoning" | "completing"
}

export interface UserSession {
  id: string
  user_id: string
  session_id: string
  agent_id: string
  title: string
  created_at: string
}

const fetchUserSessions = async (userId: string): Promise<UserSession[]> => {
  if (!userId) return []
  try {
    const response = await fetch(
      `https://veredix.app/api/v1/playground/agents/veredix/sessions?user_id=${userId}`
    )
    if (!response.ok) {
      throw new Error("Failed to fetch user sessions")
    }
    const sessions = await response.json()
    return sessions
  } catch (error) {
    console.error("Error fetching user sessions:", error)
    return []
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [canStopResponse, setCanStopResponse] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [userSessions, setUserSessions] = useState<UserSession[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  // Eliminamos currentRunId porque no se utiliza
  const [authSession, setAuthSession] = useState<Session | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentContentRef = useRef<string>("")
  const bufferRef = useRef<string>("")
  // Set para llevar control de los tool_call_id ya procesados
  const processedToolIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user) {
          console.log("Authenticated user:", session.user.id)
          setCurrentUserId(session.user.id)
          setAuthSession(session)
          const storedChatId = localStorage.getItem("currentChatId")
          if (storedChatId) {
            setCurrentChatId(storedChatId)
          }
        } else {
          const userId = getUserId()
          console.log("Non-authenticated user:", userId)
          setCurrentUserId(userId)
        }
      } catch (error) {
        console.error("Error checking session:", error)
        const userId = getUserId()
        console.log("Fallback to non-authenticated user:", userId)
        setCurrentUserId(userId)
      }
    }

    checkSession()

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event)
      if (event === "SIGNED_IN") {
        const userId = session?.user.id
        if (userId) {
          console.log("User signed in:", userId)
          setCurrentUserId(userId)
          setAuthSession(session)
          const sessions = await fetchUserSessions(userId)
          setUserSessions(sessions)
        }
      } else if (event === "SIGNED_OUT") {
        const anonymousId = getUserId()
        console.log("User signed out, using anonymous ID:", anonymousId)
        setCurrentUserId(anonymousId)
        setAuthSession(null)
        setUserSessions([])
        localStorage.removeItem("currentChatId")
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const createNewChat = useCallback(async () => {
    setCurrentChatId("")
    setMessages([])
    setSources([]) // Se limpia el estado de las fuentes al iniciar un nuevo chat
    localStorage.removeItem("currentChatId")
    processedToolIds.current.clear()
    if (authSession?.user) {
      const sessions = await fetchUserSessions(authSession.user.id)
      setUserSessions(sessions)
    }
  }, [authSession])

  useEffect(() => {
    if (currentUserId) {
      fetchUserSessions(currentUserId).then((sessions) => {
        setUserSessions(sessions)
      })
    }
  }, [currentUserId])

  /**
   * Recibe un chunk de texto, lo concatena a bufferRef, y
   * extrae objetos JSON válidos devolviéndolos como ApiResponse[].
   */
  const processJsonObjects = useCallback(
    (text: string): ApiResponse[] => {
      const jsonObjects: ApiResponse[] = []
      bufferRef.current += text

      let startIndex = 0
      while (true) {
        const openBraceIndex = bufferRef.current.indexOf("{", startIndex)
        if (openBraceIndex === -1) break

        let braceCount = 1
        let endIndex = openBraceIndex + 1

        while (braceCount > 0 && endIndex < bufferRef.current.length) {
          if (bufferRef.current[endIndex] === "{") braceCount++
          if (bufferRef.current[endIndex] === "}") braceCount--
          endIndex++
        }

        if (braceCount === 0) {
          try {
            const jsonString = bufferRef.current.slice(openBraceIndex, endIndex).trim()
            const parsed = JSON.parse(jsonString) as ApiResponse
            if (parsed.event && parsed.content !== undefined) {
              jsonObjects.push(parsed)
            }
            startIndex = endIndex
          } catch {
            startIndex = openBraceIndex + 1
          }
        } else {
          break
        }
      }

      bufferRef.current = bufferRef.current.slice(startIndex)
      return jsonObjects
    },
    []
  )

  /**
   * Actualiza el último mensaje "assistant" con el contenido acumulado,
   * o crea uno nuevo si no existe. Se omite el role "tool" de la conversación.
   */
  const updateAssistantMessage = useCallback(
    (content: string, status: "thinking" | "responding" | "complete" = "responding", regenerate = false) => {
      setMessages((prev) => {
        const newMessages = [...prev]
        const lastAssistantIndex = regenerate
          ? newMessages.findLastIndex((m) => m.role === "assistant")
          : newMessages.length - 1

        if (lastAssistantIndex !== -1 && newMessages[lastAssistantIndex].role === "assistant") {
          newMessages[lastAssistantIndex] = {
            ...newMessages[lastAssistantIndex],
            content,
            status,
          }
        } else if (!regenerate) {
          newMessages.push({ role: "assistant", content, status })
        }

        return newMessages
      })
    },
    []
  )

  /**
   * Carga la sesión con el chatId dado:
   * 1. Filtra los mensajes "assistant" y "user" para mostrarlos en la conversación.
   * 2. Procesa los mensajes "tool" para extraer fuentes (evitando duplicados con tool_call_id)
   *    y solo si el session_id (del mensaje o del objeto) coincide con el chatId.
   */
  const loadSession = async (chatId: string) => {
    try {
      const response = await fetch(
        `https://veredix.app/api/v1/playground/agents/veredix/sessions/${chatId}?user_id=${currentUserId}`
      )

      if (!response.ok) {
        throw new Error("Failed to load session")
      }

      const sessionData = await response.json()
      const rawMessages = (sessionData.memory?.messages || []) as Array<Message | ToolMessage>

      // Reiniciamos las fuentes y el conjunto de tool_call_id
      setSources([])
      processedToolIds.current.clear()

      // 1. Mensajes de conversación (user / assistant)
      const conversationMessages: Message[] = rawMessages
        .filter(
          (msg) =>
            (msg.role === "user" || msg.role === "assistant") && msg.content != null
        )
        .map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          status: "complete",
          tool_call_id: msg.tool_call_id,
        }))

      // 2. Mensajes "tool": se procesan para extraer fuentes, usando chatId para filtrar
      const toolMessages = rawMessages.filter(
        (msg): msg is ToolMessage => msg.role === "tool" && msg.content != null
      )
      toolMessages.forEach((msg) => {
        // Se toma el session_id del mensaje o del top-level de la sesión
        const topLevelSession = sessionData?.session_id || sessionData?.memory?.session_id
        const toolSessionId = msg.session_id || topLevelSession
        // Filtramos usando el parámetro chatId (la sesión que se está cargando)
        if (chatId && toolSessionId && toolSessionId !== chatId) {
          return
        }
        const toolId = msg.tool_call_id
        if (toolId) {
          if (!processedToolIds.current.has(toolId)) {
            processedToolIds.current.add(toolId)
            try {
              const parsedSources = JSON.parse(msg.content) as Source[]
              if (Array.isArray(parsedSources)) {
                setSources((prev) => [...prev, ...parsedSources])
              }
            } catch (err) {
              console.error("Error parsing tool message content for sources in session:", err)
            }
          }
        } else {
          try {
            const parsedSources = JSON.parse(msg.content) as Source[]
            if (Array.isArray(parsedSources)) {
              setSources((prev) => [...prev, ...parsedSources])
            }
          } catch (err) {
            console.error("Error parsing tool message content for sources in session:", err)
          }
        }
      })

      setMessages(conversationMessages)
      setCurrentChatId(chatId)
      localStorage.setItem("currentChatId", chatId)
    } catch (error) {
      console.error("Error loading session:", error)
      throw error
    }
  }

  /**
   * Envía un mensaje al agente y procesa las respuestas en streaming.
   * Se omiten los mensajes "tool" en la conversación, pero se extraen sus fuentes
   * únicamente si el session_id (del mensaje o del objeto) coincide con currentChatId.
   */
  const sendMessage = useCallback(
    async (message: string, regenerate = false) => {
      try {
        setIsLoading(true)
        setCanStopResponse(true)

        if (authSession?.user && !currentChatId) {
          await createNewChat()
        }

        if (!regenerate) {
          setMessages((prev) => [
            ...prev,
            { role: "user", content: message },
            { role: "assistant", content: "", status: "thinking" },
          ])
        } else {
          setMessages((prev) => {
            const newMessages = [...prev]
            const lastAssistantIndex = newMessages.findLastIndex((m) => m.role === "assistant")
            if (lastAssistantIndex !== -1) {
              newMessages[lastAssistantIndex] = { ...newMessages[lastAssistantIndex], content: "", status: "thinking" }
            }
            return newMessages
          })
        }

        const formData = new FormData()
        formData.append("message", message)
        formData.append("stream", "true")
        formData.append("monitor", "true")
        formData.append("session_id", currentChatId || "")
        formData.append("user_id", currentUserId || getUserId())

        abortControllerRef.current = new AbortController()

        const response = await fetch(
          "https://veredix.app/api/v1/playground/agents/veredix/runs",
          {
            method: "POST",
            body: formData,
            signal: abortControllerRef.current.signal,
          }
        )

        if (!response.ok) {
          throw new Error("Network response was not ok")
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        currentContentRef.current = ""
        bufferRef.current = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const jsonObjects = processJsonObjects(chunk)

          for (const parsedData of jsonObjects) {
            // 1. Actualiza el contenido del mensaje "assistant"
            if (parsedData.event === "RunResponse" && parsedData.content) {
              currentContentRef.current += parsedData.content
              updateAssistantMessage(currentContentRef.current, "responding", regenerate)
            }
            // 2. Cuando se completa la respuesta
            else if (parsedData.event === "RunCompleted") {
              if (parsedData.content) {
                currentContentRef.current = parsedData.content
              }
              updateAssistantMessage(currentContentRef.current, "complete", regenerate)
              if (parsedData.session_id) {
                setCurrentChatId(parsedData.session_id)
                localStorage.setItem("currentChatId", parsedData.session_id)
                if (parsedData.run_id) {
                  // Si se requiere, se puede almacenar el run_id, pero no se utiliza en la interfaz
                  // setCurrentRunId(parsedData.run_id)
                }
                if (authSession?.user) {
                  const sessions = await fetchUserSessions(authSession.user.id)
                  setUserSessions(sessions)
                }
              }
            }
            // 3. Procesa los mensajes "tool" para extraer fuentes
            if (parsedData.messages && Array.isArray(parsedData.messages)) {
              (parsedData.messages as Array<ToolMessage>).forEach((msg) => {
                if (msg.role === "tool" && msg.content) {
                  const topLevelSessionId = parsedData.session_id
                  const toolSessionId = msg.session_id || topLevelSessionId
                  if (currentChatId && toolSessionId && toolSessionId !== currentChatId) {
                    return
                  }
                  const toolId = msg.tool_call_id
                  if (toolId) {
                    if (!processedToolIds.current.has(toolId)) {
                      processedToolIds.current.add(toolId)
                      try {
                        const parsedSources = JSON.parse(msg.content) as Source[]
                        if (Array.isArray(parsedSources)) {
                          setSources((prevSources) => [...prevSources, ...parsedSources])
                        }
                      } catch (err) {
                        console.error("Error parsing tool message content for sources:", err)
                      }
                    }
                  } else {
                    try {
                      const parsedSources = JSON.parse(msg.content) as Source[]
                      if (Array.isArray(parsedSources)) {
                        setSources((prevSources) => [...prevSources, ...parsedSources])
                      }
                    } catch (err) {
                      console.error("Error parsing tool message content for sources:", err)
                    }
                  }
                }
              })
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request aborted by user")
          updateAssistantMessage(
            currentContentRef.current + "\n\n[Mensaje interrumpido por el usuario]",
            "complete",
            regenerate
          )
        } else {
          console.error("Error in sendMessage:", error)
          updateAssistantMessage("Error al procesar el mensaje", "complete", regenerate)
        }
      } finally {
        setIsLoading(false)
        setCanStopResponse(false)
      }
    },
    [currentUserId, currentChatId, authSession, createNewChat, processJsonObjects, updateAssistantMessage]
  )

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  const deleteSession = async (sessionId: string) => {
    if (currentUserId) {
      try {
        const response = await fetch(
          `https://veredix.app/api/v1/playground/agents/veredix/sessions/${sessionId}?user_id=${currentUserId}`,
          {
            method: "DELETE",
          }
        )
        if (!response.ok) {
          throw new Error("Failed to delete session")
        }
        const sessions = await fetchUserSessions(currentUserId)
        setUserSessions(sessions)
        if (sessionId === currentChatId) {
          setCurrentChatId(null)
          localStorage.removeItem("currentChatId")
        }
      } catch (error) {
        console.error("Error deleting session:", error)
      }
    }
  }

  const renameSession = async (sessionId: string, newTitle: string) => {
    if (currentUserId) {
      try {
        const response = await fetch(
          `https://veredix.app/api/v1/playground/agents/veredix/sessions/${sessionId}/rename`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: newTitle,
              user_id: currentUserId,
            }),
          }
        )
        if (!response.ok) {
          throw new Error("Failed to rename session")
        }
        const sessions = await fetchUserSessions(currentUserId)
        setUserSessions(sessions)
      } catch (error) {
        console.error("Error renaming session:", error)
      }
    }
  }

  return {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    cancelRequest,
    canStopResponse,
    sources,
    userSessions,
    deleteSession,
    renameSession,
    currentUserId,
    currentChatId,
    loadSession,
    createNewChat,
  }
}

