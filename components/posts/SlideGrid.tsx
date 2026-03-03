'use client'
// ═══════════════════════════════════════════════════════════════
// components/posts/SlideGrid.tsx — Grid de slides com DnD para reordenar
// Usa @dnd-kit para drag and drop sem dependências pesadas
// ═══════════════════════════════════════════════════════════════
import { useState } from 'react'
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
import { SlidePreview } from './SlidePreview'
import type { Slide } from '@/types'
import { GripVertical } from 'lucide-react'

// ─── Slide sortável (wrapper para DnD) ─────────────────────────
function SortableSlide({
  slide,
  isAtivo,
  onSelect,
}: {
  slide: Slide
  isAtivo: boolean
  onSelect: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {/* Handle de arrastar */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 right-1 z-20 w-6 h-6 rounded bg-black/50 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3 h-3 text-white" />
      </div>

      <SlidePreview slide={slide} isAtivo={isAtivo} onSelect={onSelect} />
    </div>
  )
}

// ─── Grid principal ─────────────────────────────────────────────
interface SlideGridProps {
  slides: Slide[]
  onReorder?: (slides: Slide[]) => void
}

export function SlideGrid({ slides: initialSlides, onReorder }: SlideGridProps) {
  const [slides, setSlides] = useState<Slide[]>(initialSlides)
  const [slideAtivo, setSlideAtivo] = useState<string | null>(
    initialSlides[0]?.id ?? null
  )

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

    // Renumera os slides após reordenação
    const slidesRenumerados = novosSlides.map((s, i) => ({
      ...s,
      numero: i + 1,
    }))

    setSlides(slidesRenumerados)
    onReorder?.(slidesRenumerados)
  }

  return (
    <div className="space-y-4">
      {/* Grid de thumbnails (todos os slides) */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slides.map((s) => s.id)}
          strategy={rectSortingStrategy}
        >
          <div className="slides-grid">
            {slides.map((slide) => (
              <SortableSlide
                key={slide.id}
                slide={slide}
                isAtivo={slideAtivo === slide.id}
                onSelect={() => setSlideAtivo(slide.id)}
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
                <h4 className="text-sm font-medium text-muted-foreground">
                  Slide {slide.numero} — Detalhes
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  {/* Preview maior */}
                  <div className="slide-preview max-w-[200px]">
                    <SlidePreview slide={slide} />
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
  )
}
