// components/dashboard/StatusBadge.tsx — Badge de status animado
import { STATUS_CONFIG } from '@/types'
import type { PostStatus } from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: PostStatus
  progresso?: string | null // Ex: "3/7" para gerando_imagens
}

export function StatusBadge({ status, progresso }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  }

  // Status de carregamento piscam
  const isLoading = [
    'gerando', 'extraindo', 'gerando_prompts', 'gerando_imagens', 'postando'
  ].includes(status)

  return (
    <span
      className={cn(
        'status-badge',
        config.bgColor,
        config.color
      )}
    >
      {/* Indicador circular pulsante para status ativos */}
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full bg-current',
          isLoading && 'animate-pulse'
        )}
      />
      {config.label}
      {/* Mostra progresso das imagens inline */}
      {status === 'gerando_imagens' && progresso && (
        <span className="ml-1 opacity-70">({progresso})</span>
      )}
    </span>
  )
}
