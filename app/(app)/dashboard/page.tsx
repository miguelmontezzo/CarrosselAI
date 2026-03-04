// ═══════════════════════════════════════════════════════════════
// app/dashboard/page.tsx — Dashboard principal do CarrosselAI
// Lista todos os posts com status em tempo real via Supabase Realtime
// ═══════════════════════════════════════════════════════════════
import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { PostList } from '@/components/dashboard/PostList'
import { DashboardStats } from '@/components/dashboard/DashboardStats'
import type { Post } from '@/types'

// Revalida a cada 30s para manter dados frescos (Realtime cuida do resto)
export const revalidate = 30

async function buscarPosts(): Promise<Post[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[Dashboard] Erro ao buscar posts:', error)
    return []
  }

  const posts = data as Post[]

  // Busca o primeiro slide de cada post para usar como capa
  if (posts.length > 0) {
    const { data: capas } = await supabase
      .from('slides')
      .select('post_id, image_url')
      .in('post_id', posts.map((p) => p.id))
      .eq('numero', 1)

    if (capas) {
      const capaMap = Object.fromEntries(capas.map((c) => [c.post_id, c.image_url]))
      posts.forEach((p) => { p.capa_url = capaMap[p.id] ?? null })
    }
  }

  return posts
}

export default async function DashboardPage() {
  const posts = await buscarPosts()

  // Contadores para as estatísticas do topo
  const stats = {
    total: posts.length,
    postados: posts.filter((p) => p.status === 'postado').length,
    agendados: posts.filter((p) => p.status === 'agendado').length,
    aguardando: posts.filter((p) => p.status === 'aguardando_aprovacao').length,
    gerando: posts.filter((p) =>
      ['gerando', 'extraindo', 'gerando_prompts', 'gerando_imagens'].includes(p.status)
    ).length,
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header do Dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="titulo-bebas text-5xl text-gradient">
            CarrosselAI
          </h1>
          <p className="text-muted-foreground mt-1">
            Seus carrosseis para Instagram, gerados com IA
          </p>
        </div>

        <Link
          href="/posts/novo"
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          Novo Post
        </Link>
      </div>

      {/* Cards de estatísticas */}
      <DashboardStats stats={stats} />

      {/* Lista de posts com Realtime */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Seus Posts</h2>
          {posts.length > 0 && (
            <span className="text-sm text-muted-foreground">
              ({posts.length})
            </span>
          )}
        </div>

        {posts.length === 0 ? (
          /* Estado vazio — convida o usuário a criar o primeiro post */
          <div className="card-dark text-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Nenhum post ainda
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Crie seu primeiro carrossel para Instagram com IA em menos de 2 minutos.
            </p>
            <Link href="/posts/novo" className="btn-primary inline-flex">
              <Plus className="w-5 h-5" />
              Criar Primeiro Post
            </Link>
          </div>
        ) : (
          // Lista de posts (componente client com Realtime)
          <PostList initialPosts={posts} />
        )}
      </div>
    </div>
  )
}
