// ═══════════════════════════════════════════════════════════════
// components/dashboard/DashboardStats.tsx — Cards de estatísticas
// ═══════════════════════════════════════════════════════════════
import { CheckCircle, Clock, Loader2, Calendar, LayoutGrid } from 'lucide-react'

interface Stats {
  total: number
  postados: number
  agendados: number
  aguardando: number
  gerando: number
}

export function DashboardStats({ stats }: { stats: Stats }) {
  const cards = [
    {
      label: 'Total de Posts',
      value: stats.total,
      icon: LayoutGrid,
      color: 'text-foreground',
      bg: 'bg-secondary',
    },
    {
      label: 'Postados',
      value: stats.postados,
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      label: 'Agendados',
      value: stats.agendados,
      icon: Calendar,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
    {
      label: 'Aguardando',
      value: stats.aguardando,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
    },
    {
      label: 'Gerando',
      value: stats.gerando,
      icon: Loader2,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
      animate: stats.gerando > 0,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="card-dark flex items-center gap-4 py-4"
        >
          <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
            <card.icon
              className={`w-5 h-5 ${card.color} ${card.animate ? 'animate-spin' : ''}`}
            />
          </div>
          <div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
