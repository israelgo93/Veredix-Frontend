// src/components/SourceAccordion.tsx
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Source } from "../hooks/useChat"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"

interface SourceAccordionProps {
  source: Source
}

const SourceAccordion = ({ source }: SourceAccordionProps) => {
  const [expanded, setExpanded] = useState(false)
  
  // Genera un resumen del contenido (primeras 150 caracteres)
  const summary = source.content.length > 150
    ? source.content.slice(0, 150).trim() + "..."
    : source.content

  // Función para limpiar y formatear el contenido si es necesario
  const getFormattedContent = () => {
    // Si el contenido parece JSON pero está guardado como string, intenta parsearlo
    if (typeof source.content === 'string' && 
        (source.content.trim().startsWith('{') || source.content.trim().startsWith('['))) {
      try {
        const parsed = JSON.parse(source.content)
        return JSON.stringify(parsed, null, 2)
      } catch {
        // Si no se puede parsear, devuelve el contenido original
        return source.content
      }
    }
    return source.content
  }

  // Maneja diferentes formatos de meta_data entre modelos
  const getSourceMetadata = () => {
    // Para fuentes sin meta_data
    if (!source.meta_data) {
      return null;
    }
    
    // Array para almacenar elementos de metadatos
    const metadataElements = [];
    
    // Verificar si hay información de página
    if (source.meta_data.page) {
      metadataElements.push(
        <span key="page" className="ml-2 mr-2 text-muted-foreground">
          Página {source.meta_data.page}
        </span>
      );
    }
    
    // Verificar si hay información de fragmento (chunk)
    if (source.meta_data.chunk) {
      metadataElements.push(
        <span key="chunk" className="text-muted-foreground">
          Fragmento {source.meta_data.chunk}
        </span>
      );
    }
    
    return metadataElements.length > 0 ? (
      <div className="flex items-center gap-1 text-xs">
        {metadataElements}
      </div>
    ) : null;
  }

  return (
    <div className="border-b border-border pb-3 mb-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="font-semibold text-xs md:text-sm">
            {source.name}
          </span>
          {getSourceMetadata()}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs transition-transform duration-200 hover:scale-105 active:scale-95"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Mostrar menos" : "Leer más"}
        </Button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {expanded ? (
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {getFormattedContent()}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-line">{summary}</p>
        )}
      </div>
    </div>
  )
}

export default SourceAccordion