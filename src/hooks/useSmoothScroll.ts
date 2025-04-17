// src/hooks/useSmoothScroll.ts
import { useRef, useCallback, useMemo } from 'react';
import type { ScrollOptions } from './types';

/**
 * Hook personalizado para gestionar el scroll suave en una conversación de chat
 * 
 * @param defaultOptions - Opciones predeterminadas para el comportamiento del scroll
 * @returns Objeto con funciones y referencias para gestionar el scroll
 */
export function useSmoothScroll(defaultOptions?: Partial<ScrollOptions>) {
  // Opciones por defecto usando useMemo para evitar recreaciones en cada render
  const options = useMemo(() => ({
    behavior: defaultOptions?.behavior || 'smooth',
    threshold: defaultOptions?.threshold || 150,
    delay: defaultOptions?.delay || 100,
    forceScroll: defaultOptions?.forceScroll || false,
  }), [
    defaultOptions?.behavior,
    defaultOptions?.threshold,
    defaultOptions?.delay,
    defaultOptions?.forceScroll
  ]);

  // Referencias para el contenedor y el indicador de scroll
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const showScrollButtonRef = useRef<(show: boolean) => void>(() => {});
  
  /**
   * Determina si el usuario ha hecho scroll manual alejándose del fondo
   */
  const isUserScrolledUp = useCallback(() => {
    if (!containerRef.current) return false;
    
    const container = containerRef.current;
    const { scrollHeight, scrollTop, clientHeight } = container;
    return scrollHeight - scrollTop - clientHeight > options.threshold;
  }, [options.threshold]);

  /**
   * Función para establecer la visibilidad del botón de scroll
   */
  const setShowScrollButton = useCallback((show: boolean) => {
    showScrollButtonRef.current(show);
  }, []);

  /**
   * Maneja el evento de scroll para mostrar/ocultar el botón de scroll
   */
  const handleScroll = useCallback(() => {
    try {
      if (isScrollingRef.current) return;
      
      const container = containerRef.current;
      if (!container) return;
      
      const { scrollHeight, scrollTop, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      setShowScrollButton(distanceFromBottom > options.threshold);
    } catch (error) {
      console.warn("Error handling scroll:", error);
      setShowScrollButton(false);
    }
  }, [options.threshold, setShowScrollButton]);

  /**
   * Hace scroll al final de manera suave
   */
  const scrollToBottom = useCallback((customOptions?: Partial<ScrollOptions>) => {
    try {
      // Limpiar timeout previo si existe
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      
      // Configurar opciones para esta invocación particular
      const scrollOpts = {
        ...options,
        ...customOptions
      };
      
      // Si ya estamos en una operación de scroll, esperar
      if (isScrollingRef.current && !scrollOpts.forceScroll) {
        return;
      }
      
      // Añadir un pequeño retraso para mejorar la experiencia de usuario
      scrollTimeoutRef.current = setTimeout(() => {
        if (messagesEndRef.current && containerRef.current) {
          isScrollingRef.current = true;
          
          // Decidir qué método usar para el scroll
          if (scrollOpts.behavior === 'smooth') {
            messagesEndRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'end'
            });
          } else {
            // Para scroll instantáneo, usamos un enfoque más directo
            const container = containerRef.current;
            container.scrollTop = container.scrollHeight;
          }
          
          // Restaurar el flag después de una duración
          setTimeout(() => {
            isScrollingRef.current = false;
          }, 500);
        }
      }, scrollOpts.delay);
    } catch (error) {
      console.warn("Error scrolling to bottom:", error);
      
      // Fallback directo en caso de error
      try {
        if (messagesEndRef.current && containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      } catch (fallbackError) {
        console.error("Critical scroll error:", fallbackError);
      }
      
      isScrollingRef.current = false;
    }
  }, [options]);

  /**
   * Comprueba si es necesario hacer scroll automático
   * basado en mensajes nuevos o actualización de contenido
   */
  const checkAndScrollToBottom = useCallback((isLoading: boolean, isUpdateEvent = false) => {
    try {
      const container = containerRef.current;
      if (!container) return;
      
      // Durante carga, siempre hacer scroll
      if (isLoading) {
        scrollToBottom({ behavior: 'smooth', forceScroll: true });
        return;
      }
      
      // Comprobar la distancia desde el fondo
      const { scrollHeight, scrollTop, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Si estamos cerca del fondo o se solicita específicamente (nuevo mensaje)
      if (distanceFromBottom < options.threshold || isUpdateEvent) {
        scrollToBottom({ 
          behavior: isUpdateEvent ? 'auto' : 'smooth'
        });
      }
    } catch (error) {
      console.warn("Error checking scroll position:", error);
      // Intentar scroll de todos modos en caso de error
      scrollToBottom({ behavior: 'auto', forceScroll: true });
    }
  }, [options.threshold, scrollToBottom]);

  // Configurar el handler para el botón de scroll
  const setScrollButtonHandler = useCallback((handler: (show: boolean) => void) => {
    showScrollButtonRef.current = handler;
  }, []);

  return {
    containerRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom,
    checkAndScrollToBottom,
    isUserScrolledUp,
    setScrollButtonHandler
  };
}