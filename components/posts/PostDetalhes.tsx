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
  Download,
  BadgeCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProgressSteps } from './ProgressSteps'
import { SlideGrid } from './SlideGrid'
import { LegendaEditor } from './LegendaEditor'
import { StatusBadge } from '../dashboard/StatusBadge'
import { toast } from '@/components/ui/use-toast'
import type { Post, Slide, StyleJson } from '@/types'
import { cn } from '@/lib/utils'

interface PostDetalhesProps {
  initialPost: Post
  initialSlides: Slide[]
  initialStyleJson?: StyleJson | null
}

export function PostDetalhes({ initialPost, initialSlides, initialStyleJson }: PostDetalhesProps) {
  const router = useRouter()
  const supabase = createClient()

  // Estado local — atualizado pelo Realtime
  const [post, setPost] = useState<Post>(initialPost)
  const [slides, setSlides] = useState<Slide[]>(initialSlides)
  const [legenda, setLegenda] = useState(initialPost.legenda ?? '')
  const [agendadoPara, setAgendadoPara] = useState('')
  const [aprovando, setAprovando] = useState(false)
  const [baixando, setBaixando] = useState(false)

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

  // ─── Trigger processamento no cliente (Gatilho para contornar Vercel Serverless) ─
  useEffect(() => {
    // Se o post acabou de ser 'criado' com status 'gerando' e estamos no browser, disparar processamento.
    // Usamos sessionStorage pra evitar chamar o fetch repetidamente em re-renders / Strict Mode
    const triggerHandled = sessionStorage.getItem(`triggered_${post.id}`)

    if (initialPost.status === 'gerando' && !triggerHandled) {
      sessionStorage.setItem(`triggered_${post.id}`, 'true')

      const searchParams = new URLSearchParams(window.location.search)
      const imageModel = searchParams.get('model') || 'nanobana-2'
      const imageRes = searchParams.get('res') || '2k'

      console.log('Disparando processamento do Client pro Vercel Edge...')
      fetch('/api/processar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id, image_model: imageModel, image_resolution: imageRes }),
      }).catch(err => {
        console.error('Erro ao disparar processamento:', err)
        toast({ title: 'Erro', description: 'Ocorreu um erro ao iniciar a IA.', variant: 'destructive' })
      })
    }
  }, [initialPost.status, post.id])

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

  // ─── Refazer apenas as imagens ─────────────────────────────────
  async function handleRefazerImagens() {
    setAprovando(true)
    try {
      const response = await fetch('/api/posts/refazer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      toast({
        title: 'Regerando Imagens',
        description: 'Enviando novos prompts com resolução 2k pro Gemini.',
      })
      // O Supabase Realtime se encarrega de transitar o status pra gente
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : 'Falha na requisição'
      toast({ title: 'Erro ao regerar', description: msg, variant: 'destructive' })
    } finally {
      setAprovando(false)
    }
  }

  // ─── Marcar como postado manualmente ──────────────────────────
  async function handleMarcarPostado() {
    setAprovando(true)
    try {
      await fetch('/api/posts/marcar-postado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post.id }),
      })
      toast({ title: 'Post marcado como postado!' })
      router.push('/dashboard')
    } catch {
      toast({ title: 'Erro ao marcar', variant: 'destructive' })
    } finally {
      setAprovando(false)
    }
  }

  // ─── Download de todas as imagens em ZIP ──────────────────────
  async function handleDownloadZip() {
    if (!slides.length) return
    setBaixando(true)
    try {
      const { downloadAllImages } = await import('@/lib/download')
      await downloadAllImages(
        slides
          .filter((s) => s.image_url)
          .map((s) => ({
            url: s.image_url!,
            nome: `slide-${s.numero}.jpg`,
          })),
        `carrossel-${post.id.slice(0, 8)}.zip`
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao baixar'
      toast({ title: 'Erro no download', description: msg, variant: 'destructive' })
    } finally {
      setBaixando(false)
    }
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
                suppressHydrationWarning
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

            {/* Marcar como postado manualmente */}
            <button
              onClick={handleMarcarPostado}
              disabled={aprovando}
              className="btn-secondary w-full justify-center text-sm text-green-400 border-green-900/50 hover:bg-green-900/20"
            >
              <BadgeCheck className="w-4 h-4" />
              Marcar como Postado (Manual)
            </button>

            {/* Ações de refação (Botão 1: Reprovar tudo - Botão 2: Reprovar só img) */}
            <div className="flex gap-2 w-full mt-2">
              <button
                onClick={handleReprovar}
                className="btn-secondary flex-1 justify-center text-sm px-2 text-center"
                title="Apaga este e cria um do zero"
              >
                <XCircle className="w-4 h-4 text-muted-foreground" />
                Descartar Todo o Post
              </button>

              <button
                onClick={handleRefazerImagens}
                disabled={aprovando}
                className="btn-secondary flex-1 justify-center text-sm px-2 text-center border-amber-900/50 hover:bg-amber-900/20"
                title="Mantém o texto e recria só as imagens no modelo"
              >
                {aprovando ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className="text-amber-500">Refazer Má Imagem</span>
              </button>
            </div>
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
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">Arraste para reordenar</p>
                <button
                  onClick={handleDownloadZip}
                  disabled={baixando || slides.every((s) => !s.image_url)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  {baixando ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  {baixando ? 'Baixando...' : 'Baixar ZIP'}
                </button>
              </div>
            </div>
            <SlideGrid slides={slides} style={initialStyleJson} />
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
                <span suppressHydrationWarning>
                  {format(new Date(post.posted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
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
