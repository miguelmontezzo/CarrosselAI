'use client'
// ═══════════════════════════════════════════════════════════════
// components/dashboard/PostList.tsx — Lista de posts com Realtime
// Supabase Realtime atualiza os posts ao vivo sem refresh da página
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PostCard } from './PostCard'
import { ModalExcluirPost } from './ModalExcluirPost'
import type { Post } from '@/types'

interface PostListProps {
  initialPosts: Post[]
}

export function PostList({ initialPosts }: PostListProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [postParaExcluir, setPostParaExcluir] = useState<Post | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // ─── Supabase Realtime subscription ──────────────────────────
    // Escuta qualquer mudança na tabela posts em tempo real
    const channel = supabase
      .channel('posts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'posts',
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          if (eventType === 'INSERT') {
            // Novo post criado — adiciona no topo da lista
            setPosts((prev) => [newRecord as Post, ...prev])
          } else if (eventType === 'UPDATE') {
            // Post atualizado — atualiza na lista
            setPosts((prev) =>
              prev.map((p) => (p.id === newRecord.id ? (newRecord as Post) : p))
            )
          } else if (eventType === 'DELETE') {
            // Post deletado — remove da lista
            setPosts((prev) => prev.filter((p) => p.id !== oldRecord.id))
          }
        }
      )
      .subscribe()

    // Cleanup: remove o listener ao desmontar o componente
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  function handlePostDeleted(postId: string) {
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum post encontrado
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onDelete={(p) => setPostParaExcluir(p)}
          />
        ))}
      </div>

      {/* Modal de confirmação de exclusão */}
      <ModalExcluirPost
        postId={postParaExcluir?.id ?? ''}
        postTitulo={postParaExcluir?.titulo ?? null}
        open={postParaExcluir !== null}
        onClose={() => setPostParaExcluir(null)}
        onDeleted={handlePostDeleted}
      />
    </>
  )
}
