'use client'
// ═══════════════════════════════════════════════════════════════
// components/posts/SlideGrid.tsx — Grid de slides com DnD para reordenar
// Usa @dnd-kit para drag and drop sem dependências pesadas
// ═══════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { SlidePreview } from './SlidePreview'
import type { Slide, StyleJson } from '@/types'
import { GripVertical, Maximize2, Loader2, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Slide sortável (wrapper para DnD) ─────────────────────────
function SortableSlide({
  slide,
  isAtivo,
  onSelect,
  style,
}: {
  slide: Slide
  isAtivo: boolean
  onSelect: () => void
  style?: StyleJson | null
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={dndStyle} className="relative group">
      {/* Handle de arrastar */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 z-20 w-6 h-6 rounded bg-black/50 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3 h-3 text-white" />
      </div>

      <SlidePreview slide={slide} isAtivo={isAtivo} onSelect={onSelect} style={style} />
    </div>
  )
}

// ─── Modal Carrossel ──────────────────────────────────────────────
function CarrosselModal({
  slides,
  initialIndex,
  onClose,
}: {
  slides: Slide[]
  initialIndex: number
  onClose: () => void
}) {
  const [index, setIndex] = useState(initialIndex)
  const [baixando, setBaixando] = useState(false)
  const slide = slides[index]
  const total = slides.length

  const anterior = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total])
  const proximo = useCallback(() => setIndex((i) => (i + 1) % total), [total])

  // Navegação por teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') anterior()
      else if (e.key === 'ArrowRight') proximo()
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [anterior, proximo, onClose])

  async function handleDownload(e: React.MouseEvent) {
    e.stopPropagation()
    if (!slide.image_url) return
    setBaixando(true)
    try {
      const { downloadSingleImage } = await import('@/lib/download')
      await downloadSingleImage(slide.image_url, `slide-${slide.numero}.jpg`)
    } catch (err) {
      console.error(err)
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Topo — contador + ações */}
      <div className="absolute top-6 left-0 right-0 flex items-center justify-between px-6">
        <span className="text-white/60 text-sm font-medium">
          {index + 1} / {total}
        </span>
        <div className="flex gap-3">
          {slide.image_url && (
            <button
              onClick={handleDownload}
              disabled={baixando}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              {baixando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download
            </button>
          )}
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Imagem central */}
      <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
        {/* Botão anterior */}
        <button
          onClick={anterior}
          className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <img
          src={slide.image_url || '/placeholder.png'}
          alt={`Slide ${slide.numero}`}
          className="max-w-[min(420px,80vw)] max-h-[80vh] object-contain rounded-xl shadow-2xl"
        />

        {/* Botão próximo */}
        <button
          onClick={proximo}
          className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition shrink-0"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Dots de navegação */}
      <div className="flex gap-2 mt-5" onClick={(e) => e.stopPropagation()}>
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              'w-2 h-2 rounded-full transition-all',
              i === index ? 'bg-white w-5' : 'bg-white/30'
            )}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Grid principal ─────────────────────────────────────────────
interface SlideGridProps {
  slides: Slide[]
  onReorder?: (slides: Slide[]) => void
  style?: StyleJson | null
}

export function SlideGrid({ slides: initialSlides, onReorder, style }: SlideGridProps) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides)
  const [slideAtivo, setSlideAtivo] = useState<string | null>(
    initialSlides[0]?.id ?? null
  )
  const [modalOpenIndex, setModalOpenIndex] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Evita drag acidental no click
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = slides.findIndex((s) => s.id === active.id)
    const newIndex = slides.findIndex((s) => s.id === over.id)
    const novosSlides = arrayMove(slides, oldIndex, newIndex)
    const slidesRenumerados = novosSlides.map((s, i) => ({ ...s, numero: i + 1 }))
    setSlides(slidesRenumerados)
    onReorder?.(slidesRenumerados)
  }

  return (
    <>
      <div className="space-y-4">
        {/* Grid de thumbnails (todos os slides) */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slides.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="slides-grid">
              {slides.map((slide) => (
                <SortableSlide
                  key={slide.id}
                  slide={slide}
                  isAtivo={slideAtivo === slide.id}
                  onSelect={() => setSlideAtivo(slide.id)}
                  style={style}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Preview ampliado do slide selecionado */}
        {slideAtivo && (
          <div className="mt-4">
            {(() => {
              const slide = slides.find((s) => s.id === slideAtivo)
              if (!slide) return null

              return (
                <div className="card-dark space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex justify-between items-center">
                    <span>Slide {slide.numero} — Detalhes</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Preview maior (Clicável para expandir) */}
                    <div
                      className="slide-preview max-w-[200px] cursor-pointer group relative"
                      onClick={() => setModalOpenIndex(slides.findIndex((s) => s.id === slide.id))}
                    >
                      <SlidePreview slide={slide} style={style} />
                      {/* Overlay hover icon */}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-[34px]">
                        <Maximize2 className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Textos do slide */}
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Headline</p>
                        <p className="font-bold titulo-bebas text-lg leading-tight">
                          {slide.headline}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Body</p>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {slide.body}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">CTA</p>
                        <p className="text-xs text-primary font-medium">{slide.cta}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}
      </div>

      {modalOpenIndex !== null && (
        <CarrosselModal
          slides={slides}
          initialIndex={modalOpenIndex}
          onClose={() => setModalOpenIndex(null)}
        />
      )}
    </>
  )
}
