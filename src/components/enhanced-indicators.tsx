// src/components/enhanced-indicators.tsx
"use client"

import { useState, useEffect } from "react"
import { Loader2, ArrowRight, Database, AlertCircle, Brain, GitBranch, HardDrive, Users } from 'lucide-react'
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
  
  // Mapeo de estados a mensajes y animaciones (incluyendo nuevos estados de teams)
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
    reasoning: {
      message: "Razonando",
      indicator: <Brain className="h-3 w-3 text-purple-500 animate-pulse" />
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
    },
    updating_memory: {
      message: "Actualizando memoria",
      indicator: <HardDrive className="h-3 w-3 text-blue-500 animate-pulse" />
    },
    workflow_running: {
      message: "Ejecutando flujo de trabajo",
      indicator: <GitBranch className="h-3 w-3 text-green-500 animate-pulse" />
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

// Indicador específico para reasoning
export const ReasoningIndicator = () => {
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
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-purple-500 dark:text-purple-400">
      <Brain className="h-3 w-3 animate-pulse" />
      <span>Proceso de razonamiento{dots}</span>
    </div>
  )
}

// Indicador para equipos colaborando
export const TeamCollaborationIndicator = () => {
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
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-green-500 dark:text-green-400">
      <Users className="h-3 w-3 animate-pulse" />
      <span>Coordinando equipo{dots}</span>
    </div>
  )
}

// Indicador para actualización de memoria
export const MemoryUpdateIndicator = () => {
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
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-blue-600 dark:text-blue-400">
      <HardDrive className="h-3 w-3 animate-pulse" />
      <span>Actualizando contexto{dots}</span>
    </div>
  )
}

// Indicador para flujos de trabajo
export const WorkflowIndicator = () => {
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
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-green-600 dark:text-green-400">
      <GitBranch className="h-3 w-3 animate-pulse" />
      <span>Ejecutando workflow{dots}</span>
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
  
  // Indicadores específicos para nuevos estados de teams
  switch (state) {
    case "reasoning":
      return <ReasoningIndicator />;
    case "updating_memory":
      return <MemoryUpdateIndicator />;
    case "workflow_running":
      return <WorkflowIndicator />;
    default:
      break;
  }
  
  // Si estamos generando una tarea, usamos el indicador específico de tareas
  if (isGeneratingTask) {
    return <TaskIndicator />;
  }
  
  // Para estados específicos, usamos el indicador de procesamiento con información detallada
  return <ProcessingIndicator state={state} model={model} />;
}

// Indicador compuesto que puede mostrar múltiples estados
export const MultiStateIndicator = ({ 
  states,
  model 
}: { 
  states: ProcessingState[],
  model: string | null 
}) => {
  const [dots, setDots] = useState("")
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return ""
        return prev + "."
      })
    }, 500)
    
    return () => clearInterval(interval)
  }, [])

  // Filtrar estados idle
  const activeStates = states.filter(state => state !== "idle");
  
  if (activeStates.length === 0) {
    return null;
  }
  
  // Si solo hay un estado, usar el indicador simple
  if (activeStates.length === 1) {
    return <ProcessingIndicator state={activeStates[0]} model={model} />;
  }
  
  // Para múltiples estados, mostrar un indicador combinado
  return (
    <div className="flex items-center space-x-2 px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400">
      <div className="flex space-x-1">
        {activeStates.slice(0, 3).map((state, index) => (
          <div key={state} className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" 
               style={{ animationDelay: `${index * 200}ms` }} />
        ))}
      </div>
      <span className="font-light">
        Procesando múltiples tareas{dots}
      </span>
    </div>
  );
}

// Hook para gestionar estados de procesamiento complejos
export const useProcessingStates = () => {
  const [states, setStates] = useState<ProcessingState[]>([]);
  
  const addState = (state: ProcessingState) => {
    setStates(prev => {
      if (!prev.includes(state)) {
        return [...prev, state];
      }
      return prev;
    });
  };
  
  const removeState = (state: ProcessingState) => {
    setStates(prev => prev.filter(s => s !== state));
  };
  
  const clearStates = () => {
    setStates([]);
  };
  
  const hasState = (state: ProcessingState) => {
    return states.includes(state);
  };
  
  return {
    states,
    addState,
    removeState,
    clearStates,
    hasState,
    activeStatesCount: states.filter(s => s !== "idle").length
  };
}