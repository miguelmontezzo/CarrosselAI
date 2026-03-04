// ═══════════════════════════════════════════════════════════════
// app/estilos/page.tsx — Gerenciamento de estilos visuais
// Upload de imagens de referência → GPT-4 Vision analisa → salva style_model
// ═══════════════════════════════════════════════════════════════
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EstilosForm } from '@/components/estilos/EstilosForm'
import { createClient } from '@/lib/supabase/server'
import type { StyleModel } from '@/types'

async function buscarEstilos(): Promise<StyleModel[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('style_models')
    .select('*')
    .order('created_at', { ascending: false })
  return (data as StyleModel[]) ?? []
}

export default async function EstilosPage() {
  const estilos = await buscarEstilos()

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Dashboard
      </Link>

      <div>
        <h1 className="titulo-bebas text-4xl text-gradient">
          Estilos Visuais
        </h1>
        <p className="text-muted-foreground mt-1">
          Faça upload de imagens de referência e o GPT-4 Vision vai aprender seu estilo
        </p>
      </div>

      <EstilosForm estilosExistentes={estilos} />
    </div>
  )
}
