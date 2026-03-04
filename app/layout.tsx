// ═══════════════════════════════════════════════════════════════
// app/layout.tsx — Layout raiz (shell mínimo)
// Sidebar e navegação ficam no layout de (app)
// ═══════════════════════════════════════════════════════════════
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'CarrosselAI — Carrosseis para Instagram com IA',
  description: 'Gere carrosseis virais para Instagram automaticamente com IA',
  keywords: 'Instagram, carrossel, IA, automação, marketing',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CarrosselAI',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'CarrosselAI',
    description: 'Carrosseis para Instagram com IA',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  )
}
