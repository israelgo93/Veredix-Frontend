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
  tool_calls?: Array<ToolCall>
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

export type ProcessingState = 
  | "idle"               // Sin actividad
  | "thinking"           // Procesando inicialmente
  | "streaming"          // Recibiendo stream de texto
  | "tool_calling"       // Iniciando llamada a herramienta
  | "tool_processing"    // Herramienta procesando 
  | "waiting_result"     // Esperando resultado de herramienta
  | "analyzing"          // Analizando resultados antes de continuar
  | "resuming"           // Reanudando generación de respuesta
  | "completing";        // Completando la respuesta

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

export interface SessionData {
memory?: {
  messages?: Array<Record<string, unknown>>;
  runs?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};
session_id?: string;
agent_id?: string;
agent_data?: Record<string, unknown>;
session_data?: Record<string, unknown>;
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