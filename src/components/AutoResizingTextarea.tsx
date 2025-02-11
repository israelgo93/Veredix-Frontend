import React, { useCallback, useEffect, useRef } from "react"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface AutoResizingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number
}

const AutoResizingTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizingTextareaProps>(
  ({ onChange, maxHeight = 300, className, ...props }, ref) => {
    // Se utiliza la referencia pasada o una interna
    const localRef = useRef<HTMLTextAreaElement>(null)
    const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || localRef

    const adjustHeight = useCallback(() => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.style.height = "auto"
        const newHeight = Math.min(textarea.scrollHeight, maxHeight)
        textarea.style.height = `${newHeight}px`
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden"
      }
    }, [maxHeight, textareaRef])

    // Se añade props.value en la dependencia para reajustar al cambiar el valor (por ejemplo, al enviar y limpiar)
    useEffect(() => {
      adjustHeight()
    }, [adjustHeight, props.value])

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight()
      onChange?.(e)
    }

    return (
      <Textarea
        {...props}
        ref={textareaRef}
        onChange={handleChange}
        rows={1}
        className={cn(
          "w-full resize-none rounded-xl border-none bg-background/80 p-4 shadow-md backdrop-blur transition-all focus:ring-2 focus:ring-primary/50",
          className
        )}
      />
    )
  }
)

AutoResizingTextarea.displayName = "AutoResizingTextarea"

export default AutoResizingTextarea
