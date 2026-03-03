'use client'
// ═══════════════════════════════════════════════════════════════
// components/dashboard/PostCard.tsx — Card individual de post
// Mostra preview do primeiro slide, status, progresso e link
// ═══════════════════════════════════════════════════════════════
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowRight, Calendar, Link as LinkIcon } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import type { Post } from '@/types'
import { statusToProgress } from '@/types'

interface PostCardProps {
  post: Post
}

export function PostCard({ post }: PostCardProps) {
  const tempoRelativo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: ptBR,
  })

  const progresso = statusToProgress(post.status)
  const isCarregando = progresso > 0 && progresso < 80

  return (
    <Link href={`/posts/${post.id}`}>
      <div className="card-dark card-glow cursor-pointer transition-all duration-200 hover:border-border/80 group">
        <div className="flex gap-4">
          {/* Preview do primeiro slide */}
          <div className="slide-preview w-20 h-[100px] shrink-0 rounded-lg overflow-hidden bg-black/50">
            {/* Placeholder cinza enquanto sem imagem */}
            <div className="w-full h-full skeleton" />
          </div>

          {/* Conteúdo do card */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Título e status */}
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {post.titulo ?? 'Gerando conteúdo...'}
              </h3>
              <StatusBadge
                status={post.status}
                progresso={post.progresso_imagens}
              />
            </div>

            {/* Informações secundárias */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{post.handle}</span>
              <span>·</span>
              <span>{post.num_slides} slides</span>
              <span>·</span>
              <span>{tempoRelativo}</span>
            </div>

            {/* Link fonte ou tema */}
            {post.link_fonte && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LinkIcon className="w-3 h-3" />
                <span className="truncate">{new URL(post.link_fonte).hostname}</span>
              </div>
            )}

            {/* Data de agendamento */}
            {post.agendado_para && post.status === 'agendado' && (
              <div className="flex items-center gap-1.5 text-xs text-purple-400">
                <Calendar className="w-3 h-3" />
                <span>
                  {new Date(post.agendado_para).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            )}

            {/* Barra de progresso para posts em geração */}
            {isCarregando && (
              <ProgressBar progresso={progresso} />
            )}
          </div>

          {/* Seta de navegação */}
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 self-center" />
        </div>
      </div>
    </Link>
  )
}
