"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TransitionProps extends React.HTMLAttributes<HTMLDivElement> {
  show: boolean
  appear?: boolean
  unmount?: boolean
  className?: string
  duration?: number
  enter?: string
  enterFrom?: string
  enterTo?: string
  leave?: string
  leaveFrom?: string
  leaveTo?: string
  children?: React.ReactNode
}

const DEFAULT_TRANSITION = {
  enter: "transition-all ease-in-out",
  enterFrom: "opacity-0",
  enterTo: "opacity-100",
  leave: "transition-all ease-in-out",
  leaveFrom: "opacity-100",
  leaveTo: "opacity-0",
}

export const Transition = ({
  show = true,
  appear = false,
  unmount = true,
  duration = 300,
  enter = DEFAULT_TRANSITION.enter,
  enterFrom = DEFAULT_TRANSITION.enterFrom,
  enterTo = DEFAULT_TRANSITION.enterTo,
  leave = DEFAULT_TRANSITION.leave,
  leaveFrom = DEFAULT_TRANSITION.leaveFrom,
  leaveTo = DEFAULT_TRANSITION.leaveTo,
  className,
  children,
  ...props
}: TransitionProps) => {
  const [mounted, setMounted] = React.useState(false)
  const [visible, setVisible] = React.useState(show)
  const [transitionClasses, setTransitionClasses] = React.useState<string[]>([])

  // Gestionar montaje/desmontaje
  React.useEffect(() => {
    let timer: NodeJS.Timeout
    
    // Si cambia a mostrar y no está montado
    if (show && !mounted) {
      setMounted(true)
      // Aplicamos las clases de entrada inmediatamente si "appear" es true
      if (appear) {
        setTransitionClasses([enter, enterFrom])
        timer = setTimeout(() => {
          setTransitionClasses([enter, enterTo])
          setVisible(true)
        }, 10)
      } else {
        setVisible(true)
      }
    } 
    // Si cambia a ocultar y está montado
    else if (!show && mounted) {
      setTransitionClasses([leave, leaveFrom])
      timer = setTimeout(() => {
        setTransitionClasses([leave, leaveTo])
        setVisible(false)
        
        // Desmontar después del tiempo de transición si unmount es true
        if (unmount) {
          timer = setTimeout(() => {
            setMounted(false)
          }, duration)
        }
      }, 10)
    }
    
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [show, mounted, appear, unmount, duration, enter, enterFrom, enterTo, leave, leaveFrom, leaveTo])

  // Estilo por defecto - aplicar transición con duración especificada
  const style: React.CSSProperties = {
    transitionDuration: `${duration}ms`,
  }

  // No renderizar nada si no está montado y unmount es true
  if (!mounted && unmount) {
    return null
  }

  return (
    <div
      className={cn(transitionClasses.join(' '), 
                  className,
                  !visible && unmount ? 'hidden' : '')}
      style={style}
      {...props}
    >
      {children}
    </div>
  )
}

export default Transition