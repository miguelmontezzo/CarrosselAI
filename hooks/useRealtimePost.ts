'use client'
// ═══════════════════════════════════════════════════════════════
// hooks/useRealtimePost.ts — Hook para escutar updates de um post
// via Supabase Realtime em tempo real
// ═══════════════════════════════════════════════════════════════
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Post, Slide } from '@/types'

interface UseRealtimePostOptions {
  postId: string
  onPostUpdate?: (post: Post) => void
  onSlideInserted?: (slide: Slide) => void
}

/**
 * Escuta mudanças em tempo real em um post e seus slides
 * Chama callbacks quando há atualizações
 */
export function useRealtimePost({
  postId,
  onPostUpdate,
  onSlideInserted,
}: UseRealtimePostOptions) {
  const supabase = createClient()

  useEffect(() => {
    if (!postId) return

    // Canal para o post
    const canalPost = supabase
      .channel(`realtime-post-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${postId}`,
        },
        (payload) => {
          onPostUpdate?.(payload.new as Post)
        }
      )
      .subscribe()

    // Canal para slides do post
    const canalSlides = supabase
      .channel(`realtime-slides-${postId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'slides',
          filter: `post_id=eq.${postId}`,
        },
        (payload) => {
          onSlideInserted?.(payload.new as Slide)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canalPost)
      supabase.removeChannel(canalSlides)
    }
  }, [postId]) // eslint-disable-line react-hooks/exhaustive-deps
}
