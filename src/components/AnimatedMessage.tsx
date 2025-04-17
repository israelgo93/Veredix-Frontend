// src/components/AnimatedMessage.tsx
"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

// Definir tipos específicos para componentes de Markdown
type MarkdownComponentProps = {
  children?: React.ReactNode;
  [key: string]: unknown;
};

interface MarkdownComponents {
  [key: string]: React.ComponentType<MarkdownComponentProps>;
}

interface AnimatedMessageProps {
  content: string | Record<string, unknown> | Array<Record<string, unknown>>;
  isAnimated: boolean;
  isComplete: boolean;
  markdownComponents?: MarkdownComponents;
  className?: string;
}

const AnimatedMessage: React.FC<AnimatedMessageProps> = ({
  content,
  isAnimated,
  isComplete,
  markdownComponents,
  className,
}) => {
  // Usar un ref para el contenido previo para comparar
  const prevContentRef = useRef<string>(typeof content === "string" ? content : "");
  const contentStr = typeof content === "string" ? content : JSON.stringify(content, null, 2);
  
  // Estado para la animación
  const [displayedContent, setDisplayedContent] = useState(contentStr);
  const [isAppending, setIsAppending] = useState(false);
  
  // Referencias y estado para seguimiento de animación
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  
  // Constantes para controlar la velocidad de animación
  const ANIMATION_DURATION = 300; // duración base en ms
  const MIN_CHARS_PER_FRAME = 1; // mínimo de caracteres por frame
  const MAX_CHARS_PER_FRAME = 10; // máximo de caracteres por frame
  
  useEffect(() => {
    // Cancelar cualquier animación previa
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Si no hay animación activa o el contenido es completo, mostrar todo
    if (!isAnimated || isComplete) {
      setDisplayedContent(contentStr);
      prevContentRef.current = contentStr;
      return;
    }
    
    // Si el contenido no ha cambiado, no hacemos nada
    if (contentStr === prevContentRef.current) {
      return;
    }
    
    // Determinar si es una adición o un reemplazo completo
    const isAddition = contentStr.startsWith(prevContentRef.current);
    
    if (isAddition && prevContentRef.current.length > 0) {
      // Animar solo la parte nueva
      setIsAppending(true);
      const newContent = contentStr.slice(prevContentRef.current.length);
      
      // Actualizar referencia del contenido anterior
      prevContentRef.current = contentStr;
      
      // Iniciar temporizador para la animación
      startTimeRef.current = performance.now();
      
      // Función para la animación progresiva
      const animateContent = (timestamp: number) => {
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(1, elapsed / ANIMATION_DURATION);
        
        // Calcular cuántos caracteres mostrar basado en el progreso
        const totalChars = newContent.length;
        const charsToShow = Math.max(
          MIN_CHARS_PER_FRAME,
          Math.min(
            Math.ceil(totalChars * progress),
            MAX_CHARS_PER_FRAME
          )
        );
        
        // Actualizar el contenido mostrado
        if (charsToShow < totalChars) {
          setDisplayedContent(prevContentRef.current.slice(0, -newContent.length) + 
                             newContent.slice(0, charsToShow));
          animationRef.current = requestAnimationFrame(animateContent);
        } else {
          setDisplayedContent(prevContentRef.current);
          setIsAppending(false);
          animationRef.current = null;
        }
      };
      
      // Iniciar la animación
      animationRef.current = requestAnimationFrame(animateContent);
    } else {
      // Si es un reemplazo completo, simplemente actualizar
      setDisplayedContent(contentStr);
      prevContentRef.current = contentStr;
    }
    
    // Limpiar al desmontar
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [contentStr, isAnimated, isComplete]);
  
  // Renderizar el contenido con el formato adecuado
  const renderContent = () => {
    // Asegurarnos de tener siempre un contenido para mostrar
    if (!displayedContent || displayedContent === '') {
      return <div className="italic text-muted-foreground">Cargando respuesta...</div>;
    }
    
    if (typeof displayedContent !== "string") {
      return <pre className="text-xs overflow-x-auto bg-muted p-2 rounded whitespace-pre-wrap">
        {JSON.stringify(displayedContent, null, 2)}
      </pre>;
    }
    
    // Renderizar de forma simple sin animaciones para diagnosticar
    try {
      return (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={markdownComponents}
          className={cn(
            "prose prose-neutral dark:prose-invert max-w-full overflow-x-hidden break-words",
            isAppending ? "animate-pulse" : "",
            className
          )}
        >
          {displayedContent}
        </ReactMarkdown>
      );
    } catch (error) {
      console.error("Error rendering markdown:", error);
      // Mostrar contenido plano si falla el markdown
      return <div className="whitespace-pre-wrap">{displayedContent}</div>;
    }
  }; 
  
  return (
    <div className={cn(
      "transition-opacity",
      isAnimated && !isComplete ? "opacity-90" : "opacity-100"
    )}>
      {renderContent()}
    </div>
  );
};

export default AnimatedMessage;