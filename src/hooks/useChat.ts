"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { getUserId } from "../lib/utils"
import { v4 as uuidv4 } from "uuid"

export interface Message {
  role: "user" | "assistant"
  content: string
  status?: "thinking" | "responding" | "complete"
}

export interface ApiResponse {
  content: string
  content_type: string
  event: string
  messages: Message[]
  sources?: any
  extra_data?: {
    references?: any[]
  }
  session_id?: string
  status?: "thinking" | "reasoning" | "completing"
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

interface UserSession {
  id: string
  user_id: string
  session_id: string
  agent_id: string
  title: string
  created_at: string
}

const fetchUserSessions = async (userId: string) => {
  if (!userId) return []
  try {
    const response = await fetch(
      `http://veredix.centralus.cloudapp.azure.com:7777/v1/playground/agents/veredix/sessions?user_id=${userId}`,
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
  const [authSession, setAuthSession] = useState<any>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentContentRef = useRef<string>("")
  const bufferRef = useRef<string>("")

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

  // Función para crear un nuevo chat: se limpia el session actual y se actualiza la lista de sesiones
  const createNewChat = useCallback(async () => {
    setCurrentChatId("")
    setMessages([])
    localStorage.removeItem("currentChatId")
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

  // Procesa los chunks recibidos del stream y extrae objetos JSON válidos.
  const processJsonObjects = useCallback((text: string): ApiResponse[] => {
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
          const parsed = JSON.parse(jsonString)
          if (parsed.extra_data && parsed.extra_data.references && Array.isArray(parsed.extra_data.references)) {
            const flattenedSources: Source[] = []
            parsed.extra_data.references.forEach((refGroup: any) => {
              if (refGroup.references && Array.isArray(refGroup.references)) {
                flattenedSources.push(...refGroup.references)
              }
            })
            setSources(flattenedSources)
          }
          if (parsed.event && parsed.content !== undefined) {
            jsonObjects.push(parsed)
          }
          startIndex = endIndex
        } catch (e) {
          startIndex = openBraceIndex + 1
        }
      } else {
        break
      }
    }

    bufferRef.current = bufferRef.current.slice(startIndex)
    return jsonObjects
  }, [])

  const updateAssistantMessage = useCallback(
    (
      content: string,
      isComplete = false,
      status: "thinking" | "responding" | "complete" = "responding",
      regenerate = false,
    ) => {
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
    [],
  )

  // Función para cargar una sesión existente al seleccionarla en el sidebar.
  // Se consulta el endpoint y se reconstruye el historial a partir de sessionData.memory.messages.
  const loadSession = async (chatId: string) => {
    try {
      const response = await fetch(
        `http://veredix.centralus.cloudapp.azure.com:7777/v1/playground/agents/veredix/sessions/${chatId}?user_id=${currentUserId}`
      )
  
      if (!response.ok) {
        throw new Error("Failed to load session")
      }
  
      const sessionData = await response.json()
  
      // Filtrar mensajes para incluir solo "user" y "assistant" que tengan contenido
      const rawMessages = sessionData.memory?.messages || []
      const filteredMessages: Message[] = rawMessages
        .filter((msg: any) => {
          return (
            (msg.role === "user" || msg.role === "assistant") &&
            msg.content != null
          )
        })
        .map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          status: "complete",
        }))
  
      // Extraer fuentes desde extra_data.references si existen
      if (sessionData.memory?.extra_data?.references) {
        setSources(sessionData.memory.extra_data.references)
      } else if (sessionData.extra_data?.references) {
        setSources(sessionData.extra_data.references)
      }
  
      setMessages(filteredMessages)
      setCurrentChatId(chatId)
      localStorage.setItem("currentChatId", chatId)
    } catch (error) {
      console.error("Error loading session:", error)
      throw error
    }
  }  

  const sendMessage = useCallback(
    async (message: string, regenerate = false) => {
      try {
        setIsLoading(true)
        setCanStopResponse(true)

        // Si el usuario está autenticado y no hay sesión actual, se inicia un nuevo chat
        if (authSession?.user && !currentChatId) {
          await createNewChat()
        }

        // Actualizar el estado de mensajes
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
        // Se envía "session_id" (vacío si es un nuevo chat)
        formData.append("session_id", currentChatId || "")
        formData.append("user_id", currentUserId || getUserId())

        abortControllerRef.current = new AbortController()

        const response = await fetch(
          "http://veredix.centralus.cloudapp.azure.com:7777/v1/playground/agents/veredix/runs",
          {
            method: "POST",
            body: formData,
            signal: abortControllerRef.current.signal,
          },
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
            if (parsedData.event === "RunResponse" && parsedData.content) {
              currentContentRef.current += parsedData.content
              updateAssistantMessage(currentContentRef.current, false, "responding", regenerate)
            } else if (parsedData.event === "RunCompleted") {
              if (parsedData.content) {
                currentContentRef.current = parsedData.content
              }
              updateAssistantMessage(currentContentRef.current, true, "complete", regenerate)
              // Si el response incluye session_id, se actualiza el estado y se refrescan las sesiones
              if (parsedData.session_id) {
                setCurrentChatId(parsedData.session_id)
                localStorage.setItem("currentChatId", parsedData.session_id)
                if (authSession?.user) {
                  const sessions = await fetchUserSessions(authSession.user.id)
                  setUserSessions(sessions)
                }
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request aborted by user")
          updateAssistantMessage(
            currentContentRef.current + "\n\n[Mensaje interrumpido por el usuario]",
            true,
            "complete",
            regenerate,
          )
        } else {
          console.error("Error in sendMessage:", error)
          updateAssistantMessage("Error al procesar el mensaje", true, "complete", regenerate)
        }
      } finally {
        setIsLoading(false)
        setCanStopResponse(false)
      }
    },
    [currentUserId, currentChatId, authSession, createNewChat, processJsonObjects, updateAssistantMessage],
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
          `http://veredix.centralus.cloudapp.azure.com:7777/v1/playground/agents/veredix/sessions/${sessionId}?user_id=${currentUserId}`,
          {
            method: "DELETE",
          },
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
          `http://veredix.centralus.cloudapp.azure.com:7777/v1/playground/agents/veredix/sessions/${sessionId}/rename`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: newTitle,
              user_id: currentUserId,
            }),
          },
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
