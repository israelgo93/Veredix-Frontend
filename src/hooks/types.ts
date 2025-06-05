/// src/hooks/types.ts

export interface Message {
  role: "user" | "assistant"
  content: string | Record<string, unknown> | Array<Record<string, unknown>>
  status?: "thinking" | "responding" | "complete"
  tool_call_id?: string
  [key: string]: unknown  // Añadida index signature para compatibilidad
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

export interface ToolResultItem {
  type: string;
  content: string | Record<string, unknown>;
  tool_use_id?: string;
  [key: string]: unknown;
}

export interface AgentTask {
  id: string
  agent: string
  task: string
  result: string
  timestamp: string
}

export interface ExtraData {
  session_id?: string
  reasoning_steps?: ReasoningStep[]
  reasoning_messages?: Array<Record<string, unknown>>
  references?: Array<{
    query: string
    references: Array<{
      meta_data: {
        page: number
        chunk: number
        chunk_size: number
      }
      content: string
      name: string
    }>
    time: number
  }>
}

// Nuevos tipos para Teams API
export interface ReasoningStep {
  title: string
  action?: string | null
  result?: string | null
  reasoning: string
  next_action: string
  confidence: number
}

// Nuevo tipo específico para respuestas de miembros de OpenAI
export interface MemberResponse {
  member_id?: string
  content: string
  content_type: string
  event: string
  metrics?: {
    input_tokens?: number | number[]
    output_tokens?: number | number[]
    total_tokens?: number | number[]
    audio_tokens?: number | number[]
    input_audio_tokens?: number | number[]
    output_audio_tokens?: number | number[]
    cached_tokens?: number | number[]
    cache_write_tokens?: number | number[]
    reasoning_tokens?: number | number[]
    prompt_tokens?: number | number[]
    completion_tokens?: number | number[]
    prompt_tokens_details?: Array<{
      audio_tokens?: number
      cached_tokens?: number
    }>
    completion_tokens_details?: Array<{
      accepted_prediction_tokens?: number
      audio_tokens?: number
      reasoning_tokens?: number
      rejected_prediction_tokens?: number
    }>
    time?: number | number[]
    time_to_first_token?: number | number[]
  }
  model?: string
  model_provider?: string
  run_id?: string
  agent_id?: string
  session_id?: string
  formatted_tool_calls?: string[]
  created_at?: number
  messages?: Array<Message | ToolMessage>
  extra_data?: {
    references?: Array<{
      query: string
      references: Array<{
        meta_data: {
          page: number
          chunk: number
          chunk_size: number
        }
        content: string
        name: string
      }>
      time: number
    }>
  }
  tools?: Array<TeamTool>
  [key: string]: unknown
}

export interface TeamTool {
  tool_call_id: string
  tool_name: string
  tool_args: Record<string, unknown>
  tool_call_error: boolean | null
  result: string | null
  metrics: Record<string, unknown> | null
  stop_after_tool_call: boolean
  created_at: number
  requires_confirmation: boolean | null
  confirmed: boolean | null
  confirmation_note: string | null
  requires_user_input: boolean | null
  user_input_schema: Record<string, unknown> | null
  external_execution_required: boolean | null
}

// Nuevo tipo para Teams Runs (estructura de OpenAI)
export interface TeamRun {
  message: {
    role: string
    content: string
    created_at: number
    from_history: boolean
    stop_after_tool_call: boolean
  }
  response: {
    event: string
    model: string
    run_id: string
    content: string
    metrics?: {
      time?: number | number[]
      audio_tokens?: number | number[]
      input_tokens?: number | number[]
      total_tokens?: number | number[]
      cached_tokens?: number | number[]
      output_tokens?: number | number[]
      prompt_tokens?: number | number[]
      reasoning_tokens?: number | number[]
      completion_tokens?: number | number[]
      cache_write_tokens?: number | number[]
      input_audio_tokens?: number | number[]
      output_audio_tokens?: number | number[]
      time_to_first_token?: number | number[]
      prompt_tokens_details?: Array<{
        audio_tokens?: number
        cached_tokens?: number
      }>
      completion_tokens_details?: Array<{
        audio_tokens?: number
        reasoning_tokens?: number
        accepted_prediction_tokens?: number
        rejected_prediction_tokens?: number
      }>
    }
    team_id?: string
    messages?: Array<Message | ToolMessage>
    created_at: number
    session_id: string
    content_type: string
    model_provider: string
    member_responses: MemberResponse[]
    formatted_tool_calls?: string[]
    reasoning_content?: string
    extra_data?: ExtraData
    tools?: Array<TeamTool>
  }
}

// Tipo para datos de sesión de Teams
export interface TeamSessionData {
  session_id: string
  team_session_id: string | null
  team_id: string
  user_id: string
  team_data: {
    mode: string
    name: string
    model: {
      id: string
      name: string
      provider: string
    }
    team_id: string
  }
  session_data: {
    session_state: {
      current_user_id: string
      current_session_id: string
    }
    session_metrics: {
      time: number
      timer: null
      audio_tokens: number
      input_tokens: number
      total_tokens: number
      cached_tokens: number
      output_tokens: number
      prompt_tokens: number
      reasoning_tokens: number
      completion_tokens: number
      additional_metrics: null
      cache_write_tokens: number
      input_audio_tokens: number
      output_audio_tokens: number
      time_to_first_token: number
      prompt_tokens_details: {
        audio_tokens: number
        cached_tokens: number
      }
      completion_tokens_details: {
        audio_tokens: number
        reasoning_tokens: number
        accepted_prediction_tokens: number
        rejected_prediction_tokens: number
      }
    }
  }
  extra_data: null
  created_at: number
  updated_at: number
  runs: TeamRun[]
}

export interface ApiResponse {
  content: string | Record<string, unknown> | Array<Record<string, unknown>>
  content_type: string
  event: string
  model?: string
  run_id?: string
  team_id?: string  // Nuevo campo para teams
  agent_id?: string  // Mantener para compatibilidad
  session_id?: string
  created_at?: number
  messages?: Array<Message | ToolMessage>
  sources?: Source[]
  extra_data?: ExtraData
  status?: "thinking" | "reasoning" | "completing"
  tool_calls?: Array<ToolCall>
  tools?: Array<TeamTool>
  member_responses?: MemberResponse[]  // Nuevo campo para teams
  formatted_tool_calls?: string[]  // Nuevo campo para teams (OpenAI)
  reasoning_content?: string  // Nuevo campo para reasoning (OpenAI)
  citations?: {
    raw: Array<unknown>
    urls: Array<string>
    documents: Array<unknown>
  }
}

export interface UserSession {
  id: string
  user_id: string
  session_id: string
  agent_id?: string  // Mantener para compatibilidad
  team_id?: string   // Nuevo campo para teams
  title: string
  created_at: string
}

export type ProcessingState = 
  | "idle"               // Sin actividad
  | "thinking"           // Procesando inicialmente
  | "streaming"          // Recibiendo stream de texto
  | "tool_calling"       // Iniciando llamada a herramienta
  | "tool_processing"    // Herramienta procesando 
  | "waiting_result"     // Esperando resultado de herramienta
  | "analyzing"          // Analizando resultados antes de continuar
  | "resuming"           // Reanudando generación de respuesta
  | "completing"         // Completando la respuesta
  | "reasoning"          // Proceso de razonamiento (nuevo)
  | "updating_memory"    // Actualizando memoria (nuevo)
  | "workflow_running";  // Ejecutando workflow (nuevo)

export interface ToolCall {
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
  type?: string  // Agregar tipo para Claude compatibility
}

export interface UseChatReturn {
  messages: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  sendMessage: (message: string, regenerate?: boolean) => Promise<void>;
  isLoading: boolean;
  cancelRequest: () => void;
  canStopResponse: boolean;
  sources: Source[];
  agentTasks: AgentTask[];
  reasoningSteps: ReasoningStep[];  // Nuevo campo para reasoning
  isGeneratingTask: boolean;
  processingState: ProcessingState;
  currentModel: string | null;
  userSessions: UserSession[];
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, newTitle: string) => Promise<void>;
  currentUserId: string | null;
  currentChatId: string | null;
  loadSession: (sessionId: string) => Promise<void>;
  createNewChat: () => Promise<void>;
}

// Tipo unificado para datos de sesión (Teams o Agents)
export interface SessionData {
  // Estructura de Agents (Claude)
  memory?: {
    messages?: Array<Record<string, unknown>>;
    runs?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  
  // Estructura de Teams (OpenAI)
  runs?: TeamRun[];
  team_data?: {
    mode: string;
    name: string;
    model: {
      id: string;
      name: string;
      provider: string;
    };
    team_id: string;
  };
  session_data?: {
    session_state: {
      current_user_id: string;
      current_session_id: string;
    };
    session_metrics: Record<string, unknown>;
  };
  
  // Campos comunes
  session_id?: string;
  agent_id?: string;  // Mantener para compatibilidad
  team_id?: string;   // Nuevo campo para teams
  agent_data?: Record<string, unknown>;
  extra_data?: ExtraData | null;
  created_at?: number;
  updated_at?: number;
  [key: string]: unknown;
}

// Ahora HistoricalMessage es compatible con Message y ToolMessage
export interface HistoricalMessage {
  role: string;
  content?: string | Record<string, unknown> | Array<Record<string, unknown>>;
  tool_calls?: Array<{
    id: string;
    function?: {
      name: string;
      arguments: string | Record<string, unknown>;
    };
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}