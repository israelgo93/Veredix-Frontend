//src/components/QuickActions.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { PenLine, Scale, Building2, Users, Lightbulb, BarChart3, ChevronDown, FileText, BookOpen } from 'lucide-react'

interface QuickActionsProps {
  onQuickAction: (text: string) => void
}

const initialActions = [
  {
    icon: <PenLine className="w-4 h-4" style={{ color: "rgb(203, 139, 208)" }} />,
    label: "Ayúdame a escribir",
    action: "¿Puedes ayudarme a redactar un documento legal?",
  },
  {
    icon: <Scale className="w-4 h-4" style={{ color: "rgb(53, 174, 71)" }} />,
    label: "Consulta legal",
    action: "Tengo una consulta legal",
  },
  {
    icon: <Building2 className="w-4 h-4" style={{ color: "rgb(226, 197, 65)" }} />,
    label: "Trámites",
    action: "¿Qué necesito para un trámite empresarial?",
  },
  {
    icon: <Users className="w-4 h-4" style={{ color: "rgb(108, 113, 255)" }} />,
    label: "Laboral",
    action: "Consulta sobre derecho laboral",
  },
]

const allActions = [
  ...initialActions,
  {
    icon: <BarChart3 className="w-4 h-4" style={{ color: "rgb(118, 208, 235)" }} />,
    label: "Analizar datos",
    action: "¿Puedes analizar estos datos legales?",
  },
  {
    icon: <Lightbulb className="w-4 h-4" style={{ color: "rgb(118, 208, 235)" }} />,
    label: "Consejos",
    action: "¿Puedes darme un consejo legal?",
  },
  {
    icon: <Scale className="w-4 h-4" style={{ color: "rgb(203, 139, 208)" }} />,
    label: "Civil",
    action: "Consulta sobre derecho civil",
  },
  {
    icon: <FileText className="w-4 h-4" style={{ color: "rgb(226, 197, 65)" }} />,
    label: "Documentos",
    action: "Necesito ayuda con documentos legales",
  },
  {
    icon: <BookOpen className="w-4 h-4" style={{ color: "rgb(108, 113, 255)" }} />,
    label: "Biblioteca",
    action: "Buscar en la biblioteca legal",
  },
]

export function QuickActions({ onQuickAction }: QuickActionsProps) {
  const [showMore, setShowMore] = useState(false)

  const visibleActions = showMore ? allActions : initialActions

  return (
    <div className="w-full max-w-[600px] mx-auto px-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {visibleActions.map((button, index) => (
          <Button
            key={index}
            variant="outline"
            onClick={() => onQuickAction(button.action)}
            className="flex items-center gap-2 px-4 py-2 h-auto rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 transition-all min-w-[140px] justify-center"
          >
            {button.icon}
            <span className="text-sm text-muted-foreground">{button.label}</span>
          </Button>
        ))}
        <Button
          variant="outline"
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 px-4 py-2 h-auto rounded-full border border-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700 transition-all"
        >
          <span className="text-sm text-muted-foreground">{showMore ? "Menos" : "Más"}</span>
          <ChevronDown className="w-4 h-4" style={{ transform: showMore ? "rotate(180deg)" : "none" }} />
        </Button>
      </div>
    </div>
  )
}
