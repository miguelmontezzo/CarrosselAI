// ═══════════════════════════════════════════════════════════════
// store/postStore.ts — Estado global com Zustand
// Gerencia estado compartilhado de posts e UI
// ═══════════════════════════════════════════════════════════════
import { create } from 'zustand'
import type { Post, Slide } from '@/types'

interface PostStore {
  // Post atualmente em visualização
  postAtual: Post | null
  slidesAtuais: Slide[]

  // Ações
  setPostAtual: (post: Post | null) => void
  setSlidesAtuais: (slides: Slide[]) => void
  atualizarPostAtual: (updates: Partial<Post>) => void
  adicionarSlide: (slide: Slide) => void

  // Filtros do dashboard
  filtroStatus: string | null
  setFiltroStatus: (status: string | null) => void
}

export const usePostStore = create<PostStore>((set) => ({
  postAtual: null,
  slidesAtuais: [],
  filtroStatus: null,

  setPostAtual: (post) => set({ postAtual: post }),

  setSlidesAtuais: (slides) =>
    set({ slidesAtuais: [...slides].sort((a, b) => a.numero - b.numero) }),

  // Atualiza campos específicos do post atual sem sobrescrever tudo
  atualizarPostAtual: (updates) =>
    set((state) => ({
      postAtual: state.postAtual ? { ...state.postAtual, ...updates } : null,
    })),

  // Adiciona slide sem duplicatas, mantendo ordem
  adicionarSlide: (slide) =>
    set((state) => {
      if (state.slidesAtuais.find((s) => s.id === slide.id)) {
        return state // Já existe
      }
      return {
        slidesAtuais: [...state.slidesAtuais, slide].sort(
          (a, b) => a.numero - b.numero
        ),
      }
    }),

  setFiltroStatus: (status) => set({ filtroStatus: status }),
}))
