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
  const tryParseJSON = (jsonString: string): any => {
    try {
      return JSON.parse(jsonString)
    } catch (e) {
      return null
    }
  }
  
  // Función para renderizar una fuente de conocimiento
  const renderKnowledgeSource = (source: ParsedSource) => {
    return (
      <Card key={source.name + source.meta_data?.page} className="p-3 mb-2 text-xs">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-bold">{source.name}</span>
            {source.meta_data?.page && (
              <span className="ml-2 text-muted-foreground">
                Página {source.meta_data.page}
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 text-muted-foreground">
          <p className="whitespace-pre-line">{source.content}</p>
        </div>
      </Card>
    )
  }
  
  // Para tareas de búsqueda de conocimiento, renderiza las fuentes de forma especial
  const renderTaskResult = () => {
    // Verifica si la tarea es una búsqueda de conocimiento y tiene un resultado que parece ser JSON
    if (task.agent.includes("search_knowledge") || 
        task.agent.includes("agente_buscador") || 
        task.task.includes("search_knowledge") || 
        task.task.includes("buscar")) {
      
      const parsedResult = tryParseJSON(task.result)
      
      if (Array.isArray(parsedResult)) {
        return (
          <div className="space-y-3">
            <p className="font-medium text-xs">Se encontraron {parsedResult.length} fuentes relevantes:</p>
            {parsedResult.map((source, index) => renderKnowledgeSource(source))}
          </div>
        )
      }
    }
    
    // Para otros tipos de tareas o si no se pudo parsear el JSON, muestra el resultado como Markdown
    return (
      <div className="text-muted-foreground">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {task.result}
        </ReactMarkdown>
      </div>
    )
  }
  
  // Genera un resumen corto (primeras 100 caracteres) del resultado para mostrar cuando no está expandido
  const getSummary = () => {
    // Si es una tarea de búsqueda de conocimiento, muestra un resumen personalizado
    if (task.agent.includes("search_knowledge") || 
        task.agent.includes("agente_buscador") || 
        task.task.includes("search_knowledge") || 
        task.task.includes("buscar")) {
      
      const parsedResult = tryParseJSON(task.result)
      if (Array.isArray(parsedResult)) {
        return `Se encontraron ${parsedResult.length} fuentes en la base de conocimiento.`
      }
    }
    
    // Para otras tareas, muestra las primeras 100 caracteres
    return task.result.length > 100
      ? task.result.slice(0, 100).trim() + "..."
      : task.result
  }

  // Obtiene un título representativo para la tarea basado en el agente y contenido
  const getTaskTitle = () => {
    if (task.agent.includes("search_knowledge") || task.agent.includes("agente_buscador")) {
      return "Búsqueda en base de conocimiento";
    }
    
    if (task.agent.includes("legal")) {
      return "Consulta legal";
    }
    
    // Si hay texto "transfer_task_to_" en el agente, formatearlo mejor
    if (task.agent.includes("transfer_task_to_")) {
      const agentName = task.agent.replace("transfer_task_to_", "");
      return `Tarea del agente: ${agentName}`;
    }
    
    return `Tarea del agente: ${task.agent}`;
  }
  
  // Extrae la consulta efectiva de la tarea
  const getTaskQuery = () => {
    // Si la tarea incluye parámetros en formato JSON, intenta extraer la consulta
    if (task.task.includes("{\"query\":")) {
      const parsed = tryParseJSON(task.task);
      if (parsed && parsed.query) {
        return parsed.query;
      }
    }

    // Para OpenAI, la consulta puede estar en task_description
    if (task.task.includes("task_description")) {
      const parsed = tryParseJSON(task.task);
      if (parsed && parsed.task_description) {
        return parsed.task_description;
      }
    }
    
    // Si no pudimos extraer, devolvemos la tarea original
    return task.task;
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
        <p className="text-muted-foreground mb-2">{getTaskQuery()}</p>
        <p className="font-medium mb-1">Resultado:</p>
        {expanded ? renderTaskResult() : <p className="text-muted-foreground">{getSummary()}</p>}
      </div>
    </div>
  )
}

export default TaskAccordion