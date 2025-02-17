"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createUserSession } from "../lib/supabaseUtils"
import { supabase } from "../lib/supabase"
import { getUserId } from "@/lib/utils"

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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)

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
          const storedSessionId = localStorage.getItem("currentSessionId")
          if (storedSessionId) {
            setCurrentSessionId(storedSessionId)
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
          const sessions = await fetchUserSessions(userId)
          setUserSessions(sessions)
        }
      } else if (event === "SIGNED_OUT") {
        const anonymousId = getUserId()
        console.log("User signed out, using anonymous ID:", anonymousId)
        setCurrentUserId(anonymousId)
        setUserSessions([])
        localStorage.removeItem("currentSessionId")
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (currentUserId) {
      fetchUserSessions(currentUserId).then((sessions) => {
        setUserSessions(sessions)
      })
    }
  }, [currentUserId])

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
          const jsonString = bufferRef.current.slice(openBraceIndex, endIndex)
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

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(
        `http://veredix.centralus.cloudapp.azure.com:7777/v1/playground/agents/veredix/sessions/${sessionId}?user_id=${currentUserId}`,
      )

      if (!response.ok) {
        throw new Error("Failed to load session")
      }

      const sessionData = await response.json()

      // Convert the session messages to our Message format
      const chatMessages: Message[] = []
      sessionData.memory.messages.forEach((msg: any) => {
        if (msg.role !== "system") {
          chatMessages.push({
            role: msg.role,
            content: msg.content,
            status: "complete",
          })
        }
      })

      setMessages(chatMessages)
      setCurrentSessionId(sessionId)
      localStorage.setItem("currentSessionId", sessionId)
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
        formData.append("session_id", currentSessionId || "")
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
          console.error("API response not ok:", response.status, response.statusText)
          throw new Error("Network response was not ok")
        }
        if (!response.body) {
          console.error("API response body is null")
          throw new Error("No response body")
        }

        const reader = response.body.getReader()
        currentContentRef.current = ""
        bufferRef.current = ""

        let sessionId = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const jsonObjects = processJsonObjects(chunk)

          for (const parsedData of jsonObjects) {
            if (parsedData.session_id && !currentSessionId) {
              sessionId = parsedData.session_id
              setCurrentSessionId(sessionId)
              localStorage.setItem("currentSessionId", sessionId)
            }

            if (parsedData.event === "RunResponse" && parsedData.content) {
              currentContentRef.current += parsedData.content
              updateAssistantMessage(currentContentRef.current, false, "responding", regenerate)
            } else if (parsedData.event === "RunCompleted") {
              if (parsedData.content) {
                currentContentRef.current = parsedData.content
              }
              updateAssistantMessage(currentContentRef.current, true, "complete", regenerate)
            }
          }
        }

        // Create user session in Supabase only for authenticated users
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (session?.user && sessionId && !currentSessionId) {
          await createUserSession(session.user.id, sessionId, "veredix", message)
          const sessions = await fetchUserSessions(session.user.id)
          setUserSessions(sessions)
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
    [currentUserId, currentSessionId, processJsonObjects, updateAssistantMessage],
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
        if (sessionId === currentSessionId) {
          setCurrentSessionId(null)
          localStorage.removeItem("currentSessionId")
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
    sendMessage,
    isLoading,
    cancelRequest,
    canStopResponse,
    sources,
    userSessions,
    deleteSession,
    renameSession,
    currentUserId,
    currentSessionId,
    loadSession,
  }
}

