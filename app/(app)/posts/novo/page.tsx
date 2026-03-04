// ═══════════════════════════════════════════════════════════════
// app/posts/novo/page.tsx — Formulário de criação de novo post
// Toggle entre "Colar Link" e "Digitar Tema"
// ═══════════════════════════════════════════════════════════════
import { NovoPostForm } from '@/components/posts/NovoPostForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/server'

// Força a página a ser sempre dinâmica, sem cache do Next.js
// Isso garante que os estilos criados recentemente apareçam imediatamente na lista
export const dynamic = 'force-dynamic'

export default async function NovoPostPage() {
  const supabase = createServiceClient()
  const { data: styleModels } = await supabase
    .from('style_models')
    .select('id, nome, ativo')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Navegação de volta */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Dashboard
      </Link>

      {/* Cabeçalho */}
      <div>
        <h1 className="titulo-bebas text-4xl text-gradient">
          Novo Carrossel
        </h1>
        <p className="text-muted-foreground mt-1">
          Cole um link de notícia ou digite um tema para gerar seu carrossel
        </p>
      </div>

      {/* Formulário principal (componente client) */}
      <NovoPostForm styleModels={styleModels || []} />
    </div>
  )
}
