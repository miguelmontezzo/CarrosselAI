// ═══════════════════════════════════════════════════════════════
// components/posts/ProgressSteps.tsx — Etapas visuais de progresso
// Mostra cada passo do pipeline com ícone de check ou loading
// ═══════════════════════════════════════════════════════════════
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import type { PostStatus } from '@/types'
import { cn } from '@/lib/utils'

interface Etapa {
  status: PostStatus[]       // Status que "ativam" esta etapa
  label: string
  completadoApos: PostStatus[] // Status que marcam esta etapa como feita
}

const ETAPAS: Etapa[] = [
  {
    status: ['extraindo'],
    label: 'Notícia extraída',
    completadoApos: ['gerando_prompts', 'gerando_imagens', 'aguardando_aprovacao', 'agendado', 'postando', 'postado'],
  },
  {
    status: ['gerando_prompts'],
    label: 'Prompts gerados',
    completadoApos: ['gerando_imagens', 'aguardando_aprovacao', 'agendado', 'postando', 'postado'],
  },
  {
    status: ['gerando_imagens'],
    label: 'Gerando imagens',
    completadoApos: ['aguardando_aprovacao', 'agendado', 'postando', 'postado'],
  },
  {
    status: ['aguardando_aprovacao'],
    label: 'Aguardando aprovação',
    completadoApos: ['agendado', 'postando', 'postado'],
  },
  {
    status: ['agendado', 'postando'],
    label: 'Post agendado',
    completadoApos: ['postado'],
  },
  {
    status: ['postado'],
    label: 'Publicado no Instagram',
    completadoApos: [],
  },
]

interface ProgressStepsProps {
  status: PostStatus
  progresso?: string | null // "3/7" para imagens
}

export function ProgressSteps({ status, progresso }: ProgressStepsProps) {
  return (
    <div className="space-y-3">
      {ETAPAS.map((etapa, index) => {
        const isAtivo = etapa.status.includes(status)
        const isConcluido = etapa.completadoApos.includes(status)
        const isPendente = !isAtivo && !isConcluido

        return (
          <div
            key={index}
            className={cn(
              'flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300',
              isAtivo && 'bg-blue-400/5 border border-blue-400/20',
              isConcluido && 'opacity-70'
            )}
          >
            {/* Ícone de status */}
            {isConcluido ? (
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            ) : isAtivo ? (
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
            )}

            {/* Label da etapa */}
            <span
              className={cn(
                'text-sm',
                isConcluido && 'text-muted-foreground line-through',
                isAtivo && 'text-blue-400 font-medium',
                isPendente && 'text-muted-foreground/50'
              )}
            >
              {etapa.label}
              {/* Progresso das imagens inline */}
              {isAtivo && etapa.status.includes('gerando_imagens') && progresso && (
                <span className="ml-2 text-xs opacity-70">({progresso})</span>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
