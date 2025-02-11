"use client"

import { Button } from "@/components/ui/button"
import { ChevronDown } from 'lucide-react'
import { cn } from "@/lib/utils"

interface ScrollToBottomButtonProps {
  className?: string
  rootClassName?: string
  show: boolean
  onClick: () => void
}

export function ScrollToBottomButton({
  className,
  rootClassName,
  show,
  onClick,
}: ScrollToBottomButtonProps) {
  if (!show) return null

  return (
    <div
      className={cn(
        "animate-in fade-in slide-in-from-bottom absolute inset-x-0 -top-12 z-10 m-auto flex w-fit items-center justify-center",
        rootClassName
      )}
    >
      <Button
        onClick={onClick}
        size="icon"
        variant="outline"
        className={cn(
          "animate-bounce shadow-md h-8 w-8 rounded-full bg-background hover:bg-muted",
          className
        )}
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
    </div>
  )
}
