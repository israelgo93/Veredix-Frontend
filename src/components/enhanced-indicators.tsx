// src/components/enhanced-indicators.tsx
"use client"

import { useState, useEffect } from "react"
import { Loader2, ArrowRight, Database, AlertCircle, Brain } from 'lucide-react'
import type { ProcessingState } from "../hooks/types"

// Indicador minimalista para mostrar diferentes estados de procesamiento
export const ProcessingIndicator = ({ 
  state, 
  model 
}: { 
  state: ProcessingState,
  model?: string | null 
}) => {
  const [dots, setDots] = useState("")
  
  // Mapeo de estados a mensajes y animaciones
  const stateMap: Record<ProcessingState, { 
    message: string,
    indicator: React.ReactNode
  }> = {
    idle: { 
      message: "", 
      indicator: null
    },
    thinking: { 
      message: "Pensando", 
      indicator: <Brain className="h-3 w-3 text-zinc-400 animate-pulse" />
    },
    streaming: { 
      message: "Respondiendo", 
      indicator: <Loader2 className="h-3 w-3 animate-spin" />
    },
    tool_calling: { 
      message: "Iniciando tarea", 
      indicator: <div className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse"></div>
    },
    tool_processing: { 
      message: model === "openai" ? "Procesando información" : "Ejecutando agente", 
      indicator: <div className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse"></div>
    },
    waiting_result: { 
      message: "Consultando datos", 
      indicator: <Database className="h-3 w-3 animate-pulse" />
    },
    analyzing: { 
      message: "Analizando resultados", 
      indicator: <AlertCircle className="h-3 w-3 animate-pulse" />
    },
    resuming: { 
      message: "Generando respuesta", 
      indicator: <ArrowRight className="h-3 w-3 animate-pulse" />
    },
    completing: { 
      message: "Finalizando", 
      indicator: <Loader2 className="h-3 w-3 animate-spin" />
    }
  }
  
  useEffect(() => {
    // Animar puntos cada 500ms
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ""
        return prev + "."
      })
    }, 500)
    
    return () => clearInterval(interval)
  }, [])
  
  // Para estados "idle", no mostramos nada
  if (state === "idle") {
    return null
  }
  
  const { message, indicator } = stateMap[state]
  
  return (
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400 transition-opacity duration-300">
      <div className="flex-shrink-0">
        {indicator}
      </div>
      <span className="font-light">{message}{dots}</span>
    </div>
  )
}

// Indicador para tareas de agente, más compacto y simple
export const TaskIndicator = () => {
  const [dots, setDots] = useState("")
  
  useEffect(() => {
    // Animar puntos cada 500ms
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ""
        return prev + "."
      })
    }, 500)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-blue-500 dark:text-blue-400">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      <span>Consultando fuentes{dots}</span>
    </div>
  )
}

// Componente que selecciona el indicador adecuado según el estado
export const SmartProcessingIndicator = ({ 
  state, 
  isGeneratingTask,
  model 
}: { 
  state: ProcessingState, 
  isGeneratingTask: boolean,
  model: string | null 
}) => {
  // Para mensajes en estado "idle", no mostramos nada
  if (state === "idle") {
    return null;
  }
  
  // Si estamos generando una tarea, usamos el indicador específico de tareas
  if (isGeneratingTask) {
    return <TaskIndicator />;
  }
  
  // Para estados específicos, usamos el indicador de procesamiento con información detallada
  return <ProcessingIndicator state={state} model={model} />;
}