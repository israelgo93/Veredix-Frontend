// src/components/enhanced-indicators.tsx
"use client"

import { useState, useEffect } from "react"
import { Circle, Loader2, ArrowRight, Database, AlertCircle } from 'lucide-react'
import type { ProcessingState } from "../hooks/useChat"

// Indicador que muestra diferentes mensajes según la etapa general
export const MultiStageIndicator = () => {
  const multiStages = [
    "Procesando",
    "Analizando",
    "Razonando",
    "Preparando respuesta",
  ]
  const [stageIndex, setStageIndex] = useState(0)
  const [dots, setDots] = useState("")
  
  useEffect(() => {
    // Cambiar etapa cada 2.5 segundos
    const stageInterval = setInterval(() => {
      setStageIndex((prev) => (prev + 1) % multiStages.length)
    }, 2500)
    
    // Animar puntos cada 500ms
    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ""
        return prev + "."
      })
    }, 500)
    
    return () => {
      clearInterval(stageInterval)
      clearInterval(dotsInterval)
    }
  }, [multiStages.length])
  
  return (
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
      <div className="animate-pulse">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
      <span>{multiStages[stageIndex]}{dots}</span>
    </div>
  )
}

// Indicador para tareas de agente
export const TaskGenerationIndicator = () => {
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
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
      <span>Consultando fuentes{dots}</span>
    </div>
  )
}

// Indicador avanzado que muestra diferentes estados basados en processingState
interface ProcessingIndicatorProps {
  state: ProcessingState
  model?: string | null
}

export const ProcessingIndicator = ({ state, model }: ProcessingIndicatorProps) => {
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
      indicator: <Circle className="h-3 w-3 fill-zinc-400 animate-pulse" />
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

// Componente que muestra un indicador contextual según el estado actual
// y es compatible con ambos modelos
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
    return <TaskGenerationIndicator />;
  }
  
  // Para estados transicionales donde necesitamos un indicador genérico multi-etapa
  if (state === "thinking") {
    return <MultiStageIndicator />;
  }
  
  // Para estados específicos, usamos el indicador de procesamiento con información detallada
  return <ProcessingIndicator state={state} model={model} />;
}