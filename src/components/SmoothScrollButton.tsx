"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Transition } from "./ui/transition"

interface SmoothScrollButtonProps {
  onClick: () => void
  show: boolean
  className?: string
  rootClassName?: string
  // Modificar el tipo para hacerlo compatible con RefObject<HTMLDivElement | null>
  containerRef?: React.RefObject<HTMLElement | HTMLDivElement | null>
  threshold?: number
}

export function SmoothScrollButton({
  onClick,
  show,
  className,
  rootClassName,
  containerRef,
  threshold = 150
}: SmoothScrollButtonProps) {
  const [visible, setVisible] = useState(show)
  
  // Si se pasa un contenedor, monitorizar su scroll
  useEffect(() => {
    if (!containerRef?.current) return
    
    const container = containerRef.current
    
    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight
      setVisible(distanceFromBottom > threshold)
    }
    
    container.addEventListener('scroll', handleScroll)
    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [containerRef, threshold])
  
  // Si no hay contenedor, usar el prop show directamente
  useEffect(() => {
    if (!containerRef) {
      setVisible(show)
    }
  }, [show, containerRef])

  return (
    <Transition
      show={visible}
      className={cn(
        "absolute inset-x-0 z-10 m-auto flex w-fit items-center justify-center",
        rootClassName
      )}
      enterFrom="opacity-0 translate-y-4"
      enterTo="opacity-100 translate-y-0"
      leaveFrom="opacity-100 translate-y-0" 
      leaveTo="opacity-0 translate-y-4"
      duration={250}
    >
      <Button
        onClick={onClick}
        size="icon"
        variant="outline"
        className={cn(
          "shadow-md h-8 w-8 rounded-full bg-background hover:bg-muted",
          "transition-all hover:scale-110 active:scale-95",
          "after:content-[''] after:absolute after:-inset-2 after:rounded-full after:bg-gradient-to-br after:from-primary/10 after:to-primary/5 after:animate-pulse after:opacity-70 after:-z-10",
          className
        )}
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
    </Transition>
  )
}

export default SmoothScrollButton