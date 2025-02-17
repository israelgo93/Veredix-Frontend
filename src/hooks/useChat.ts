"use client"

// chat-legal/src/hooks/useChat.ts
import { useState, useCallback, useRef } from "react"

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
  status?: "thinking" | "reasoning" | "completing" // Nuevo campo
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

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [canStopResponse, setCanStopResponse] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentContentRef = useRef<string>("")
  const bufferRef = useRef<string>("")

  const processJsonObjects = (text: string): ApiResponse[] => {
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
          // Si en la respuesta se incluye extra_data.references, aplanar la estructura
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
  }

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
          // Para regeneración, actualizar el último mensaje del asistente
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
        const storedSessionId = sessionStorage.getItem("session_id") || ""
        formData.append("session_id", storedSessionId)
        formData.append("user_id", "ijgc93_0ec5")

        abortControllerRef.current = new AbortController()

        const response = await fetch("http://52.180.148.75:7777/v1/playground/agents/veredix/runs", {
          method: "POST",
          body: formData,
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) throw new Error("Network response was not ok")
        if (!response.body) throw new Error("No response body")

        const reader = response.body.getReader()
        currentContentRef.current = ""
        bufferRef.current = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const jsonObjects = processJsonObjects(chunk)

          for (const parsedData of jsonObjects) {
            if (parsedData.session_id && !sessionStorage.getItem("session_id")) {
              sessionStorage.setItem("session_id", parsedData.session_id)
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
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          updateAssistantMessage(
            currentContentRef.current + "\n\n[Mensaje interrumpido por el usuario]",
            true,
            "complete",
            regenerate,
          )
        } else {
          console.error("Error:", error)
          updateAssistantMessage("Error al procesar el mensaje", true, "complete", regenerate)
        }
      } finally {
        setIsLoading(false)
        setCanStopResponse(false)
      }
    },
    [updateAssistantMessage], // Removed processJsonObjects from dependency array
  )

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }, [])

  return {
    messages,
    sendMessage,
    isLoading,
    cancelRequest,
    canStopResponse,
    sources,
  }
}

