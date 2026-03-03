'use client'
// ═══════════════════════════════════════════════════════════════
// components/posts/LegendaEditor.tsx — Editor de legenda com regeneração
// Permite editar a legenda gerada e pedir uma nova via GPT-4o
// ═══════════════════════════════════════════════════════════════
import { useState } from 'react'
import { RefreshCw, Copy, Check, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { Slide } from '@/types'
import { cn } from '@/lib/utils'

interface LegendaEditorProps {
  postId: string
  titulo: string
  legenda: string
  slides: Slide[]
  handle: string
  onChange: (legenda: string) => void
}

export function LegendaEditor({
  postId,
  titulo,
  legenda,
  slides,
  handle,
  onChange,
}: LegendaEditorProps) {
  const [copiado, setCopiado] = useState(false)
  const [regenerando, setRegenerando] = useState(false)
  const [chars, setChars] = useState(legenda.length)

  // Instagram suporta até 2200 caracteres na legenda
  const LIMITE_CHARS = 2200

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const novo = e.target.value
    onChange(novo)
    setChars(novo.length)
  }

  async function copiarLegenda() {
    await navigator.clipboard.writeText(legenda)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function regenerarLegenda() {
    setRegenerando(true)
    try {
      const response = await fetch('/api/gerar-legenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          titulo,
          slides: slides.map((s) => ({
            headline: s.headline ?? '',
            body: s.body ?? '',
          })),
          handle,
        }),
      })

      if (!response.ok) throw new Error('Erro ao regenerar legenda')

      const { legenda: novaLegenda } = await response.json()
      onChange(novaLegenda)
      setChars(novaLegenda.length)

      toast({ title: 'Legenda regenerada!', description: 'Uma nova legenda foi criada pelo GPT-4o.' })
    } catch {
      toast({ title: 'Erro ao regenerar legenda', variant: 'destructive' })
    } finally {
      setRegenerando(false)
    }
  }

  const percentual = Math.round((chars / LIMITE_CHARS) * 100)
  const corContador =
    chars > LIMITE_CHARS
      ? 'text-red-400'
      : chars > LIMITE_CHARS * 0.9
      ? 'text-amber-400'
      : 'text-muted-foreground'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Legenda do Post</label>

        <div className="flex items-center gap-2">
          {/* Botão regenerar legenda */}
          <button
            type="button"
            onClick={regenerarLegenda}
            disabled={regenerando}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-secondary"
          >
            {regenerando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Regenerar
          </button>

          {/* Botão copiar */}
          <button
            type="button"
            onClick={copiarLegenda}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-secondary"
          >
            {copiado ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Textarea editável */}
      <textarea
        value={legenda}
        onChange={handleChange}
        rows={8}
        className={cn(
          'input-dark resize-none font-mono text-sm leading-relaxed',
          chars > LIMITE_CHARS && 'border-red-400/50 focus:ring-red-400'
        )}
        placeholder="A legenda será gerada automaticamente..."
      />

      {/* Contador de caracteres */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Edite a legenda antes de aprovar o post
        </p>
        <span className={cn('text-xs tabular-nums', corContador)}>
          {chars.toLocaleString()} / {LIMITE_CHARS.toLocaleString()}
        </span>
      </div>

      {/* Barra de progresso de caracteres */}
      <div className="progress-bar">
        <div
          className={cn(
            'progress-bar-fill',
            chars > LIMITE_CHARS ? 'bg-red-400' : chars > LIMITE_CHARS * 0.9 ? 'bg-amber-400' : ''
          )}
          style={{ width: `${Math.min(percentual, 100)}%` }}
        />
      </div>
    </div>
  )
}
