// ═══════════════════════════════════════════════════════════════
// app/layout.tsx — Layout raiz do CarrosselAI
// Configura fontes, tema escuro e estrutura da sidebar
// ═══════════════════════════════════════════════════════════════
import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'CarrosselAI — Carrosseis para Instagram com IA',
  description:
    'Gere carrosseis virais para Instagram automaticamente com GPT-4o e Nanobana 2',
  keywords: 'Instagram, carrossel, IA, GPT-4, automação, marketing',
  openGraph: {
    title: 'CarrosselAI',
    description: 'Carrosseis para Instagram com IA',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        {/* Bebas Neue para títulos dramáticos dos slides */}
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <div className="flex min-h-screen">
          {/* Sidebar de navegação lateral */}
          <Sidebar />

          {/* Conteúdo principal */}
          <main className="flex-1 ml-64 min-h-screen">
            <div className="p-8">
              {children}
            </div>
          </main>
        </div>

        {/* Toast notifications globais */}
        <Toaster />
      </body>
    </html>
  )
}
