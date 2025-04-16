// src/components/ConnectivityAlert.tsx
"use client"

import { useEffect, useState } from "react"

/**
 * Componente que muestra una alerta cuando no hay conexión a internet
 */
export const ConnectivityAlert = () => {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Comprobar el estado inicial de la conexión
    setIsOnline(navigator.onLine)

    // Configurar los event listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed top-16 left-0 right-0 z-50 bg-yellow-500 text-black py-1 px-4 text-center text-sm shadow-md">
      <p className="font-medium">Sin conexión a internet. Es posible que algunas funciones no estén disponibles.</p>
    </div>
  )
}

/**
 * Hook para comprobar la conectividad en componentes
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Comprobar el estado inicial de la conexión
    setIsOnline(navigator.onLine)

    // Configurar los event listeners
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}