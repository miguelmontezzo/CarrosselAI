// ═══════════════════════════════════════════════════════════════
// app/posts/[id]/page.tsx — Página de detalhes e aprovação do post
// Status em tempo real, preview dos slides, edição de legenda
// ═══════════════════════════════════════════════════════════════
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PostDetalhes } from '@/components/posts/PostDetalhes'
import type { Post, Slide, StyleJson } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

async function buscarPost(id: string): Promise<{ post: Post; styleJson: StyleJson | null } | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .select('*, style_models(style_json)')
    .eq('id', id)
    .single()

  if (error || !data) return null

  const styleJson = (data as any).style_models?.style_json ?? null
  const post = { ...data, style_models: undefined } as Post
  return { post, styleJson }
}

async function buscarSlides(postId: string): Promise<Slide[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('slides')
    .select('*')
    .eq('post_id', postId)
    .order('numero', { ascending: true })

  if (error || !data) return []
  return data as Slide[]
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params

  // Busca o post e seus slides em paralelo
  const [resultado, slides] = await Promise.all([
    buscarPost(id),
    buscarSlides(id),
  ])

  if (!resultado) {
    notFound()
  }

  const { post, styleJson } = resultado

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Navegação de volta */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Dashboard
      </Link>

      {/* Cabeçalho com título do post */}
      <div>
        <h1 className="titulo-bebas text-4xl text-gradient">
          {post.titulo ?? 'Carrossel em Geração'}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          ID: {post.id} · Criado em{' '}
          <span suppressHydrationWarning>
            {new Date(post.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </p>
      </div>

      {/* Componente client com Realtime, preview, aprovação */}
      <PostDetalhes initialPost={post} initialSlides={slides} initialStyleJson={styleJson} />
    </div>
  )
}
