'use client'
// ═══════════════════════════════════════════════════════════════
// components/posts/SlidePreview.tsx — Preview individual de slide 4:5
// Mostra imagem gerada ou skeleton enquanto carrega
// ═══════════════════════════════════════════════════════════════
import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Slide, StyleJson } from '@/types'

interface SlidePreviewProps {
  slide: Slide
  isAtivo?: boolean       // Slide selecionado/em foco
  onSelect?: () => void
  style?: StyleJson | null
}

export function SlidePreview({ slide, isAtivo, onSelect, style }: SlidePreviewProps) {
  const [imagemCarregada, setImagemCarregada] = useState(false)

  return (
    <div
      onClick={onSelect}
      className={cn(
        'slide-preview cursor-pointer transition-all duration-200',
        isAtivo
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
          : 'hover:ring-1 hover:ring-border'
      )}
    >
      {/* Número do slide */}
      <div className="absolute top-2 left-2 z-10 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center">
        <span className="text-xs font-bold text-white">{slide.numero}</span>
      </div>

      {slide.image_url ? (
        <>
          {/* Skeleton enquanto a imagem carrega */}
          {!imagemCarregada && (
            <div className="absolute inset-0 skeleton" />
          )}

          {/* Imagem gerada pela Nanobana */}
          <Image
            src={slide.image_url}
            alt={slide.headline ?? `Slide ${slide.numero}`}
            fill
            className={cn(
              'object-cover transition-opacity duration-300',
              imagemCarregada ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={() => setImagemCarregada(true)}
            sizes="(max-width: 768px) 50vw, 200px"
          />
        </>
      ) : (
        /* Placeholder enquanto imagem é gerada */
        <div className="absolute inset-0 skeleton" />
      )}

      {/* Overlay com texto — cores do estilo selecionado quando disponível */}
      {slide.headline && (
        <div
          className="absolute bottom-0 left-0 right-0 p-3"
          style={{
            background: style?.cores.fundo
              ? `linear-gradient(to top, ${style.cores.fundo}ee, ${style.cores.fundo}88, transparent)`
              : 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.5), transparent)',
          }}
        >
          <p
            className="text-xs font-bold leading-tight titulo-bebas"
            style={{
              fontSize: '11px',
              letterSpacing: '0.02em',
              color: style?.cores.texto_principal ?? '#ffffff',
            }}
          >
            {slide.headline}
          </p>
        </div>
      )}
    </div>
  )
}
