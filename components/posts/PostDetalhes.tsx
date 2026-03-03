'use client'
// ═══════════════════════════════════════════════════════════════
// components/posts/PostDetalhes.tsx — Página de detalhes com Realtime
// Status ao vivo, preview slides, legenda editável, aprovação
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle,
  XCircle,
  Calendar,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProgressSteps } from './ProgressSteps'
import { SlideGrid } from './SlideGrid'
import { LegendaEditor } from './LegendaEditor'
import { StatusBadge } from '../dashboard/StatusBadge'
import { toast } from '@/components/ui/use-toast'
import type { Post, Slide } from '@/types'
import { cn } from '@/lib/utils'

interface PostDetalhesProps {
  initialPost: Post
  initialSlides: Slide[]
}

export function PostDetalhes({ initialPost, initialSlides }: PostDetalhesProps) {
  const router = useRouter()
  const supabase = createClient()

  // Estado local — atualizado pelo Realtime
  const [post, setPost] = useState<Post>(initialPost)
  const [slides, setSlides] = useState<Slide[]>(initialSlides)
  const [legenda, setLegenda] = useState(initialPost.legenda ?? '')
  const [agendadoPara, setAgendadoPara] = useState('')
  const [aprovando, setAprovando] = useState(false)

  // ─── Supabase Realtime para post e slides ──────────────────────
  useEffect(() => {
    // Canal para o post específico
    const canalPost = supabase
      .channel(`post-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts',
          filter: `id=eq.${post.id}`,
        },
        (payload) => {
          const postAtualizado = payload.new as Post
          setPost(postAtualizado)

          // Atualiza a legenda se foi gerada pelo backend
          if (postAtualizado.legenda && !legenda) {
            setLegenda(postAtualizado.legenda)
          }
        }
      )
      .subscribe()

    // Canal para slides do post (novos slides chegando)
    const canalSlides = supabase
      .channel(`slides-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'slides',
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          const novoSlide = payload.new as Slide
          setSlides((prev) => {
            // Evita duplicatas
            if (prev.find((s) => s.id === novoSlide.id)) return prev
            return [...prev, novoSlide].sort((a, b) => a.numero - b.numero)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canalPost)
      supabase.removeChannel(canalSlides)
    }
  }, [post.id, supabase]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Aprovar e agendar o post ──────────────────────────────────
  async function handleAprovar() {
    if (!legenda.trim()) {
      toast({ title: 'Legenda obrigatória', description: 'Adicione uma legenda antes de aprovar.', variant: 'destructive' })
      return
    }

    setAprovando(true)
    try {
      const response = await fetch('/api/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post.id,
          legenda,
          agendado_para: agendadoPara || undefined,
        }),
      })

      if (!response.ok) {
        const erro = await response.json()
        throw new Error(erro.error)
      }

      const resultado = await response.json()

      if (resultado.status === 'agendado') {
        toast({
          title: 'Post agendado!',
          description: `Será publicado em ${format(new Date(agendadoPara), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}`,
        })
      } else {
        toast({ title: 'Publicando no Instagram...', description: 'O post está sendo publicado agora.' })
      }

      router.push('/dashboard')
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : 'Erro ao aprovar'
      toast({ title: 'Erro ao aprovar', description: msg, variant: 'destructive' })
    } finally {
      setAprovando(false)
    }
  }

  // ─── Reprovar e refazer ────────────────────────────────────────
  async function handleReprovar() {
    router.push('/posts/novo')
  }

  // ─── Determina se pode aprovar ─────────────────────────────────
  const podeAprovar = post.status === 'aguardando_aprovacao'
  const estaGerandoOuProcessando = [
    'gerando', 'extraindo', 'gerando_prompts', 'gerando_imagens'
  ].includes(post.status)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ─── Coluna esquerda: Status e progresso ───────────────── */}
      <div className="space-y-4">
        {/* Card de status atual */}
        <div className="card-dark space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Status do Post</h3>
            <StatusBadge status={post.status} progresso={post.progresso_imagens} />
          </div>

          {/* Etapas visuais de progresso */}
          <ProgressSteps
            status={post.status}
            progresso={post.progresso_imagens}
          />
        </div>

        {/* Mensagem de erro */}
        {post.status === 'erro' && post.erro_mensagem && (
          <div className="card-dark border-red-400/20 bg-red-400/5 space-y-2">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Erro no processamento</span>
            </div>
            <p className="text-xs text-muted-foreground">{post.erro_mensagem}</p>
            <button
              onClick={handleReprovar}
              className="btn-secondary text-sm py-2"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Ações de aprovação */}
        {podeAprovar && (
          <div className="card-dark space-y-4">
            <h3 className="font-semibold text-sm">Agendar Publicação</h3>

            {/* Seletor de data/hora */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Data e hora (deixe vazio para postar agora)
              </label>
              <input
                type="datetime-local"
                value={agendadoPara}
                onChange={(e) => setAgendadoPara(e.target.value)}
                className="input-dark text-sm"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            {/* Botão aprovar */}
            <button
              onClick={handleAprovar}
              disabled={aprovando}
              className="btn-primary w-full justify-center"
            >
              {aprovando ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              {agendadoPara ? 'Aprovar e Agendar' : 'Aprovar e Postar Agora'}
            </button>

            {/* Botão reprovar */}
            <button
              onClick={handleReprovar}
              className="btn-secondary w-full justify-center text-sm"
            >
              <XCircle className="w-4 h-4 text-muted-foreground" />
              Reprovar e Refazer
            </button>
          </div>
        )}
      </div>

      {/* ─── Coluna direita: Slides e legenda ──────────────────── */}
      <div className="lg:col-span-2 space-y-6">
        {/* Grid de slides */}
        {slides.length > 0 ? (
          <div className="card-dark space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">
                Slides ({slides.length}/{post.num_slides})
              </h3>
              <p className="text-xs text-muted-foreground">
                Arraste para reordenar
              </p>
            </div>
            <SlideGrid slides={slides} />
          </div>
        ) : estaGerandoOuProcessando ? (
          /* Skeleton de slides enquanto gera */
          <div className="card-dark space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span className="text-sm text-muted-foreground">
                Gerando slides...
              </span>
            </div>
            <div className="slides-grid">
              {Array.from({ length: post.num_slides }).map((_, i) => (
                <div key={i} className="slide-preview skeleton" />
              ))}
            </div>
          </div>
        ) : null}

        {/* Editor de legenda */}
        {(legenda || podeAprovar) && (
          <div className="card-dark">
            <LegendaEditor
              postId={post.id}
              titulo={post.titulo ?? ''}
              legenda={legenda}
              slides={slides}
              handle={post.handle}
              onChange={setLegenda}
            />
          </div>
        )}

        {/* Info do post após publicação */}
        {post.status === 'postado' && post.instagram_post_id && (
          <div className="card-dark border-green-400/20 bg-green-400/5 space-y-2">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Publicado no Instagram!</span>
            </div>
            {post.posted_at && (
              <p className="text-xs text-muted-foreground">
                Publicado em{' '}
                {format(new Date(post.posted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              ID do post: {post.instagram_post_id}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
