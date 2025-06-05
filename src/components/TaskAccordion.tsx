// src/components/TaskAccordion.tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AgentTask } from "../hooks/useChat"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { Card } from "@/components/ui/card"

interface TaskAccordionProps {
  task: AgentTask
}

interface ParsedSource {
  name: string
  content: string
  meta_data?: {
    page?: number
    chunk?: number
    chunk_size?: number
  }
}

const TaskAccordion = ({ task }: TaskAccordionProps) => {
  const [expanded, setExpanded] = useState(false)
  
  // Intenta detectar si el resultado es JSON, y si es así, lo parsea
  const tryParseJSON = (jsonString: string): Record<string, unknown> | ParsedSource[] | null => {
    try {
      return JSON.parse(jsonString)
    } catch {
      return null
    }
  }
  
  // Función para renderizar una fuente de conocimiento
  const renderKnowledgeSource = (source: ParsedSource, index: number) => {
    return (
      <Card key={`${source.name}_${index}_${source.meta_data?.page ?? ''}`} className="p-3 mb-2 text-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-bold">{source.name}</span>
            {source.meta_data?.page && (
              <span className="ml-2 text-muted-foreground">
                Página {source.meta_data.page}
              </span>
            )}
            {source.meta_data?.chunk && (
              <span className="ml-1 text-muted-foreground">
                (Fragmento {source.meta_data.chunk})
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 text-muted-foreground">
          <p className="whitespace-pre-line leading-relaxed">
            {source.content.length > 500 ? `${source.content.substring(0, 500)}...` : source.content}
          </p>
        </div>
      </Card>
    )
  }
  
  // Procesar la consulta de pensamiento
  const processThinkingQuery = (taskText: string): string => {
    // Verificar si es una tarea de tipo "think"
    if (task.agent === "think") {
      try {
        const parsed = tryParseJSON(taskText);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (typeof parsed.thought === 'string') {
            return parsed.thought;
          }
          if (typeof parsed.title === 'string') {
            return parsed.title;
          }
        }
      } catch {}
    }
    return taskText;
  }

  // Procesar el resultado de pensamiento
  const processThinkingResult = (resultText: string): string => {
    // Si es un resultado de pensamiento que comienza con "Thoughts:"
    if (task.agent === "think" && resultText.startsWith("Thoughts:")) {
      // Eliminar el prefijo "Thoughts:" y limpiar espacios extras
      return resultText.replace("Thoughts:", "").trim();
    }
    return resultText;
  }
  
  // Para tareas de búsqueda de conocimiento, renderiza las fuentes de forma especial
  const renderTaskResult = () => {
    // Verifica si la tarea es una búsqueda de conocimiento y tiene un resultado que parece ser JSON
    if (task.agent.includes("search_knowledge") || 
        task.agent.includes("agente_buscador") || 
        task.agent.includes("busqueda_profunda") || 
        task.task.includes("search_knowledge") || 
        task.task.includes("busqueda_profunda") ||
        task.task.includes("buscar") ||
        task.task.includes("asearch_knowledge_base")) {
      
      const parsedResult = tryParseJSON(task.result)
      
      // Si es un array de fuentes (formato esperado)
      if (Array.isArray(parsedResult)) {
        return (
          <div className="space-y-3">
            <p className="font-medium text-xs">Se encontraron {parsedResult.length} fuentes relevantes:</p>
            {parsedResult.map((source, index) => renderKnowledgeSource(source as ParsedSource, index))}
          </div>
        )
      }
      
      // Si es un objeto con información de sitio web (formato alternativo)
      if (parsedResult && typeof parsedResult === 'object' && !Array.isArray(parsedResult)) {
        // Verificar si tiene estructura de respuesta de búsqueda web
        if (parsedResult.site && typeof parsedResult.site === 'string') {
          return (
            <div className="space-y-3">
              <div className="text-xs">
                <p className="font-medium mb-2">Resultado de búsqueda web:</p>
                <Card className="p-3">
                  <div className="mb-2">
                    <span className="font-bold text-xs">Sitio:</span>
                    <span className="ml-2 text-xs text-muted-foreground">{parsedResult.site}</span>
                  </div>
                  {parsedResult.Summary && (
                    <div className="mb-2">
                      <span className="font-bold text-xs">Resumen:</span>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {typeof parsedResult.Summary === 'string' ? parsedResult.Summary : JSON.stringify(parsedResult.Summary)}
                      </p>
                    </div>
                  )}
                  {parsedResult.content && (
                    <div>
                      <span className="font-bold text-xs">Contenido:</span>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        {typeof parsedResult.content === 'string' 
                          ? (parsedResult.content.length > 800 ? `${parsedResult.content.substring(0, 800)}...` : parsedResult.content)
                          : JSON.stringify(parsedResult.content)
                        }
                      </p>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )
        }
        
        // Para otros tipos de objetos, intentar mostrar las propiedades más relevantes
        const keys = Object.keys(parsedResult);
        if (keys.length > 0) {
          return (
            <div className="space-y-2">
              <p className="font-medium text-xs">Resultado de búsqueda:</p>
              <Card className="p-3">
                {keys.slice(0, 5).map((key) => (
                  <div key={key} className="mb-2 last:mb-0">
                    <span className="font-bold text-xs">{key}:</span>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                      {typeof parsedResult[key] === 'string' 
                        ? (parsedResult[key].length > 300 ? `${parsedResult[key].substring(0, 300)}...` : parsedResult[key])
                        : JSON.stringify(parsedResult[key])
                      }
                    </p>
                  </div>
                ))}
              </Card>
            </div>
          )
        }
      }
    }
    
    // Para otros tipos de tareas o si no se pudo parsear el JSON, muestra el resultado como Markdown
    return (
      <div className="text-muted-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {processThinkingResult(task.result)}
        </ReactMarkdown>
      </div>
    )
  }
  
  // Genera un resumen corto (primeras 100 caracteres) del resultado para mostrar cuando no está expandido
  const getSummary = () => {
    // Si es una tarea de tipo "think", mostrar un resumen personalizado
    if (task.agent === "think") {
      try {
        const parsed = tryParseJSON(task.task);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (typeof parsed.thought === 'string') {
            const thought = parsed.thought;
            return thought.length > 100
              ? thought.slice(0, 100).trim() + "..."
              : thought;
          }
          if (typeof parsed.title === 'string') {
            return parsed.title;
          }
        }
      } catch {}
    }
    
    // Si es una tarea de búsqueda de conocimiento, muestra un resumen personalizado
    if (task.agent.includes("search_knowledge") || 
        task.agent.includes("agente_buscador") || 
        task.agent.includes("busqueda_profunda") || 
        task.task.includes("search_knowledge") || 
        task.task.includes("busqueda_profunda") ||
        task.task.includes("buscar") ||
        task.task.includes("asearch_knowledge_base")) {
      
      const parsedResult = tryParseJSON(task.result)
      if (Array.isArray(parsedResult)) {
        return `Se encontraron ${parsedResult.length} fuentes en la base de conocimiento.`
      }
      if (parsedResult && typeof parsedResult === 'object') {
        if (parsedResult.site) {
          return `Búsqueda web en: ${parsedResult.site}`
        }
        return "Resultado de búsqueda procesado."
      }
    }
    
    // Para otras tareas, muestra las primeras 100 caracteres
    const processedResult = task.agent === "think" 
      ? processThinkingResult(task.result)
      : task.result;
      
    return processedResult.length > 100
      ? processedResult.slice(0, 100).trim() + "..."
      : processedResult;
  }

  // Obtiene un título representativo para la tarea basado en el agente y contenido
  const getTaskTitle = () => {
    if (task.agent === "think") {
      return "Proceso de Razonamiento";
    }
    
    if (task.agent.includes("search_knowledge") || task.task.includes("asearch_knowledge_base")) {
      return "Búsqueda en Base de Conocimiento";
    }

    if (task.agent.includes("agente_buscador") || task.agent.includes("buscador")) {
      return "Búsqueda en la Web";
    }

    if (task.agent.includes("busqueda_profunda") || task.agent.includes("profunda")) {
      return "Búsqueda Profunda en la Web";
    }
    
    if (task.agent.includes("agente_legal") || task.agent.includes("legal")) {
      return "Consulta Legal";
    }
    
    // Si hay texto "transfer_task_to_" en el agente, formatearlo mejor
    if (task.agent.includes("transfer_task_to_") || task.agent.includes("atransfer_task_to_")) {
      const agentName = task.agent.replace("transfer_task_to_", "").replace("atransfer_task_to_", "");
      return `Transferencia a: ${agentName}`;
    }
    
    return `Tarea del agente: ${task.agent}`;
  }
  
  // Extrae la consulta efectiva de la tarea
  const getTaskQuery = () => {
    // Manejar específicamente las tareas de tipo "think"
    if (task.agent === "think") {
      return processThinkingQuery(task.task);
    }
    
    // Si la tarea incluye parámetros en formato JSON, intenta extraer la consulta
    if (task.task.includes("{\"query\":") || task.task.includes("\"query\":")) {
      const parsed = tryParseJSON(task.task);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (typeof parsed.query === 'string') {
          return parsed.query;
        }
      }
    }

    // Para OpenAI, la consulta puede estar en task_description
    if (task.task.includes("task_description")) {
      const parsed = tryParseJSON(task.task);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        if (typeof parsed.task_description === 'string') {
          return parsed.task_description;
        }
      }
    }
    
    // Si no pudimos extraer, devolvemos la tarea original (pero limitada)
    return task.task.length > 200 ? `${task.task.substring(0, 200)}...` : task.task;
  }

  return (
    <div className="border-b border-border pb-3 mb-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-xs md:text-sm">
            {getTaskTitle()}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">
            {new Date(task.timestamp).toLocaleString()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs transition-transform duration-200 hover:scale-105 active:scale-95"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Mostrar menos" : "Ver detalles"}
        </Button>
      </div>
      <div className="mt-2 text-xs">
        <p className="font-medium mb-1">Consulta:</p>
        <p className="text-muted-foreground mb-2 leading-relaxed">{getTaskQuery()}</p>
        <p className="font-medium mb-1">Resultado:</p>
        {expanded ? renderTaskResult() : <p className="text-muted-foreground leading-relaxed">{getSummary()}</p>}
      </div>
    </div>
  )
}

export default TaskAccordion