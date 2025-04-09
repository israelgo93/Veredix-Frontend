// chat-legal/src/hooks/useChat.ts
"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { getUserId } from "../lib/utils"
import type { Session } from "@supabase/supabase-js"

export interface Message {
  role: "user" | "assistant"
  content: string | Record<string, unknown> | Array<Record<string, unknown>> // Tipo más específico en lugar de any
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

// Nueva interfaz para los elementos dentro de los arrays de contenido
interface ToolResultItem {
  type: string;
  content: string | Record<string, unknown>;
  tool_use_id?: string;
  [key: string]: unknown;
}

// Nueva interfaz para las tareas de agentes
export interface AgentTask {
  id: string
  agent: string
  task: string
  result: string
  timestamp: string
}

export interface ExtraData {
  // No se utiliza para obtener fuentes
  session_id?: string
}

export interface ApiResponse {
  content: string | Record<string, unknown> | Array<Record<string, unknown>>
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
  tool_calls?: Array<{
    id: string
    type: string
    function: {
      name: string
      arguments: string
    }
  }>
  tools?: Array<{
    content?: string
    tool_call_id?: string
    tool_name?: string
    tool_args?: Record<string, unknown>
    tool_call_error?: boolean
    metrics?: Record<string, unknown>
    created_at?: number
  }>
}

export interface UserSession {
  id: string
  user_id: string
  session_id: string
  agent_id: string
  title: string
  created_at: string
}

// Enumeración que define todos los posibles estados de procesamiento
export type ProcessingState = 
  | "idle"               // Sin actividad
  | "thinking"          // Procesando inicialmente
  | "streaming"          // Recibiendo stream de texto
  | "tool_calling"       // Iniciando llamada a herramienta
  | "tool_processing"    // Herramienta procesando 
  | "waiting_result"     // Esperando resultado de herramienta
  | "analyzing"          // Analizando resultados antes de continuar
  | "resuming"           // Reanudando generación de respuesta
  | "completing";        // Completando la respuesta

// Interfaz para las herramientas
interface ToolCall {
  id?: string
  tool_call_id?: string
  function?: {
    name: string
    arguments: string | Record<string, unknown>
  }
  tool_name?: string
  tool_args?: Record<string, unknown>
  content?: string
  tool_call_error?: boolean
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
  // Nuevo estado para las tareas de agentes
  const [agentTasks, setAgentTasks] = useState<AgentTask[]>([])
  // Estado para indicar cuándo se está generando una tarea
  const [isGeneratingTask, setIsGeneratingTask] = useState(false)
  // Nuevo estado para tracking detallado del estado de procesamiento
  const [processingState, setProcessingState] = useState<ProcessingState>("idle")
  // Nuevo estado para rastrar el tiempo desde la última actividad visible
  const [lastActivityTimestamp, setLastActivityTimestamp] = useState<number>(0)
  
  const [userSessions, setUserSessions] = useState<UserSession[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [authSession, setAuthSession] = useState<Session | null>(null)
  // Estado para guardar el modelo actual que está siendo usado (claude o openai)
  const [currentModel, setCurrentModel] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)
  const currentContentRef = useRef<string>("")
  const bufferRef = useRef<string>("")
  // Set para llevar control de los tool_call_id ya procesados
  const processedToolIds = useRef<Set<string>>(new Set())
  // Referencia para almacenar temporalmente los tool_calls pendientes de resultado
  const pendingToolCalls = useRef<Map<string, {agent: string, task: string}>>(new Map())
  // Temporizador para actualizar estados después de períodos de inactividad
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Nuevas referencias para manejo de errores y recuperación
  const retryCountRef = useRef<number>(0)
  const maxRetries = 3
  const lastValidChunkRef = useRef<string>("")

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

  const createNewChat = useCallback(async () => {
    setCurrentChatId("")
    setMessages([])
    setSources([]) // Se limpia el estado de las fuentes al iniciar un nuevo chat
    setAgentTasks([]) // Se limpian las tareas de agentes
    setIsGeneratingTask(false) // Resetear el estado de generación de tareas
    setProcessingState("idle") // Resetear el estado de procesamiento
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
   * Funciona para ambos modelos (Claude y OpenAI)
   * Versión mejorada con mejor manejo de errores y recuperación
   */
  const processJsonObjects = useCallback(
    (text: string): ApiResponse[] => {
      const jsonObjects: ApiResponse[] = []
      
      try {
        // Guardar el último chunk válido para recuperación 
        if (text.trim().length > 0) {
          lastValidChunkRef.current = text;
        }

        // Concatenar el nuevo texto al buffer existente
        bufferRef.current += text

        let startIndex = 0
        while (true) {
          // Buscar el inicio de un posible objeto JSON
          const openBraceIndex = bufferRef.current.indexOf("{", startIndex)
          if (openBraceIndex === -1) break

          // Contar llaves para encontrar el objeto JSON completo
          let braceCount = 1
          let endIndex = openBraceIndex + 1

          // Buscar el final del objeto JSON
          while (braceCount > 0 && endIndex < bufferRef.current.length) {
            if (bufferRef.current[endIndex] === "{") braceCount++
            if (bufferRef.current[endIndex] === "}") braceCount--
            endIndex++
          }

          // Si se encontró un objeto JSON completo
          if (braceCount === 0) {
            try {
              const jsonString = bufferRef.current.slice(openBraceIndex, endIndex).trim()
              const parsed = JSON.parse(jsonString) as ApiResponse
              
              // Validar que sea una ApiResponse válida
              if (parsed.event && parsed.content !== undefined) {
                jsonObjects.push(parsed)
                
                // Identificar el modelo basado en la respuesta
                if (parsed.model && !currentModel) {
                  if (parsed.model.includes("claude")) {
                    setCurrentModel("claude");
                    console.log("Detected Claude model:", parsed.model);
                  } else if (parsed.model.includes("o3-") || parsed.model.includes("gpt-")) {
                    setCurrentModel("openai");
                    console.log("Detected OpenAI model:", parsed.model);
                  }
                }
                
                // Reiniciar el contador de reintentos si hemos procesado algo correctamente
                retryCountRef.current = 0;
              }
              
              // Actualizar el índice de inicio para seguir buscando
              startIndex = endIndex
            } catch (error) {
              // Si hay un error de análisis, avanzar e intentar con el siguiente
              console.warn("Error parsing JSON:", error);
              startIndex = openBraceIndex + 1
            }
          } else {
            // Si el objeto no está completo, salir del bucle
            break
          }
        }

        // Conservar solo la parte del buffer que podría contener JSON incompleto
        bufferRef.current = bufferRef.current.slice(startIndex)
        
        return jsonObjects
      } catch (error) {
        console.error("Error in processJsonObjects:", error);
        
        // Si hay un error general, intentar limpiar el buffer y recuperarse
        bufferRef.current = lastValidChunkRef.current;
        retryCountRef.current++;
        
        // Si hemos excedido los reintentos, limpiamos todo para empezar fresco
        if (retryCountRef.current > maxRetries) {
          console.warn("Max retries exceeded, clearing buffer");
          bufferRef.current = "";
          retryCountRef.current = 0;
        }
        
        return jsonObjects;
      }
    },
    [currentModel]
  )

  /**
   * Actualiza el último mensaje "assistant" con el contenido acumulado,
   * o crea uno nuevo si no existe. Se omite el role "tool" de la conversación.
   * Versión mejorada para manejar casos especiales de contenido
   */
  const updateAssistantMessage = useCallback(
    (content: string, status: "thinking" | "responding" | "complete" = "responding", regenerate = false) => {
      setMessages((prev) => {
        try {
          const newMessages = [...prev]
          const lastAssistantIndex = regenerate
            ? newMessages.findLastIndex((m) => m.role === "assistant")
            : newMessages.length - 1

          // Manejar caso especial: contenido vacío en estado "responding"
          if (content.trim() === "" && status === "responding") {
            // No actualizar con contenido vacío a menos que sea "thinking" o "complete"
            if (lastAssistantIndex !== -1 && newMessages[lastAssistantIndex].role === "assistant") {
              // Solo actualizar el estado, mantener el contenido anterior
              newMessages[lastAssistantIndex] = {
                ...newMessages[lastAssistantIndex],
                status,
              }
            } else if (!regenerate) {
              // Si necesitamos un nuevo mensaje pero el contenido está vacío,
              // crear uno con un espacio o placeholder
              newMessages.push({ role: "assistant", content: " ", status })
            }
            return newMessages;
          }

          // Caso normal: actualizar mensaje existente o crear uno nuevo
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
        } catch (error) {
          console.error("Error in updateAssistantMessage:", error);
          // En caso de error, intentar una actualización mínima
          return prev.concat({ role: "assistant", content: content || "Error al actualizar mensaje", status });
        }
      })
    },
    []
  )

  /**
   * Procesa los tool_calls para registrarlos como tareas pendientes
   * que se completarán cuando llegue su resultado correspondiente.
   * Compatible con ambos modelos (Claude y OpenAI)
   * Versión mejorada con mejor manejo de errores
   */
  const processToolCalls = useCallback((toolCalls: Array<ToolCall> | undefined) => {
    try {
      if (!toolCalls || !Array.isArray(toolCalls) || toolCalls.length === 0) return;
      
      // Si hay tool_calls válidos, marcar que estamos generando tareas
      setIsGeneratingTask(true);
      setProcessingState("tool_calling");
      updateActivity();
      
      toolCalls.forEach(call => {
        try {
          // Asegurarnos de que tenemos un ID y nombre de función válidos (estructura puede variar entre modelos)
          const callId = call.id || call.tool_call_id;
          let functionName = '';
          
          // Manejar estructura de Claude
          if (call.function && call.function.name) {
            functionName = call.function.name;
          } 
          // Manejar estructura de OpenAI
          else if (call.tool_name) {
            functionName = call.tool_name;
          }
          
          if (!callId || !functionName) {
            console.warn("Invalid tool call, missing id or function name", call);
            return; // Continuar con el siguiente
          }
          
          // Extraer el nombre del agente de la función
          let agentName = functionName;
          
          // Manejar específicamente la herramienta "think"
          if (functionName === "think") {
            agentName = "think";
          }
          // Extraer el nombre del agente si está en formato "transfer_task_to_X"
          else if (functionName.startsWith("transfer_task_to_")) {
            agentName = functionName.replace("transfer_task_to_", "");
          }
          
          // Extraer la descripción de la tarea de los argumentos
          let taskDescription = "";
          try {
            // Para Claude
            if (call.function && call.function.arguments) {
              const args = typeof call.function.arguments === 'string'
                ? JSON.parse(call.function.arguments)
                : call.function.arguments;
              
              // Manejo especial para herramienta "think"
              if (functionName === "think" && args.thought) {
                taskDescription = JSON.stringify(args);
              } else {
                taskDescription = typeof args.task_description === 'string' 
                  ? args.task_description 
                  : JSON.stringify(args);
              }
            } 
            // Para OpenAI
            else if (call.tool_args) {
              // Manejo especial para herramienta "think"
              if (functionName === "think" && call.tool_args.thought) {
                taskDescription = JSON.stringify(call.tool_args);
              } else {
                taskDescription = typeof call.tool_args.task_description === 'string'
                  ? call.tool_args.task_description 
                  : JSON.stringify(call.tool_args);
              }
            }
          } catch (parseError) {
            console.warn("Error parsing tool arguments:", parseError);
            taskDescription = typeof call.function?.arguments === 'string'
              ? call.function.arguments
              : JSON.stringify(call.tool_args) || "Tarea sin descripción";
          }
          
          // Guardar en pendingToolCalls para completar cuando llegue el resultado
          pendingToolCalls.current.set(callId, {
            agent: agentName,
            task: taskDescription
          });
          
          // Después de procesar el tool call, cambiamos a estado de procesamiento
          setProcessingState("tool_processing");
          updateActivity();
        } catch (callError) {
          console.error("Error processing individual tool call:", callError);
        }
      });
    } catch (error) {
      console.error("Error in processToolCalls:", error);
      // Intentar recuperarse del error
      setProcessingState("analyzing");
      updateActivity();
    }
  }, [updateActivity]);

  /**
   * Procesa los resultados de herramientas (tool_result) y los asocia con sus
   * llamadas de herramientas correspondientes (tool_calls) para crear tareas completas.
   * Compatible con ambos modelos (Claude y OpenAI)
   * Versión mejorada con mejor manejo de errores
   */
  const processToolResults = useCallback((toolResults: Array<Record<string, unknown>> | undefined) => {
    try {
      if (!toolResults || !Array.isArray(toolResults) || toolResults.length === 0) return;
      
      let resultsProcessed = false;
      
      // Función interna para manejar los resultados de herramientas (actualizada para aceptar toolName opcional)
      const handleToolResult = (toolId: string, content: string, toolName?: string) => {
        try {
          const pendingCall = pendingToolCalls.current.get(toolId);
          
          if (pendingCall) {
            // Indicar que estamos recibiendo resultados
            setProcessingState("analyzing");
            updateActivity();
            
            // Si se proporciona toolName y es "think", usar esto para la tarea
            const agentName = toolName === "think" ? "think" : pendingCall.agent;
            
            // Crear una nueva tarea completa
            const newTask: AgentTask = {
              id: toolId,
              agent: agentName,
              task: pendingCall.task,
              result: content,
              timestamp: new Date().toISOString()
            };
            
            // Añadir la tarea al estado
            setAgentTasks(prev => {
              // Verificar si ya existe una tarea con este ID
              const exists = prev.some(task => task.id === newTask.id);
              if (!exists) {
                return [...prev, newTask];
              }
              return prev;
            });
            
            // Eliminar de pendientes
            pendingToolCalls.current.delete(toolId);
            
            // Si ya no hay tareas pendientes, desactivar el indicador de generación de tareas
            if (pendingToolCalls.current.size === 0) {
              setIsGeneratingTask(false);
              // Después de procesar los resultados, preparamos para resumir la generación
              setProcessingState("resuming");
              updateActivity();
            }
          } else {
            console.warn("Received result for unknown tool ID:", toolId);
          }
        } catch (resultError) {
          console.error("Error handling tool result:", resultError);
        }
      };
      
      toolResults.forEach(result => {
        try {
          // Para herramienta "think" - buscar patrón específico
          if (result.tool_name === "think" && result.tool_call_id && typeof result.content === 'string') {
            handleToolResult(result.tool_call_id as string, result.content, "think");
            resultsProcessed = true;
          }
          // Estructura de Claude - resultados como parte del content en mensajes
          else if (result.type === "tool_result" && result.tool_use_id && typeof result.content === 'string') {
            handleToolResult(result.tool_use_id as string, result.content);
            resultsProcessed = true;
          } 
          // Estructura de OpenAI - resultados directos en la herramienta
          else if (result.tool_call_id && result.content && !result.tool_call_error) {
            handleToolResult(result.tool_call_id as string, result.content as string);
            resultsProcessed = true;
          }
        } catch (itemError) {
          console.error("Error processing individual tool result:", itemError);
        }
      });
      
      // Si procesamos al menos un resultado y todavía hay pendientes, actualizamos el estado
      if (resultsProcessed && pendingToolCalls.current.size > 0) {
        setProcessingState("waiting_result");
        updateActivity();
      }
    } catch (error) {
      console.error("Error in processToolResults:", error);
      // Intentar recuperarse
      if (pendingToolCalls.current.size === 0) {
        setIsGeneratingTask(false);
        setProcessingState("resuming");
      } else {
        setProcessingState("waiting_result");
      }
      updateActivity();
    }
  }, [updateActivity]);

  // Función para procesar fuentes desde respuestas de herramientas
  // Compatible con ambos modelos (Claude y OpenAI)
  // Versión mejorada con mejor manejo de errores
  const processSourcesFromToolMessage = useCallback((message: ToolMessage, sessionId?: string) => {
    try {
      const toolId = message.tool_call_id;
      const topLevelSessionId = sessionId || currentChatId;
      const toolSessionId = message.session_id || topLevelSessionId;
      
      // Solo procesar si el session_id coincide o no hay restricción
      if (currentChatId && toolSessionId && toolSessionId !== currentChatId) {
        return;
      }
      
      // Evitar procesar el mismo toolId más de una vez si existe
      if (toolId && processedToolIds.current.has(toolId)) {
        return;
      }
      
      // Verificar si el contenido parece JSON antes de intentar parsearlo
      const content = typeof message.content === 'string' ? message.content.trim() : '';
      if (!content || content.length === 0) {
        return;
      }
      
      if ((content.startsWith('{') && content.endsWith('}')) || 
          (content.startsWith('[') && content.endsWith(']'))) {
        try {
          const parsedSources = JSON.parse(content) as Source[];
          
          if (Array.isArray(parsedSources)) {
            setSources(prevSources => [...prevSources, ...parsedSources]);
            
            // Registrar que ya procesamos este tool_id
            if (toolId) {
              processedToolIds.current.add(toolId);
            }
          }
        } catch (parseError) {
          console.warn("Error parsing tool message content for sources:", parseError);
        }
      } else {
        console.log("El contenido no parece ser JSON válido, se omite el parseo");
      }
    } catch (error) {
      console.error("Error in processSourcesFromToolMessage:", error);
    }
  }, [currentChatId]);

  /**
   * Carga la sesión con el chatId dado:
   * Compatible con ambos modelos (Claude y OpenAI)
   * Versión mejorada con mejor manejo de errores
   */
  const loadSession = async (chatId: string) => {
    try {
      setProcessingState("analyzing");
      
      const response = await fetch(
        `https://veredix.app/api/v1/playground/agents/veredix/sessions/${chatId}?user_id=${currentUserId}`
      )

      if (!response.ok) {
        throw new Error(`Failed to load session: ${response.status}`)
      }

      const sessionData = await response.json()
      
      if (!sessionData || !sessionData.memory) {
        throw new Error("Invalid session data received")
      }
      
      const rawMessages = (sessionData.memory?.messages || []) as Array<Message | ToolMessage>

      // Reiniciamos las fuentes, tareas y el conjunto de tool_call_id
      setSources([])
      setAgentTasks([])
      setIsGeneratingTask(false) // Reiniciar el estado de generación de tareas
      processedToolIds.current.clear()
      pendingToolCalls.current.clear()
      retryCountRef.current = 0
      lastValidChunkRef.current = ""

      // Función interna para manejar los resultados de herramientas (convertida a expresión de función)
      const handleToolResult = (toolId: string, content: string) => {
        try {
          // Extraer información de la herramienta del historial
          const toolCallMessage = rawMessages.find(msg => {
            // Primero convertimos a unknown y luego a Record para evitar el error de TypeScript
            const msgAsRecord = msg as unknown as Record<string, unknown>;
            return msg.role === "assistant" && 
                   msgAsRecord.tool_calls && 
                   Array.isArray(msgAsRecord.tool_calls) &&
                   msgAsRecord.tool_calls.some((call: Record<string, unknown>) => call.id === toolId);
          });
          
          let agentName = "desconocido";
          let taskDescription = "Tarea sin descripción";
          
          if (toolCallMessage) {
            // Usamos la misma técnica de conversión segura
            const msgAsRecord = toolCallMessage as unknown as Record<string, unknown>;
            
            if (msgAsRecord.tool_calls && Array.isArray(msgAsRecord.tool_calls)) {
              const toolCall = msgAsRecord.tool_calls.find((call: Record<string, unknown>) => call.id === toolId);
              
              const toolFunction = toolCall?.function as Record<string, unknown> | undefined;
              
              if (toolFunction?.name) {
                // Extraer nombre del agente
                agentName = toolFunction.name as string;
                if (agentName.startsWith("transfer_task_to_")) {
                  agentName = agentName.replace("transfer_task_to_", "");
                }
                
                // Extraer descripción de tarea
                try {
                  if (toolFunction?.arguments) {
                    const args = typeof toolFunction.arguments === 'string'
                      ? JSON.parse(toolFunction.arguments)
                      : toolFunction.arguments;
                      
                    taskDescription = typeof args.task_description === 'string'
                      ? args.task_description
                      : JSON.stringify(args);
                  }
                } catch (parseError) {
                  console.warn("Error parsing tool arguments:", parseError);
                  taskDescription = typeof toolFunction?.arguments === 'string'
                    ? toolFunction.arguments
                    : "Tarea sin descripción";
                }
              }
            }
          }
          
          // Crear tarea
          const newTask: AgentTask = {
            id: toolId,
            agent: agentName,
            task: taskDescription,
            result: content,
            timestamp: new Date().toISOString()
          };
          
          // Añadir la tarea solo si no existe ya
          setAgentTasks(prev => {
            const exists = prev.some(task => task.id === newTask.id);
            if (!exists) {
              return [...prev, newTask];
            }
            return prev;
          });
        } catch (resultError) {
          console.error("Error in handleToolResult:", resultError);
        }
      };

      // 1. Filtrar y procesar mensajes de la conversación (user / assistant)
      const filteredMessages = rawMessages
        .filter(
          (msg) => {
            try {
              // Filtrar mensajes nulos
              if (msg.content == null) return false;
              
              // IMPORTANTE: Filtrar mensajes "user" que contienen resultados de herramientas
              // Estos son mensajes especiales que no deben mostrarse como mensajes del usuario
              if (msg.role === "user" && Array.isArray(msg.content)) {
                // Verificar si TODOS los elementos del array son resultados de herramientas
                const isToolResultsOnly = msg.content.every(item => 
                  item.type === "tool_result" && item.tool_use_id
                );
                
                // Si son resultados de herramientas, procesarlos pero no mostrarlos como mensajes
                if (isToolResultsOnly) {
                  // Procesar resultados para actualizar el estado de tareas
                  msg.content.forEach(item => {
                    if (item.type === "tool_result" && item.tool_use_id && item.content) {
                      handleToolResult(item.tool_use_id as string, item.content as string);
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
          // NUEVA LÓGICA: Procesar contenido que no es string
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

      // Almacenar tool_calls para procesarlos posteriormente
      const toolCalls: Array<ToolCall> = [];
      const toolResults: Array<Record<string, unknown>> = [];

      // Procesar mensajes para extraer tool_calls, tool_results y fuentes
      rawMessages.forEach(msg => {
        try {
          // Extraer tool_calls de mensajes del asistente
          if (msg.role === "assistant") {
            // Convertir de manera segura a un Record para acceder a propiedades dinámicas
            const assistantMsg = msg as unknown as Record<string, unknown>;
            
            // Modelo Claude
            if (assistantMsg.tool_calls && Array.isArray(assistantMsg.tool_calls)) {
              toolCalls.push(...assistantMsg.tool_calls as Array<ToolCall>);
            }
            
            // Modelo OpenAI - buscar en otras propiedades potenciales
            if (assistantMsg.tools && Array.isArray(assistantMsg.tools)) {
              // Filtrar solo las herramientas que son llamadas (no resultados)
              const callTools = (assistantMsg.tools as Array<Record<string, unknown>>).filter((t) => 
                t.tool_name && t.tool_args && !t.content);
              
              if (callTools.length > 0) {
                toolCalls.push(...callTools as Array<ToolCall>);
              }
              
              // También buscar los resultados
              const resultTools = (assistantMsg.tools as Array<Record<string, unknown>>).filter((t) => 
                t.tool_call_id && t.content);
              
              if (resultTools.length > 0) {
                toolResults.push(...resultTools);
              }
            }
          }
          
          // Extraer tool_results
          if (msg.role === "user" && Array.isArray(msg.content)) {
            // Usar conversión segura para evitar errores de tipado
            const contents = msg.content as Array<Record<string, unknown>>;
            contents.forEach((content) => {
              if (content.type === "tool_result" && content.tool_use_id && content.content) {
                toolResults.push(content);
              }
            });
          }
          
          // Procesar fuentes de mensajes "tool"
          if (msg.role === "tool") {
            processSourcesFromToolMessage(msg as ToolMessage, sessionData?.session_id);
          }
        } catch (msgProcessError) {
          console.warn("Error processing message for tools and sources:", msgProcessError);
        }
      });

      // Procesar tool_calls
      processToolCalls(toolCalls);
      
      // Procesar tool_results que no se procesaron en handleToolResult
      processToolResults(toolResults);

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

  /**
   * Envía un mensaje al agente y procesa las respuestas en streaming.
   * Compatible con ambos modelos (Claude y OpenAI)
   * Versión mejorada con mejor manejo de errores y recuperación
   */
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

        // Preparar datos para la solicitud
        const formData = new FormData()
        formData.append("message", message)
        formData.append("stream", "true")
        formData.append("monitor", "true")
        formData.append("session_id", currentChatId || "")
        formData.append("user_id", currentUserId || getUserId())

        // Crear controlador para cancelar la solicitud si es necesario
        abortControllerRef.current = new AbortController()

        // Ejecutar la solicitud
        const response = await fetch(
          "https://veredix.app/api/v1/playground/agents/veredix/runs",
          {
            method: "POST",
            body: formData,
            signal: abortControllerRef.current.signal,
          }
        )

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
            const jsonObjects = processJsonObjects(chunk)

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
                    updateAssistantMessage(currentContentRef.current, "thinking", regenerate);
                  } else {
                    // Para otros casos (contenido sustancial o continuación)
                    currentContentRef.current += contentToAdd;
                    updateAssistantMessage(currentContentRef.current, "responding", regenerate);
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
                    
                    // MEJORADO: Verificar si el mensaje inicial era temporal (mensaje de búsqueda)
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
                  
                  updateAssistantMessage(currentContentRef.current, "complete", regenerate)
                  
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
                      processToolCalls([toolObj as ToolCall]);
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
                    processToolResults(parsedData.tools as Array<Record<string, unknown>>);
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
                          processToolCalls(assistantMsg.tool_calls as Array<ToolCall>);
                        }
                      }
                      
                      // Procesar tool_results en mensajes de usuario (formato especial)
                      if (msg.role === "user" && Array.isArray((msg as unknown as Record<string, unknown>).content)) {
                        const userContent = (msg as unknown as Record<string, unknown>).content as Array<Record<string, unknown>>;
                        
                        // Verificar si todos los elementos son tool_result
                        const isToolResultsOnly = userContent.every((item) => 
                          item.type === "tool_result" && item.tool_use_id
                        );
                        
                        // Procesar los resultados de herramientas
                        processToolResults(userContent);
                      }
                      
                      // Procesar mensajes "tool" para fuentes
                      if (msg.role === "tool") {
                        processSourcesFromToolMessage(msg as ToolMessage, parsedData.session_id);
                      }
                    } catch (msgError) {
                      console.warn("Error processing message:", msgError);
                    }
                  });
                }
                
                // 4. Procesar tool_calls directos del parsedData
                if (parsedData.tool_calls) {
                  processToolCalls(parsedData.tool_calls);
                }
                
                // 5. Procesar herramientas del formato OpenAI
                if (parsedData.tools && Array.isArray(parsedData.tools)) {
                  try {
                    const toolCalls = (parsedData.tools as Array<Record<string, unknown>>).filter((tool) => 
                      tool.tool_name && tool.tool_args && !tool.content);
                    
                    if (toolCalls.length > 0) {
                      processToolCalls(toolCalls as Array<ToolCall>);
                    }
                    
                    const toolResults = (parsedData.tools as Array<Record<string, unknown>>).filter((tool) => 
                      tool.tool_call_id && tool.content);
                    
                    if (toolResults.length > 0) {
                      processToolResults(toolResults);
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
              updateAssistantMessage(
                currentContentRef.current || errorMsg, 
                "complete",
                regenerate
              );
              break;
            }
          }
        }
      } catch (error) {
        // Manejo de errores global
        if (error instanceof Error && error.name === "AbortError") {
          console.log("Request aborted by user")
          updateAssistantMessage(
            currentContentRef.current + "\n\n[Mensaje interrumpido por el usuario]",
            "complete",
            regenerate
          )
        } else {
          console.error("Error in sendMessage:", error)
          
          // Mensaje de error más amigable y descriptivo
          const errorMessage = error instanceof Error 
            ? `Error al procesar el mensaje: ${error.message}`
            : "Error al procesar el mensaje. Por favor, intenta de nuevo.";
            
          updateAssistantMessage(
            currentContentRef.current 
              ? `${currentContentRef.current}\n\n[${errorMessage}]` 
              : errorMessage,
            "complete", 
            regenerate
          )
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
      processJsonObjects, 
      updateAssistantMessage, 
      processToolCalls, 
      processToolResults, 
      updateActivity,
      processingState,
      processSourcesFromToolMessage
    ]
  )

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