'use client'
// ═══════════════════════════════════════════════════════════════
// components/layout/Sidebar.tsx — Navegação lateral fixa
// ═══════════════════════════════════════════════════════════════
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Plus,
  Sparkles,
  Palette,
  LogOut,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { logout } from '@/app/login/actions'

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
    destaque: true,
  },
  {
    href: '/estilos',
    icon: Palette,
    label: 'Estilos Visuais',
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

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

      {/* Rodapé — usuário + logout */}
      <div className="p-4 border-t border-border space-y-2">
        {/* Info do usuário */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/50">
          <User className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{email ?? '...'}</p>
            <p className="text-xs text-muted-foreground">Logado</p>
          </div>
        </div>

        {/* Botão logout */}
        <form action={logout}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}
