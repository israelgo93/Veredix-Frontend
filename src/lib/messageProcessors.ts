// src/lib/messageProcessors.ts
import type { ApiResponse, Message, ToolMessage, Source, ReasoningStep } from "../hooks/types";

/**
 * Procesa un chunk de texto para extraer objetos JSON válidos
 */
export function processJsonObjects(
  text: string,
  bufferRef: { current: string },
  lastValidChunkRef: { current: string },
  retryCountRef: { current: number },
  maxRetries: number = 3,
  setCurrentModel?: (model: string) => void,
  currentModel?: string | null
): ApiResponse[] {
  const jsonObjects: ApiResponse[] = [];
  
  try {
    // Guardar el último chunk válido para recuperación 
    if (text.trim().length > 0) {
      lastValidChunkRef.current = text;
    }

    // Concatenar el nuevo texto al buffer existente
    bufferRef.current += text;

    let startIndex = 0;
    while (true) {
      // Buscar el inicio de un posible objeto JSON
      const openBraceIndex = bufferRef.current.indexOf("{", startIndex);
      if (openBraceIndex === -1) break;

      // Contar llaves para encontrar el objeto JSON completo
      let braceCount = 1;
      let endIndex = openBraceIndex + 1;

      // Buscar el final del objeto JSON
      while (braceCount > 0 && endIndex < bufferRef.current.length) {
        if (bufferRef.current[endIndex] === "{") braceCount++;
        if (bufferRef.current[endIndex] === "}") braceCount--;
        endIndex++;
      }

      // Si se encontró un objeto JSON completo
      if (braceCount === 0) {
        try {
          const jsonString = bufferRef.current.slice(openBraceIndex, endIndex).trim();
          const parsed = JSON.parse(jsonString) as ApiResponse;
          
          // Validar que sea una ApiResponse válida
          if (parsed.event && parsed.content !== undefined) {
            jsonObjects.push(parsed);
            
            // Identificar el modelo basado en la respuesta (teams o agents)
            if (setCurrentModel && parsed.model && !currentModel) {
              if (parsed.model.includes("claude")) {
                setCurrentModel("claude");
              } else if (parsed.model.includes("o3-") || parsed.model.includes("gpt-")) {
                setCurrentModel("openai");
              }
            }
            
            // Reiniciar el contador de reintentos si hemos procesado algo correctamente
            retryCountRef.current = 0;
          }
          
          // Actualizar el índice de inicio para seguir buscando
          startIndex = endIndex;
        } catch (error) {
          // Si hay un error de análisis, avanzar e intentar con el siguiente
          console.warn("Error parsing JSON:", error);
          startIndex = openBraceIndex + 1;
        }
      } else {
        // Si el objeto no está completo, salir del bucle
        break;
      }
    }

    // Conservar solo la parte del buffer que podría contener JSON incompleto
    bufferRef.current = bufferRef.current.slice(startIndex);
    
    return jsonObjects;
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
}

/**
 * Actualiza el mensaje del asistente con el contenido proporcionado
 */
export function updateAssistantMessage(
  messages: Message[],
  content: string, 
  status: "thinking" | "responding" | "complete" = "responding", 
  regenerate = false
): Message[] {
  try {
    const newMessages = [...messages];
    const lastAssistantIndex = regenerate
      ? newMessages.findLastIndex((m) => m.role === "assistant")
      : newMessages.length - 1;

    // Manejar caso especial: contenido vacío en estado "responding"
    if (content.trim() === "" && status === "responding") {
      // No actualizar con contenido vacío a menos que sea "thinking" o "complete"
      if (lastAssistantIndex !== -1 && newMessages[lastAssistantIndex].role === "assistant") {
        // Solo actualizar el estado, mantener el contenido anterior
        newMessages[lastAssistantIndex] = {
          ...newMessages[lastAssistantIndex],
          status,
        };
      } else if (!regenerate) {
        // Si necesitamos un nuevo mensaje pero el contenido está vacío,
        // crear uno con un espacio o placeholder
        newMessages.push({ role: "assistant", content: " ", status });
      }
      return newMessages;
    }

    // Caso normal: actualizar mensaje existente o crear uno nuevo
    if (lastAssistantIndex !== -1 && newMessages[lastAssistantIndex].role === "assistant") {
      newMessages[lastAssistantIndex] = {
        ...newMessages[lastAssistantIndex],
        content,
        status,
      };
    } else if (!regenerate) {
      newMessages.push({ role: "assistant", content, status });
    }

    return newMessages;
  } catch (error) {
    console.error("Error in updateAssistantMessage:", error);
    // En caso de error, intentar una actualización mínima
    return messages.concat({ 
      role: "assistant", 
      content: content || "Error al actualizar mensaje", 
      status 
    });
  }
}

/**
 * Procesa fuentes desde respuestas de herramientas
 */
export function processSourcesFromToolMessage(
  message: ToolMessage, 
  currentChatId: string | null,
  sessionId?: string, 
  processedToolIds?: Set<string>
): Source[] {
  try {
    const toolId = message.tool_call_id;
    const topLevelSessionId = sessionId || currentChatId;
    const toolSessionId = message.session_id || topLevelSessionId;
    const newSources: Source[] = [];
    
    // Solo procesar si el session_id coincide o no hay restricción
    if (currentChatId && toolSessionId && toolSessionId !== currentChatId) {
      return newSources;
    }
    
    // Evitar procesar el mismo toolId más de una vez si existe
    if (toolId && processedToolIds && processedToolIds.has(toolId)) {
      return newSources;
    }
    
    // Verificar si el contenido parece JSON antes de intentar parsearlo
    const content = typeof message.content === 'string' ? message.content.trim() : '';
    if (!content || content.length === 0) {
      return newSources;
    }
    
    if ((content.startsWith('{') && content.endsWith('}')) || 
        (content.startsWith('[') && content.endsWith(']'))) {
      try {
        const parsedSources = JSON.parse(content) as Source[];
        
        if (Array.isArray(parsedSources)) {
          newSources.push(...parsedSources);
          
          // Registrar que ya procesamos este tool_id
          if (toolId && processedToolIds) {
            processedToolIds.add(toolId);
          }
        }
      } catch (parseError) {
        console.warn("Error parsing tool message content for sources:", parseError);
      }
    } else {
      console.log("El contenido no parece ser JSON válido, se omite el parseo");
    }
    
    return newSources;
  } catch (error) {
    console.error("Error in processSourcesFromToolMessage:", error);
    return [];
  }
}

/**
 * Procesa reasoning steps desde las respuestas de la API
 */
export function processReasoningSteps(
  apiResponse: ApiResponse,
  setReasoningSteps: (updater: (prev: ReasoningStep[]) => ReasoningStep[]) => void
): void {
  try {
    // Procesar reasoning steps desde extra_data
    if (apiResponse.extra_data?.reasoning_steps && Array.isArray(apiResponse.extra_data.reasoning_steps)) {
      setReasoningSteps(prev => {
        const newSteps = [...prev];
        apiResponse.extra_data!.reasoning_steps!.forEach(step => {
          const existingIndex = newSteps.findIndex(s => s.title === step.title);
          if (existingIndex !== -1) {
            newSteps[existingIndex] = step;
          } else {
            newSteps.push(step);
          }
        });
        return newSteps;
      });
    }

    // Procesar reasoning step individual desde content (cuando event es ReasoningStep)
    if (apiResponse.event === "ReasoningStep" && apiResponse.content && typeof apiResponse.content === 'object') {
      const step = apiResponse.content as ReasoningStep;
      setReasoningSteps(prev => {
        const newSteps = [...prev];
        const existingIndex = newSteps.findIndex(s => s.title === step.title);
        if (existingIndex !== -1) {
          newSteps[existingIndex] = step;
        } else {
          newSteps.push(step);
        }
        return newSteps;
      });
    }
  } catch (error) {
    console.error("Error processing reasoning steps:", error);
  }
}

/**
 * Procesa formatted tool calls desde las respuestas de la API de teams
 */
export function processFormattedToolCalls(
  formattedToolCalls: string[] | undefined,
  setAgentTasks: (updater: (prev: any[]) => any[]) => void
): void {
  try {
    if (!formattedToolCalls || !Array.isArray(formattedToolCalls)) {
      return;
    }

    formattedToolCalls.forEach((toolCallStr, index) => {
      try {
        // Parsear el string de tool call formateado
        // Ejemplo: "think(title=Identificando la consulta del usuario, thought=El usuario me está preguntando...)"
        const match = toolCallStr.match(/^(\w+)\((.*)\)$/);
        if (!match) return;

        const [, toolName, argsStr] = match;
        
        // Crear una tarea básica desde el tool call formateado
        const taskId = `formatted_${Date.now()}_${index}`;
        const newTask = {
          id: taskId,
          agent: toolName,
          task: argsStr,
          result: "Ejecutando...",
          timestamp: new Date().toISOString()
        };

        setAgentTasks(prev => {
          const exists = prev.some(task => task.id === newTask.id);
          if (!exists) {
            return [...prev, newTask];
          }
          return prev;
        });
      } catch (toolCallError) {
        console.warn("Error processing formatted tool call:", toolCallError);
      }
    });
  } catch (error) {
    console.error("Error in processFormattedToolCalls:", error);
  }
}

/**
 * Procesa member responses desde las respuestas de la API de teams
 */
export function processMemberResponses(
  memberResponses: any[] | undefined,
  setAgentTasks: (updater: (prev: any[]) => any[]) => void
): void {
  try {
    if (!memberResponses || !Array.isArray(memberResponses)) {
      return;
    }

    memberResponses.forEach((response, index) => {
      try {
        const taskId = `member_${response.member_id || index}_${Date.now()}`;
        const newTask = {
          id: taskId,
          agent: response.member_id || `member_${index}`,
          task: response.request || "Tarea de miembro del equipo",
          result: response.response || response.content || "Respuesta procesada",
          timestamp: new Date().toISOString()
        };

        setAgentTasks(prev => {
          const exists = prev.some(task => task.id === newTask.id);
          if (!exists) {
            return [...prev, newTask];
          }
          return prev;
        });
      } catch (memberError) {
        console.warn("Error processing member response:", memberError);
      }
    });
  } catch (error) {
    console.error("Error in processMemberResponses:", error);
  }
}

/**
 * Procesa reasoning content desde las respuestas de la API
 */
export function processReasoningContent(
  reasoningContent: string | undefined,
  setReasoningSteps: (updater: (prev: ReasoningStep[]) => ReasoningStep[]) => void
): void {
  try {
    if (!reasoningContent || typeof reasoningContent !== 'string') {
      return;
    }

    // Parsear el reasoning content que viene en formato markdown
    // Ejemplo: "## Identificando la consulta del usuario\nEl usuario me está preguntando..."
    const sections = reasoningContent.split('##').filter(section => section.trim());
    
    sections.forEach((section, index) => {
      try {
        const lines = section.trim().split('\n');
        if (lines.length === 0) return;

        const title = lines[0].trim();
        const content = lines.slice(1).join('\n').trim();
        
        // Extraer información específica del contenido
        let action = null;
        let confidence = 1.0;
        
        const actionMatch = content.match(/Action:\s*(.+)/);
        if (actionMatch) {
          action = actionMatch[1].trim();
        }
        
        const confidenceMatch = content.match(/Confidence:\s*([0-9.]+)/);
        if (confidenceMatch) {
          confidence = parseFloat(confidenceMatch[1]);
        }

        const step: ReasoningStep = {
          title,
          action,
          result: null,
          reasoning: content,
          next_action: "continue",
          confidence
        };

        setReasoningSteps(prev => {
          const newSteps = [...prev];
          const existingIndex = newSteps.findIndex(s => s.title === step.title);
          if (existingIndex !== -1) {
            newSteps[existingIndex] = step;
          } else {
            newSteps.push(step);
          }
          return newSteps;
        });
      } catch (sectionError) {
        console.warn("Error processing reasoning section:", sectionError);
      }
    });
  } catch (error) {
    console.error("Error in processReasoningContent:", error);
  }
}