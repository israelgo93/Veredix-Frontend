"use client"

import React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} className={cn("px-4 py-2 border rounded", props.className)} {...props} />
})

Input.displayName = "Input"

export { Input }
