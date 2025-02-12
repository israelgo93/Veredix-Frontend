//src/components/QuickActions.tsx
"use client"

import { Button } from "@/components/ui/button"
import { PenLine, BarChart3, Scale, Building2, Users, Lightbulb } from "lucide-react"

interface QuickActionsProps {
  onQuickAction: (text: string) => void
}

const quickActionButtons = [
  {
    icon: <PenLine className="w-4 h-4" style={{ color: "rgb(203, 139, 208)" }} />,
    label: "Ayúdame a escribir",
    action: "¿Puedes ayudarme a redactar un documento legal?",
  },
  {
    icon: <BarChart3 className="w-4 h-4" style={{ color: "rgb(118, 208, 235)" }} />,
    label: "Analizar datos",
    action: "¿Puedes analizar estos datos legales?",
  },
  {
    icon: <Scale className="w-4 h-4" style={{ color: "rgb(53, 174, 71)" }} />,
    label: "Consulta legal",
    action: "Tengo una consulta legal",
  },
  {
    icon: <Building2 className="w-4 h-4" style={{ color: "rgb(226, 197, 65)" }} />,
    label: "Trámites empresariales",
    action: "¿Qué necesito para un trámite empresarial?",
  },
  {
    icon: <Users className="w-4 h-4" style={{ color: "rgb(108, 113, 255)" }} />,
    label: "Derecho laboral",
    action: "Consulta sobre derecho laboral",
  },
  {
    icon: <Lightbulb className="w-4 h-4" style={{ color: "rgb(118, 208, 235)" }} />,
    label: "Consejos legales",
    action: "¿Puedes darme un consejo legal?",
  },
]

export function QuickActions({ onQuickAction }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full mx-auto max-w-3xl">
      {quickActionButtons.map((button, index) => (
        <Button
          key={index}
          variant="outline"
          className="w-full h-[42px] flex items-center gap-2 px-3 py-2 text-[13px] rounded-full border border-border/40 bg-background hover:bg-secondary/80 transition-colors"
          onClick={() => onQuickAction(button.action)}
        >
          {button.icon}
          <span className="text-muted-foreground">{button.label}</span>
        </Button>
      ))}
    </div>
  )
}