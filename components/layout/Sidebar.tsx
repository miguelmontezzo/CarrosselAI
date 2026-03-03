'use client'
// ═══════════════════════════════════════════════════════════════
// components/layout/Sidebar.tsx — Navegação lateral fixa
// ═══════════════════════════════════════════════════════════════
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Plus,
  Sparkles,
  Palette,
  Instagram,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    href: '/posts/novo',
    icon: Plus,
    label: 'Novo Post',
    destaque: true, // Aparece com fundo laranja
  },
  {
    href: '/estilos',
    icon: Palette,
    label: 'Estilos Visuais',
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-card border-r border-border flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="titulo-bebas text-xl text-gradient">
              CarrosselAI
            </span>
            <p className="text-xs text-muted-foreground -mt-1">
              Posts automáticos IA
            </p>
          </div>
        </Link>
      </div>

      {/* Navegação principal */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                item.destaque
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Rodapé da sidebar */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/50">
          <Instagram className="w-5 h-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">@miguelito.ai</p>
            <p className="text-xs text-muted-foreground">Conta conectada</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
