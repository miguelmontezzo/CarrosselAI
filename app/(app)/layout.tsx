// ═══════════════════════════════════════════════════════════════
// app/(app)/layout.tsx — Layout das páginas autenticadas
// Sidebar no desktop, bottom nav + drawer no mobile
// ═══════════════════════════════════════════════════════════════
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar — visível só no desktop */}
      <Sidebar />

      {/* Header mobile — visível só no mobile */}
      <MobileHeader />

      {/* Conteúdo principal */}
      <main className="md:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Bottom navigation mobile */}
      <BottomNav />
    </div>
  )
}
