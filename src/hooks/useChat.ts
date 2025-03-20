// chat-legal/src/hooks/useChat.ts
"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { supabase } from "../lib/supabase"
import { getUserId } from "../lib/utils"
import type { Session } from "@supabase/supabase-js"

export interface Message {
  role: "user" | "assistant"
  content: string | object | any[] // Actualizado para permitir diferentes tipos de contenido
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
  content: string | object | any[]
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
    tool_args?: Record<string, string>
    tool_call_error?: boolean
    metrics?: Record<string, any>
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
              
              // Identificar el modelo basado en la respuesta si está disponible
              if (parsed.model && !currentModel) {
                if (parsed.model.includes("claude")) {
                  setCurrentModel("claude");
                  console.log("Detected Claude model:", parsed.model);
                } else if (parsed.model.includes("o3-") || parsed.model.includes("gpt-")) {
                  setCurrentModel("openai");
                  console.log("Detected OpenAI model:", parsed.model);
                }
              }
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
    [currentModel]
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
   * Procesa los tool_calls para registrarlos como tareas pendientes
   * que se completarán cuando llegue su resultado correspondiente.
   * Compatible con ambos modelos (Claude y OpenAI)
   */
  const processToolCalls = useCallback((toolCalls: ApiResponse["tool_calls"] | any[]) => {
    if (!toolCalls || !Array.isArray(toolCalls)) return;
    
    // Si hay tool_calls válidos, marcar que estamos generando tareas
    if (toolCalls.length > 0) {
      setIsGeneratingTask(true);
      setProcessingState("tool_calling");
      updateActivity();
    }
    
    toolCalls.forEach(call => {
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
      
      if (callId && functionName) {
        try {
          // Extraer el nombre del agente de la función (ejemplo: transfer_task_to_agente_buscador -> agente_buscador)
          let agentName = functionName;
          
          // Extraer el nombre del agente si está en formato "transfer_task_to_X"
          if (functionName.startsWith("transfer_task_to_")) {
            agentName = functionName.replace("transfer_task_to_", "");
          }
          
          // Extraer la descripción de la tarea de los argumentos
          let taskDescription = "";
          try {
            // Para Claude
            if (call.function && call.function.arguments) {
              const args = JSON.parse(typeof call.function.arguments === 'string' 
                ? call.function.arguments 
                : JSON.stringify(call.function.arguments));
              taskDescription = args.task_description || JSON.stringify(args);
            } 
            // Para OpenAI
            else if (call.tool_args) {
              taskDescription = call.tool_args.task_description || JSON.stringify(call.tool_args);
            }
          } catch {
            taskDescription = (call.function?.arguments || JSON.stringify(call.tool_args) || "Tarea sin descripción");
          }
          
          // Guardar en pendingToolCalls para completar cuando llegue el resultado
          pendingToolCalls.current.set(callId, {
            agent: agentName,
            task: taskDescription
          });
          
          // Después de procesar el tool call, cambiamos a estado de procesamiento
          setProcessingState("tool_processing");
          updateActivity();
        } catch (error) {
          console.error("Error processing tool call:", error);
        }
      }
    });
  }, [updateActivity]);

  /**
   * Procesa los resultados de herramientas (tool_result) y los asocia con sus
   * llamadas de herramientas correspondientes (tool_calls) para crear tareas completas.
   * Compatible con ambos modelos (Claude y OpenAI)
   */
  const processToolResults = useCallback((toolResults: any[] | undefined) => {
    if (!toolResults || !Array.isArray(toolResults)) return;
    
    let resultsProcessed = false;
    
    toolResults.forEach(result => {
      // Estructura de Claude - resultados como parte del content en mensajes
      if (result.type === "tool_result" && result.tool_use_id && result.content) {
        handleToolResult(result.tool_use_id, result.content);
        resultsProcessed = true;
      } 
      // Estructura de OpenAI - resultados directos en la herramienta
      else if (result.tool_call_id && result.content && !result.tool_call_error) {
        handleToolResult(result.tool_call_id, result.content);
        resultsProcessed = true;
      }
    });
    
    // Función interna para manejar los resultados de herramientas
    function handleToolResult(toolId: string, content: string) {
      const pendingCall = pendingToolCalls.current.get(toolId);
      
      if (pendingCall) {
        // Indicar que estamos recibiendo resultados
        setProcessingState("analyzing");
        updateActivity();
        
        // Crear una nueva tarea completa
        const newTask: AgentTask = {
          id: toolId,
          agent: pendingCall.agent,
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
      }
    }
    
    // Si procesamos al menos un resultado y todavía hay pendientes, actualizamos el estado
    if (resultsProcessed && pendingToolCalls.current.size > 0) {
      setProcessingState("waiting_result");
      updateActivity();
    }
  }, [updateActivity]);

  // Función para procesar fuentes desde respuestas de herramientas
  // Compatible con ambos modelos (Claude y OpenAI)
  const processSourcesFromToolMessage = useCallback((message: ToolMessage, sessionId?: string) => {
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
    
    try {
      // Verificar si el contenido parece JSON antes de intentar parsearlo
      const content = message.content.trim();
      if ((content.startsWith('{') && content.endsWith('}')) || 
          (content.startsWith('[') && content.endsWith(']'))) {
        const parsedSources = JSON.parse(content) as Source[];
        
        if (Array.isArray(parsedSources)) {
          setSources(prevSources => [...prevSources, ...parsedSources]);
          
          // Registrar que ya procesamos este tool_id
          if (toolId) {
            processedToolIds.current.add(toolId);
          }
        }
      } else {
        console.log("El contenido no parece ser JSON válido, se omite el parseo");
      }
    } catch (err) {
      console.error("Error parsing tool message content for sources:", err);
    }
  }, [currentChatId]);

  /**
   * Carga la sesión con el chatId dado:
   * Compatible con ambos modelos (Claude y OpenAI)
   */
  const loadSession = async (chatId: string) => {
    try {
      setProcessingState("analyzing");
      
      const response = await fetch(
        `https://veredix.app/api/v1/playground/agents/veredix/sessions/${chatId}?user_id=${currentUserId}`
      )

      if (!response.ok) {
        throw new Error("Failed to load session")
      }

      const sessionData = await response.json()
      const rawMessages = (sessionData.memory?.messages || []) as Array<Message | ToolMessage>

      // Reiniciamos las fuentes, tareas y el conjunto de tool_call_id
      setSources([])
      setAgentTasks([])
      setIsGeneratingTask(false) // Reiniciar el estado de generación de tareas
      processedToolIds.current.clear()
      pendingToolCalls.current.clear()

      // 1. Filtrar y procesar mensajes de la conversación (user / assistant)
      let filteredMessages = rawMessages
        .filter(
          (msg) => {
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
                    handleToolResult(item.tool_use_id, item.content);
                  }
                });
                // Excluir este mensaje de la conversación visible
                return false;
              }
            }
            
            // Incluir todos los demás mensajes de usuario y asistente
            return (msg.role === "user" || msg.role === "assistant");
          }
        );

      // 2. Identificar y combinar respuestas fragmentadas del asistente
      const consolidatedMessages: any[] = [];
      let lastUserIndex = -1;
      
      filteredMessages.forEach((msg, index) => {
        // Registrar último mensaje del usuario
        if (msg.role === "user") {
          lastUserIndex = consolidatedMessages.length;
          consolidatedMessages.push(msg);
        } 
        // Procesar mensajes del asistente
        else if (msg.role === "assistant") {
          const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          
          // Verificar si este es un mensaje inicial indicando búsqueda
          const isInitialSearchMessage = typeof content === 'string' && (
            content.includes("realizaré una búsqueda") || 
            content.includes("buscaré información") ||
            (content.length < 200 && (
              content.includes("buscar") || 
              content.includes("búsqueda") ||
              content.includes("obtener información")
            ))
          );
          
          // Verificar si hay un mensaje siguiente del asistente (potencialmente la respuesta final)
          const nextMsg = index < filteredMessages.length - 1 ? filteredMessages[index + 1] : null;
          const hasFollowupAssistantMsg = nextMsg && nextMsg.role === "assistant";
          
          // Si es mensaje inicial de búsqueda y hay un mensaje siguiente del asistente, lo saltamos
          if (isInitialSearchMessage && hasFollowupAssistantMsg) {
            // No agregamos este mensaje, esperamos al siguiente mensaje del asistente
            return;
          }
          
          consolidatedMessages.push(msg);
        }
      });
      
      // 3. Procesar contenido de los mensajes consolidados
      const conversationMessages: Message[] = consolidatedMessages.map((msg) => {
        // NUEVA LÓGICA: Procesar contenido que no es string
        let processedContent = msg.content;
        
        // Si content es un array (formato de Claude para tools)
        if (Array.isArray(msg.content)) {
          // Extraer el contenido relevante de cada elemento del array
          processedContent = msg.content.map(item => {
            if (item.type === "tool_result" && typeof item.content === "string") {
              const shortContent = item.content.length > 100 
                ? `${item.content.substring(0, 100)}...` 
                : item.content;
              return `[Resultado de herramienta: ${shortContent}]`;
            }
            return JSON.stringify(item);
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
      });

      // Función interna para manejar los resultados de herramientas
      function handleToolResult(toolId: string, content: string) {
        // Extraer información de la herramienta del historial
        const toolCallMessage = rawMessages.find(msg => 
          msg.role === "assistant" && 
          (msg as any).tool_calls?.some((call: any) => call.id === toolId)
        ) as any;
        
        let agentName = "desconocido";
        let taskDescription = "Tarea sin descripción";
        
        if (toolCallMessage?.tool_calls) {
          const toolCall = toolCallMessage.tool_calls.find((call: any) => call.id === toolId);
          if (toolCall?.function?.name) {
            // Extraer nombre del agente
            agentName = toolCall.function.name;
            if (agentName.startsWith("transfer_task_to_")) {
              agentName = agentName.replace("transfer_task_to_", "");
            }
            
            // Extraer descripción de tarea
            try {
              if (toolCall.function?.arguments) {
                const args = JSON.parse(typeof toolCall.function.arguments === 'string'
                  ? toolCall.function.arguments
                  : JSON.stringify(toolCall.function.arguments));
                taskDescription = args.task_description || JSON.stringify(args);
              }
            } catch {
              taskDescription = toolCall.function?.arguments || "Tarea sin descripción";
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
      }

      // Almacenar tool_calls para procesarlos posteriormente
      const toolCalls: any[] = [];
      const toolResults: any[] = [];

      // Procesar mensajes para extraer tool_calls, tool_results y fuentes
      rawMessages.forEach(msg => {
        // Extraer tool_calls de mensajes del asistente
        if (msg.role === "assistant") {
          const assistantMsg = msg as any;
          
          // Modelo Claude
          if (assistantMsg.tool_calls && Array.isArray(assistantMsg.tool_calls)) {
            toolCalls.push(...assistantMsg.tool_calls);
          }
          
          // Modelo OpenAI - buscar en otras propiedades potenciales
          if (assistantMsg.tools && Array.isArray(assistantMsg.tools)) {
            // Filtrar solo las herramientas que son llamadas (no resultados)
            const callTools = assistantMsg.tools.filter((t: any) => 
              t.tool_name && t.tool_args && !t.content);
            
            if (callTools.length > 0) {
              toolCalls.push(...callTools);
            }
            
            // También buscar los resultados
            const resultTools = assistantMsg.tools.filter((t: any) => 
              t.tool_call_id && t.content);
            
            if (resultTools.length > 0) {
              toolResults.push(...resultTools);
            }
          }
        }
        
        // Extraer tool_results
        if (msg.role === "user" && Array.isArray((msg as any).content)) {
          const contents = (msg as any).content;
          contents.forEach((content: any) => {
            if (content.type === "tool_result" && content.tool_use_id && content.content) {
              toolResults.push(content);
            }
          });
        }
        
        // Procesar fuentes de mensajes "tool"
        if (msg.role === "tool") {
          processSourcesFromToolMessage(msg as ToolMessage, sessionData?.session_id);
        }
      });

      // Procesar tool_calls
      processToolCalls(toolCalls);
      
      // Procesar tool_results que no se procesaron en handleToolResult
      processToolResults(toolResults);

      setMessages(conversationMessages)
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
   */
  const sendMessage = useCallback(
    async (message: string, regenerate = false) => {
      try {
        setIsLoading(true)
        setCanStopResponse(true)
        // Reiniciar el estado de generación de tareas al enviar un nuevo mensaje
        setIsGeneratingTask(false)
        // Establecer el estado inicial de procesamiento
        setProcessingState("thinking");
        updateActivity();

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
                return;
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
              if (parsedData.content) {
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
                  // En otros casos, si es diferente, lo agregamos al existente
                  currentContentRef.current = finalContent;
                }
              }
              
              updateAssistantMessage(currentContentRef.current, "complete", regenerate)
              
              // Establecer el estado como completado
              setProcessingState("completing");
              setTimeout(() => {
                setProcessingState("idle");
              }, 500);
              
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
                const toolObj = parsedData.tools[0]; // Normalmente hay uno a la vez
                if (toolObj) {
                  processToolCalls([toolObj]);
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
                processToolResults(parsedData.tools);
              }
            }
            
            // 3. Procesar tool_calls en mensajes del asistente
            if (parsedData.messages && Array.isArray(parsedData.messages)) {
              parsedData.messages.forEach(msg => {
                if (msg.role === "assistant") {
                  const assistantMsg = msg as any;
                  
                  if (assistantMsg.tool_calls) {
                    processToolCalls(assistantMsg.tool_calls);
                  }
                }
                
                // Procesar tool_results en mensajes de usuario (formato especial)
                if (msg.role === "user" && Array.isArray((msg as any).content)) {
                  const userContent = (msg as any).content;
                  
                  // Verificar si todos los elementos son tool_result
                  const isToolResultsOnly = userContent.every((item: any) => 
                    item.type === "tool_result" && item.tool_use_id
                  );
                  
                  // Procesar los resultados de herramientas
                  processToolResults(userContent);
                  
                  // Si este mensaje es solo de resultados de herramientas, no debemos
                  // añadirlo como mensaje visible en la conversación
                  if (isToolResultsOnly) {
                    // No es necesario hacer nada aquí, simplemente no agregamos este mensaje
                    // a la lista de mensajes visibles, pero seguimos procesando sus tool_results
                  }
                }
                
                // Procesar mensajes "tool" para fuentes
                if (msg.role === "tool") {
                  processSourcesFromToolMessage(msg as ToolMessage, parsedData.session_id);
                }
              });
            }
            
            // 4. Procesar tool_calls directos del parsedData
            if (parsedData.tool_calls) {
              processToolCalls(parsedData.tool_calls);
            }
            
            // 5. Procesar herramientas del formato OpenAI
            if (parsedData.tools && Array.isArray(parsedData.tools)) {
              const toolCalls = parsedData.tools.filter(tool => 
                tool.tool_name && tool.tool_args && !tool.content);
              
              if (toolCalls.length > 0) {
                processToolCalls(toolCalls);
              }
              
              const toolResults = parsedData.tools.filter(tool => 
                tool.tool_call_id && tool.content);
              
              if (toolResults.length > 0) {
                processToolResults(toolResults);
              }
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
        // Asegurarse de restablecer el estado en caso de error
        setProcessingState("idle");
      } finally {
        setIsLoading(false)
        setCanStopResponse(false)
        // No reseteamos el estado aquí para permitir la transición visual
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
      processSourcesFromToolMessage
    ]
  )

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // Resetear el estado de procesamiento al cancelar
    setProcessingState("idle");
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
    processingState, // Exportamos el nuevo estado de procesamiento
    currentModel,    // Exportamos el modelo actual
    userSessions,
    deleteSession,
    renameSession,
    currentUserId,
    currentChatId,
    loadSession,
    createNewChat,
  }
}