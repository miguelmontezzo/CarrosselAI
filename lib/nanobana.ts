// ═══════════════════════════════════════════════════════════════
// lib/nanobana.ts — Integração com Nanobana API
// Gera imagens fotorrealistas 4:5 para os slides do carrossel
// ═══════════════════════════════════════════════════════════════
import type { Slide, ImageModel, ImageResolution } from '@/types'

import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.NANOBANA_API_KEY })

const GEMINI_MODEL_IDS: Record<ImageModel, string> = {
  'nanobana-2': 'gemini-3.1-flash-image-preview',
  'nanobana-pro': 'gemini-3-pro-image-preview',
}

/**
 * Gera uma única imagem via Google GenAI
 * @param prompt - Prompt descritivo do slide
 * @param model - Modelo de geração (nanobana-2 | nanobana-pro)
 * @param resolution - Resolução desejada (1k | 2k)
 * @returns Uint8Array da imagem gerada, pronto pra envio no Storage
 */
export async function gerarImagemBuffer(
  prompt: string,
  model: ImageModel = 'nanobana-2',
  resolution: ImageResolution = '2k',
  imageStylePrompt?: string
): Promise<Uint8Array> {
  try {
    const modelId = GEMINI_MODEL_IDS[model]
    const resolutionLabel = resolution === '1k' ? '1K resolution' : 'pure 2K resolution (high definition)'

    // Se tem prompt de estilo do style_model, usa como base — senão usa fallback genérico
    const styleRequirement = imageStylePrompt
      ? `STYLE: ${imageStylePrompt}`
      : 'STYLE: photorealistic, sleek, dynamic lighting, high quality, cinematic'

    const promptMelhorado = `${prompt}\n\n${styleRequirement}\nRESOLUTION: ${resolutionLabel}, extremely sharp details. Do NOT ignore these visual styling constraints.`

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [promptMelhorado],
    })

    // Itera sobre as parts conforme documentação oficial
    const parts = response.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: any) => p.inlineData?.data)

    if (!imagePart?.inlineData?.data) {
      console.error(`[Nanobana] Resposta sem inline_data. Data:`, JSON.stringify(response))
      throw new Error('Gemini não retornou data da imagem na resposta')
    }

    // Converte de base64 string para Uint8Array
    const binaryString = atob(imagePart.inlineData.data)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes

  } catch (err) {
    console.error("[Nanobana] Erro na requisição GenAI:", err)
    throw err
  }
}

/**
 * Gera todas as imagens dos slides em paralelo (Promise.all)
 * Atualiza o progresso via callback a cada imagem concluída
 *
 * @param slides - Array de slides com image_prompt preenchido
 * @param onProgresso - Callback chamado a cada imagem gerada (índice, total)
 * @returns Array de Uint8Array na mesma ordem dos slides
 */
export async function gerarTodasImagens(
  slides: Pick<Slide, 'numero' | 'image_prompt'>[],
  onProgresso?: (geradas: number, total: number) => void,
  model: ImageModel = 'nanobana-2',
  resolution: ImageResolution = '2k',
  imageStylePrompt?: string
): Promise<Uint8Array[]> {
  const total = slides.length
  let geradas = 0

  // Gera todas em paralelo
  const promises = slides.map(async (slide) => {
    if (!slide.image_prompt) {
      throw new Error(`Slide ${slide.numero} sem image_prompt`)
    }

    const buffer = await gerarImagemBuffer(slide.image_prompt, model, resolution, imageStylePrompt)
    geradas++
    onProgresso?.(geradas, total)
    return buffer
  })

  return Promise.all(promises)
}

/**
 * Faz upload de uma imagem (Buffer) para o Supabase Storage
 * Necessário pois o Instagram exige que as imagens sejam acessíveis publicamente
 *
 * @param buffer - Uint8Array da imagem gerada pelo Gemini
 * @param postId - ID do post (usado no path do storage)
 * @param slideNumero - Número do slide
 * @returns URL pública no Supabase Storage
 */
export async function salvarImagemNoStorage(
  buffer: Uint8Array,
  postId: string,
  slideNumero: number
): Promise<string> {
  const blob = new Blob([buffer as any], { type: 'image/jpeg' })

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
