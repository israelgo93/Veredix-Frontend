// src/hooks/useChat.ts
"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { getUserId } from "../lib/utils"
import type { Session } from "@supabase/supabase-js"
import { 
  fetchUserSessions, 
  deleteUserSession, 
  renameUserSession, 
  loadUserSession,
  sendMessageToAgent 
} from "../lib/api"
import { 
  processJsonObjects, 
  updateAssistantMessage, 
  processSourcesFromToolMessage 
} from "../lib/messageProcessors"
import { 
  processToolCalls, 
  processToolResults, 
  processHistoricalToolResult 
} from "../lib/toolProcessors"
import type {
  Message,
  ToolMessage,
  Source,
  AgentTask,
  ProcessingState,
  ToolResultItem,
  UseChatReturn,
  UserSession,
  ToolCall
} from "./types"

// Re-export types that are used by components importing this hook
export type { Source, AgentTask, Message, ProcessingState, UserSession }

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [canStopResponse, setCanStopResponse] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([])
  const [isGeneratingTask, setIsGeneratingTask] = useState(false)
  const [processingState, setProcessingState] = useState<ProcessingState>("idle")
  const [lastActivityTimestamp, setLastActivityTimestamp] = useState<number>(0)
  
  const [userSessions, setUserSessions] = useState<UserSession[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [authSession, setAuthSession] = useState<Session | null>(null)
  const [currentModel, setCurrentModel] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentContentRef = useRef<string>("")
  const bufferRef = useRef<string>("")
  const processedToolIds = useRef<Set<string>>(new Set())
  const pendingToolCalls = useRef<Map<string, {agent: string, task: string}>>(new Map())
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const retryCountRef = useRef<number>(0)
  const maxRetries = 3
  const lastValidChunkRef = useRef<string>("")

  // Función para actualizar el estado de actividad
  const updateActivity = useCallback(() => {
    setLastActivityTimestamp(Date.now());
    
    // Limpiar cualquier temporizador anterior
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Configurar un nuevo temporizador si estamos en un estado de espera
    if (processingState === "tool_processing" || 
        processingState === "waiting_result" || 
        processingState === "analyzing") {
      
      inactivityTimerRef.current = setTimeout(() => {
        // Si no hay actividad después de 3 segundos, actualizar el estado
        if (processingState === "tool_processing") {
          setProcessingState("waiting_result");
        } else if (processingState === "waiting_result" && 
                  Date.now() - lastActivityTimestamp > 5000) {
          setProcessingState("analyzing");
        }
      }, 3000);
    }
  }, [processingState, lastActivityTimestamp]);

  // Verificar sesión de autenticación
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
      // Limpiar cualquier temporizador pendiente al desmontar
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    }
  }, [])

  // Cargar sesiones de usuario cuando cambia el usuario
  useEffect(() => {
    if (currentUserId) {
      fetchUserSessions(currentUserId).then((sessions) => {
        setUserSessions(sessions)
      })
    }
  }, [currentUserId])

  // Crear un nuevo chat
  const createNewChat = useCallback(async () => {
    setCurrentChatId("")
    setMessages([])
    setSources([])
    setAgentTasks([])
    setIsGeneratingTask(false)
    setProcessingState("idle")
    localStorage.removeItem("currentChatId")
    processedToolIds.current.clear()
    pendingToolCalls.current.clear()
    retryCountRef.current = 0
    lastValidChunkRef.current = ""
    if (authSession?.user) {
      const sessions = await fetchUserSessions(authSession.user.id)
      setUserSessions(sessions)
    }
  }, [authSession])

  // Cargar una sesión específica
  const loadSession = async (chatId: string) => {
    try {
      setProcessingState("analyzing");
      
      const sessionData = await loadUserSession(currentUserId!, chatId);
      
      if (!sessionData || !sessionData.memory) {
        throw new Error("Invalid session data received")
      }
      
      const rawMessages = (sessionData.memory?.messages || []) as Array<Message | ToolMessage>

      // Reiniciamos las fuentes, tareas y el conjunto de tool_call_id
      setSources([])
      setAgentTasks([])
      setIsGeneratingTask(false)
      processedToolIds.current.clear()
      pendingToolCalls.current.clear()
      retryCountRef.current = 0
      lastValidChunkRef.current = ""

      // 1. Filtrar y procesar mensajes de la conversación (user / assistant)
      const filteredMessages = rawMessages
        .filter(
          (msg) => {
            try {
              // Filtrar mensajes nulos
              if (msg.content == null) return false;
              
              // Filtrar mensajes "user" que contienen resultados de herramientas
              if (msg.role === "user" && Array.isArray(msg.content)) {
                // Verificar si TODOS los elementos del array son resultados de herramientas
                const toolResults = msg.content.every(item => 
                  item.type === "tool_result" && item.tool_use_id
                );
                
                // Si son resultados de herramientas, procesarlos pero no mostrarlos como mensajes
                if (toolResults) {
                  // Procesar resultados para actualizar el estado de tareas
                  msg.content.forEach(item => {
                    if (item.type === "tool_result" && item.tool_use_id && item.content) {
                      processHistoricalToolResult(
                        item.tool_use_id as string, 
                        item.content as string, 
                        rawMessages,
                        setAgentTasks
                      );
                    }
                  });
                  // Excluir este mensaje de la conversación visible
                  return false;
                }
              }
              
              // Incluir todos los demás mensajes de usuario y asistente
              return (msg.role === "user" || msg.role === "assistant");
            } catch (filterError) {
              console.error("Error filtering message:", filterError);
              // En caso de error, excluir el mensaje
              return false;
            }
          }
        );

      // 2. Identificar y combinar respuestas fragmentadas del asistente
      const consolidatedMessages: Array<Message | ToolMessage> = [];
      
      try {
        // Map para seguir la conversación por pares (usuario-asistente)
        const conversationPairs: Array<{user: Message | null, assistant: Message | null}> = [];
        let currentPair: {user: Message | null, assistant: Message | null} = {user: null, assistant: null};
        
        // Primero, organizar mensajes en pares de usuario-asistente
        filteredMessages.forEach((msg) => {
          try {
            if (msg.role === "user") {
              // Si hay un par previo incompleto, agregarlo antes de comenzar uno nuevo
              if (currentPair.user || currentPair.assistant) {
                conversationPairs.push(currentPair);
              }
              // Comenzar un nuevo par con este mensaje de usuario
              currentPair = {user: msg as Message, assistant: null};
            } 
            else if (msg.role === "assistant") {
              // Si ya hay un asistente en el par actual, es una respuesta fragmentada
              if (currentPair.assistant) {
                // Solo nos quedamos con la respuesta final (la que tiene contenido completo)
                // Esto resuelve el problema de mostrar mensajes preliminares
                if (typeof msg.content === 'string' && 
                    typeof currentPair.assistant.content === 'string' && 
                    msg.content.length > currentPair.assistant.content.length) {
                  currentPair.assistant = msg as Message;
                }
              } else {
                // Primera respuesta del asistente para el mensaje actual
                currentPair.assistant = msg as Message;
              }
            }
          } catch (msgError) {
            console.warn("Error processing message in pair organization:", msgError);
          }
        });
        
        // Agregar el último par si existe
        if (currentPair.user || currentPair.assistant) {
          conversationPairs.push(currentPair);
        }
        
        // Convertir los pares en una secuencia lineal de mensajes
        conversationPairs.forEach(pair => {
          if (pair.user) consolidatedMessages.push(pair.user);
          if (pair.assistant) consolidatedMessages.push(pair.assistant);
        });
      } catch (consolidationError) {
        console.error("Error consolidating messages:", consolidationError);
        // En caso de error, usar los mensajes filtrados directamente
        filteredMessages.forEach(msg => consolidatedMessages.push(msg));
      }

      // 3. Procesar contenido de los mensajes consolidados
      const conversationMessages: Message[] = consolidatedMessages.map((msg) => {
        try {
          // Procesar contenido que no es string
          let processedContent = msg.content;
          
          // Si content es un array (formato de Claude para tools)
          if (Array.isArray(msg.content)) {
            // Extraer el contenido relevante de cada elemento del array
            processedContent = (msg.content as Array<ToolResultItem>).map((item) => {
              try {
                if (item.type === "tool_result" && typeof item.content === "string") {
                  const shortContent = item.content.length > 100 
                    ? `${item.content.substring(0, 100)}...` 
                    : item.content;
                  return `[Resultado de herramienta: ${shortContent}]`;
                }
                return JSON.stringify(item);
              } catch (itemError) {
                console.warn("Error processing array item:", itemError);
                return "[Error en el contenido]";
              }
            }).join("\n\n");
          } 
          // Si content es un objeto (otro caso posible)
          else if (typeof msg.content === "object" && msg.content !== null) {
            processedContent = JSON.stringify(msg.content);
          }
          
          return {
            role: msg.role as "user" | "assistant",
            content: processedContent,
            status: "complete",
            tool_call_id: msg.tool_call_id,
          };
        } catch (contentError) {
          console.error("Error processing message content:", contentError);
          // En caso de error, devolver un mensaje de error
          return {
            role: msg.role as "user" | "assistant",
            content: "Error al procesar este mensaje",
            status: "complete",
          };
        }
      });

      // Procesar mensajes para extraer fuentes
      rawMessages.forEach(msg => {
        try {
          // Procesar fuentes de mensajes "tool"
          if (msg.role === "tool") {
            const newSources = processSourcesFromToolMessage(
              msg as ToolMessage, 
              currentChatId,
              sessionData?.session_id,
              processedToolIds.current
            );
            
            if (newSources.length > 0) {
              setSources(prev => [...prev, ...newSources]);
            }
          }
        } catch (msgProcessError) {
          console.warn("Error processing message for sources:", msgProcessError);
        }
      });

      // Actualizar mensajes de la conversación
      setMessages(conversationMessages)
      
      // Actualizar ID de sesión actual
      setCurrentChatId(chatId)
      localStorage.setItem("currentChatId", chatId)
      
      // Finalmente, volvemos al estado inactivo
      setProcessingState("idle");
      
    } catch (error) {
      console.error("Error loading session:", error)
      setProcessingState("idle");
      throw error
    }
  }

  // Enviar un mensaje al agente
  const sendMessage = useCallback(
    async (message: string, regenerate = false) => {
      try {
        // Configuración inicial
        setIsLoading(true)
        setCanStopResponse(true)
        setIsGeneratingTask(false)
        setProcessingState("thinking");
        updateActivity();
        
        // Verificar si necesitamos crear un nuevo chat
        if (authSession?.user && !currentChatId) {
          await createNewChat()
        }

        // Actualizar UI - agregar mensaje de usuario o actualizar el asistente
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

        // Crear controlador para cancelar la solicitud si es necesario
        abortControllerRef.current = new AbortController()

        // Ejecutar la solicitud
        const response = await sendMessageToAgent(
          message,
          currentChatId,
          currentUserId,
          abortControllerRef.current.signal
        );

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        // Reiniciar variables de estado
        currentContentRef.current = ""
        bufferRef.current = ""
        retryCountRef.current = 0
        lastValidChunkRef.current = ""

        // Procesar la respuesta en streaming
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          try {
            const chunk = new TextDecoder().decode(value)
            const jsonObjects = processJsonObjects(
              chunk, 
              bufferRef, 
              lastValidChunkRef, 
              retryCountRef, 
              maxRetries, 
              setCurrentModel, 
              currentModel
            );

            for (const parsedData of jsonObjects) {
              try {
                // 1. Actualiza el contenido del mensaje "assistant"
                if (parsedData.event === "RunResponse" && parsedData.content !== undefined) {
                  // Verificar si el contenido es string (podría ser objeto en Claude)
                  const contentToAdd = typeof parsedData.content === 'string' 
                    ? parsedData.content 
                    : JSON.stringify(parsedData.content);
                    
                  // Verificar si este es un mensaje inicial indicando búsqueda
                  const isInitialSearchMessage = typeof contentToAdd === 'string' && (
                    contentToAdd.includes("realizaré una búsqueda") || 
                    contentToAdd.includes("buscaré información") ||
                    (contentToAdd.length < 200 && (
                      contentToAdd.includes("buscar") || 
                      contentToAdd.includes("búsqueda") ||
                      contentToAdd.includes("obtener información")
                    ))
                  );
                  
                  // Si ya tenemos contenido y recibimos un mensaje inicial
                  // No lo agregamos, ya que probablemente es parte de una respuesta fragmentada
                  if (currentContentRef.current && isInitialSearchMessage) {
                    console.log("Skipping initial search message as we already have content");
                    continue; // Usamos continue para saltar solo esta iteración
                  }
                  
                  // Si este es el primer contenido y es mensaje de búsqueda, lo guardamos como temporal
                  if (!currentContentRef.current && isInitialSearchMessage) {
                    currentContentRef.current = contentToAdd;
                    setMessages(prev => updateAssistantMessage(prev, currentContentRef.current, "thinking", regenerate));
                  } else {
                    // Para otros casos (contenido sustancial o continuación)
                    currentContentRef.current += contentToAdd;
                    setMessages(prev => updateAssistantMessage(prev, currentContentRef.current, "responding", regenerate));
                  }
                  
                  // Cambiar al estado de streaming cuando comenzamos a recibir contenido
                  if (processingState !== "streaming") {
                    setProcessingState("streaming");
                    updateActivity();
                  }
                }
                // 2. Cuando se completa la respuesta
                else if (parsedData.event === "RunCompleted") {
                  if (parsedData.content !== undefined) {
                    // Verificar si el contenido es string
                    const finalContent = typeof parsedData.content === 'string'
                      ? parsedData.content
                      : JSON.stringify(parsedData.content);
                    
                    // Verificar si el mensaje inicial era temporal (mensaje de búsqueda)
                    // y si el contenido final es sustancialmente diferente
                    const initialContent = currentContentRef.current;
                    const isInitialTemporary = typeof initialContent === 'string' && (
                      initialContent.includes("realizaré una búsqueda") || 
                      initialContent.includes("buscaré información") ||
                      (initialContent.length < 200 && (
                        initialContent.includes("buscar") || 
                        initialContent.includes("búsqueda") ||
                        initialContent.includes("obtener información")
                      ))
                    );
                    
                    // Si el mensaje inicial era temporal y el contenido final es sustancial,
                    // reemplazamos completamente en lugar de agregar
                    if (isInitialTemporary && finalContent.length > initialContent.length * 2) {
                      currentContentRef.current = finalContent;
                    } else if (finalContent !== initialContent) {
                      // En otros casos, si es diferente, lo actualizamos
                      currentContentRef.current = finalContent;
                    }
                  }
                  
                  setMessages(prev => updateAssistantMessage(prev, currentContentRef.current, "complete", regenerate));
                  
                  // Establecer el estado como completado
                  setProcessingState("completing");
                  setTimeout(() => {
                    setProcessingState("idle");
                  }, 500);
                  
                  // Actualizar ID de sesión si está presente
                  if (parsedData.session_id) {
                    setCurrentChatId(parsedData.session_id)
                    localStorage.setItem("currentChatId", parsedData.session_id)
                    if (authSession?.user) {
                      const sessions = await fetchUserSessions(authSession.user.id)
                      setUserSessions(sessions)
                    }
                  }
                }
                // Cuando comienza una herramienta
                else if (parsedData.event === "ToolCallStarted") {
                  // Actualizar el estado a "tool_calling"
                  setProcessingState("tool_calling");
                  updateActivity();
                  
                  // Procesar tool_calls desde el objeto de tools (OpenAI style)
                  if (parsedData.tools && Array.isArray(parsedData.tools)) {
                    const toolObj = parsedData.tools[0];
                    // Detección específica de herramienta "think"
                    if (toolObj && toolObj.tool_name === "think") {
                      setProcessingState("thinking");
                      processToolCalls(
                        [toolObj], 
                        pendingToolCalls.current,
                        setIsGeneratingTask,
                        setProcessingState,
                        updateActivity
                      );
                    }
                  }
                }
                // Cuando se completa una herramienta
                else if (parsedData.event === "ToolCallCompleted") {
                  // Actualizamos a "analyzing" puesto que ahora está procesando el resultado
                  setProcessingState("analyzing");
                  updateActivity();
                  
                  // Procesar resultados de herramientas (OpenAI style)
                  if (parsedData.tools && Array.isArray(parsedData.tools)) {
                    processToolResults(
                      parsedData.tools, 
                      pendingToolCalls.current,
                      setProcessingState,
                      setIsGeneratingTask,
                      updateActivity,
                      setAgentTasks
                    );
                  }
                }
                
                // 3. Procesar tool_calls en mensajes del asistente
                if (parsedData.messages && Array.isArray(parsedData.messages)) {
                  parsedData.messages.forEach(msg => {
                    try {
                      if (msg.role === "assistant") {
                        // Convertir de manera segura
                        const assistantMsg = msg as unknown as Record<string, unknown>;
                        
                        if (assistantMsg.tool_calls) {
                          processToolCalls(
                            assistantMsg.tool_calls as Array<ToolCall>,
                            pendingToolCalls.current,
                            setIsGeneratingTask,
                            setProcessingState,
                            updateActivity
                          );
                        }
                      }
                      
                      // Procesar tool_results en mensajes de usuario (formato especial)
                      if (msg.role === "user" && Array.isArray((msg as unknown as Record<string, unknown>).content)) {
                        const userContent = (msg as unknown as Record<string, unknown>).content as Array<Record<string, unknown>>;
                        
                        // Verificar si todo el contenido son resultados de herramientas para procesarlos
                        processToolResults(
                          userContent,
                          pendingToolCalls.current,
                          setProcessingState,
                          setIsGeneratingTask,
                          updateActivity,
                          setAgentTasks
                        );
                      }
                      
                      // Procesar mensajes "tool" para fuentes
                      if (msg.role === "tool") {
                        const newSources = processSourcesFromToolMessage(
                          msg as ToolMessage, 
                          currentChatId,
                          parsedData.session_id,
                          processedToolIds.current
                        );
                        
                        if (newSources.length > 0) {
                          setSources(prev => [...prev, ...newSources]);
                        }
                      }
                    } catch (msgError) {
                      console.warn("Error processing message:", msgError);
                    }
                  });
                }
                
                // 4. Procesar tool_calls directos del parsedData
                if (parsedData.tool_calls) {
                  processToolCalls(
                    parsedData.tool_calls,
                    pendingToolCalls.current,
                    setIsGeneratingTask,
                    setProcessingState,
                    updateActivity
                  );
                }
                
                // 5. Procesar herramientas del formato OpenAI
                if (parsedData.tools && Array.isArray(parsedData.tools)) {
                  try {
                    const toolCalls = (parsedData.tools as Array<Record<string, unknown>>).filter((tool) => 
                      tool.tool_name && tool.tool_args && !tool.content);
                    
                    if (toolCalls.length > 0) {
                      processToolCalls(
                        toolCalls,
                        pendingToolCalls.current,
                        setIsGeneratingTask,
                        setProcessingState,
                        updateActivity
                      );
                    }
                    
                    const toolResults = (parsedData.tools as Array<Record<string, unknown>>).filter((tool) => 
                      tool.tool_call_id && tool.content);
                    
                    if (toolResults.length > 0) {
                      processToolResults(
                        toolResults,
                        pendingToolCalls.current,
                        setProcessingState,
                        setIsGeneratingTask,
                        updateActivity,
                        setAgentTasks
                      );
                    }
                  } catch (toolsError) {
                    console.warn("Error processing tools array:", toolsError);
                  }
                }
              } catch (dataError) {
                console.error("Error processing parsed data:", dataError);
              }
            }
          } catch (chunkError) {
            console.error("Error processing chunk:", chunkError);
            
            // Incrementar contador de reintentos
            retryCountRef.current++;
            
            // Si superamos el máximo de reintentos, mostrar un mensaje de error
            if (retryCountRef.current > maxRetries) {
              // Mostrar un mensaje de error adecuado pero no fatal
              const errorMsg = "Hubo un problema al procesar la respuesta. Por favor, intenta de nuevo.";
              setMessages(prev => updateAssistantMessage(
                prev,
                currentContentRef.current || errorMsg, 
                "complete",
                regenerate
              ));
              break;
            }
          }
        }
      } catch (error) {
        // Manejo de errores global
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request aborted by user")
          setMessages(prev => updateAssistantMessage(
            prev,
            currentContentRef.current + "\n\n[Mensaje interrumpido por el usuario]",
            "complete",
            regenerate
          ));
        } else {
          console.error("Error in sendMessage:", error)
          
          // Mensaje de error más amigable y descriptivo
          const errorMessage = error instanceof Error 
            ? `Error al procesar el mensaje: ${error.message}`
            : "Error al procesar el mensaje. Por favor, intenta de nuevo.";
            
          setMessages(prev => updateAssistantMessage(
            prev,
            currentContentRef.current 
              ? `${currentContentRef.current}\n\n[${errorMessage}]` 
              : errorMessage,
            "complete", 
            regenerate
          ));
        }
      } finally {
        // Limpiar estados
        setIsLoading(false)
        setCanStopResponse(false)
        setProcessingState("idle");
        
        // Limpiar temporizadores
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
          inactivityTimerRef.current = null;
        }
      }
    },
    [
      currentUserId, 
      currentChatId, 
      authSession, 
      createNewChat, 
      updateActivity,
      processingState,
      currentModel
    ]
  )

  // Función para cancelar una solicitud en curso
  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // Resetear el estado de procesamiento al cancelar
    setProcessingState("idle");
    // Limpiar temporizadores
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
  }, [])

  // Función para eliminar una sesión
  const deleteSession = async (sessionId: string) => {
    if (currentUserId) {
      try {
        const success = await deleteUserSession(currentUserId, sessionId);
        if (!success) {
          throw new Error("Failed to delete session");
        }
        
        const sessions = await fetchUserSessions(currentUserId);
        setUserSessions(sessions);
        
        if (sessionId === currentChatId) {
          setCurrentChatId(null);
          localStorage.removeItem("currentChatId");
        }
      } catch (error) {
        console.error("Error deleting session:", error);
        throw error;
      }
    }
  }

  // Función para renombrar una sesión
  const renameSession = async (sessionId: string, newTitle: string) => {
    if (currentUserId) {
      try {
        const success = await renameUserSession(currentUserId, sessionId, newTitle);
        if (!success) {
          throw new Error("Failed to rename session");
        }
        
        const sessions = await fetchUserSessions(currentUserId);
        setUserSessions(sessions);
      } catch (error) {
        console.error("Error renaming session:", error);
        throw error;
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
    agentTasks,
    isGeneratingTask,
    processingState,
    currentModel,
    userSessions,
    deleteSession,
    renameSession,
    currentUserId,
    currentChatId,
    loadSession,
    createNewChat,
  }
}