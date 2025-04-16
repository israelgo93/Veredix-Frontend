// src/lib/toolProcessors.ts
import type { ToolCall, AgentTask, ProcessingState } from "../hooks/types";

/**
 * Procesa las llamadas a herramientas
 */
export function processToolCalls(
  toolCalls: Array<ToolCall> | undefined,
  pendingToolCalls: Map<string, {agent: string, task: string}>,
  setIsGeneratingTask: (value: boolean) => void,
  setProcessingState: (state: ProcessingState) => void,
  updateActivity: () => void
): void {
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
        pendingToolCalls.set(callId, {
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
}

/**
 * Procesa los resultados de herramientas
 */
export function processToolResults(
  toolResults: Array<Record<string, unknown>> | undefined,
  pendingToolCalls: Map<string, {agent: string, task: string}>,
  setProcessingState: (state: ProcessingState) => void,
  setIsGeneratingTask: (value: boolean) => void,
  updateActivity: () => void,
  setAgentTasks: (updater: (prev: AgentTask[]) => AgentTask[]) => void
): void {
  try {
    if (!toolResults || !Array.isArray(toolResults) || toolResults.length === 0) return;
    
    let resultsProcessed = false;
    
    // Función interna para manejar los resultados de herramientas
    const handleToolResult = (toolId: string, content: string, toolName?: string) => {
      try {
        const pendingCall = pendingToolCalls.get(toolId);
        
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
          pendingToolCalls.delete(toolId);
          
          // Si ya no hay tareas pendientes, desactivar el indicador de generación de tareas
          if (pendingToolCalls.size === 0) {
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
    if (resultsProcessed && pendingToolCalls.size > 0) {
      setProcessingState("waiting_result");
      updateActivity();
    }
  } catch (error) {
    console.error("Error in processToolResults:", error);
    // Intentar recuperarse
    if (pendingToolCalls.size === 0) {
      setIsGeneratingTask(false);
      setProcessingState("resuming");
    } else {
      setProcessingState("waiting_result");
    }
    updateActivity();
  }
}

/**
 * Procesa los tool_calls para un mensaje al cargar una sesión
 */
export function processHistoricalToolResult(
  toolId: string,
  content: string,
  rawMessages: Array<any>,
  setAgentTasks: (updater: (prev: AgentTask[]) => AgentTask[]) => void
): void {
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
}