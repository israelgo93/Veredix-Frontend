// src/components/ErrorMessage.tsx
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  isRetryable?: boolean;
}

/**
 * Componente para mostrar mensajes de error con opción de reintentar
 */
const ErrorMessage = ({ message, onRetry, isRetryable = true }: ErrorMessageProps) => (
  <div className="max-w-3xl mx-auto px-4 py-2">
    <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative flex items-center justify-between" role="alert">
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
        <span className="block sm:inline text-sm">{message}</span>
      </div>
      {isRetryable && onRetry && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onRetry}
          className="text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50 ml-2"
        >
          <RefreshCw className="h-4 w-4 mr-1" /> Reintentar
        </Button>
      )}
    </div>
  </div>
);

export default ErrorMessage;