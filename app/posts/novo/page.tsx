// ═══════════════════════════════════════════════════════════════
// app/posts/novo/page.tsx — Formulário de criação de novo post
// Toggle entre "Colar Link" e "Digitar Tema"
// ═══════════════════════════════════════════════════════════════
import { NovoPostForm } from '@/components/posts/NovoPostForm'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NovoPostPage() {
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
      <NovoPostForm />
    </div>
  )
}
