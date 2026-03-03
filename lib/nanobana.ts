// ═══════════════════════════════════════════════════════════════
// lib/nanobana.ts — Integração com Nanobana 2 API
// Gera imagens fotorrealistas 4:5 para os slides do carrossel
// ═══════════════════════════════════════════════════════════════
import type { Slide } from '@/types'

const NANOBANA_BASE_URL = 'https://api.nanobana.ai/v2'

/**
 * Gera uma única imagem via Nanobana 2 API
 * @param prompt - Prompt descritivo do slide (gerado pelo GPT-4o)
 * @returns URL da imagem gerada
 */
export async function gerarImagem(prompt: string): Promise<string> {
  const response = await fetch(`${NANOBANA_BASE_URL}/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NANOBANA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: '4:5',   // Proporção ideal para Instagram
      quality: 'high',
      style: 'photorealistic',
    }),
  })

  if (!response.ok) {
    const erro = await response.text()
    throw new Error(`Nanobana API error ${response.status}: ${erro}`)
  }

  const data = await response.json()

  if (!data.image_url) {
    throw new Error('Nanobana não retornou image_url na resposta')
  }

  return data.image_url as string
}

/**
 * Gera todas as imagens dos slides em paralelo (Promise.all)
 * Atualiza o progresso via callback a cada imagem concluída
 *
 * @param slides - Array de slides com image_prompt preenchido
 * @param onProgresso - Callback chamado a cada imagem gerada (índice, total)
 * @returns Array de URLs na mesma ordem dos slides
 */
export async function gerarTodasImagens(
  slides: Pick<Slide, 'numero' | 'image_prompt'>[],
  onProgresso?: (geradas: number, total: number) => void
): Promise<string[]> {
  const total = slides.length
  let geradas = 0

  // Gera todas em paralelo — muito mais rápido que sequencial
  const promises = slides.map(async (slide) => {
    if (!slide.image_prompt) {
      throw new Error(`Slide ${slide.numero} sem image_prompt`)
    }

    const url = await gerarImagem(slide.image_prompt)
    geradas++
    onProgresso?.(geradas, total)
    return url
  })

  return Promise.all(promises)
}

/**
 * Faz upload de uma imagem (por URL) para o Supabase Storage
 * Necessário pois o Instagram exige que as imagens sejam acessíveis publicamente
 *
 * @param imageUrl - URL da imagem gerada pela Nanobana
 * @param postId - ID do post (usado no path do storage)
 * @param slideNumero - Número do slide
 * @returns URL pública no Supabase Storage
 */
export async function salvarImagemNoStorage(
  imageUrl: string,
  postId: string,
  slideNumero: number
): Promise<string> {
  // Busca a imagem gerada
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Erro ao baixar imagem da Nanobana: ${response.status}`)
  }

  const buffer = await response.arrayBuffer()
  const blob = new Blob([buffer], { type: 'image/jpeg' })

  // Importação dinâmica para evitar import do supabase no cliente
  const { createServiceClient } = await import('./supabase/server')
  const supabase = createServiceClient()

  const path = `posts/${postId}/slide-${slideNumero}.jpg`

  const { error } = await supabase.storage
    .from('carrossel-slides')
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true, // Sobrescreve se já existir (ex: refazendo)
    })

  if (error) {
    throw new Error(`Erro ao salvar no Supabase Storage: ${error.message}`)
  }

  // Retorna URL pública do storage
  const { data: urlData } = supabase.storage
    .from('carrossel-slides')
    .getPublicUrl(path)

  return urlData.publicUrl
}
