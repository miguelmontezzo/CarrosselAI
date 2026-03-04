// ═══════════════════════════════════════════════════════════════
// lib/qstash.ts — Integração com QStash (Upstash) para agendamento
// QStash garante delivery confiável de mensagens HTTP com retry
// ═══════════════════════════════════════════════════════════════
import { Client, Receiver } from '@upstash/qstash'
import type { ImageModel, ImageResolution } from '@/types'

// Cliente para publicar mensagens no QStash
export const qstash = new Client({
  token: process.env.QSTASH_TOKEN || 'dummy_token_para_dev',
})

// Receiver para verificar assinatura das mensagens recebidas
export const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || 'dummy_sig_1',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || 'dummy_sig_2',
})

/**
 * Dispara o processamento de um post imediatamente via QStash
 * QStash chama /api/processar com retry automático em caso de falha
 *
 * @param postId - ID do post a ser processado
 * @param imageModel - Modelo de geração de imagem
 * @param imageResolution - Resolução das imagens geradas
 */
export async function dispararProcessamento(
  postId: string,
  imageModel?: ImageModel,
  imageResolution?: ImageResolution
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/processar`
  const body = { postId, image_model: imageModel, image_resolution: imageResolution }

  if (!process.env.QSTASH_TOKEN) {
    // Mock local: Chama a rota diretamente em background
    // sem esperar na request principal para simular assincronicidade
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(err => console.error('Erro no mock local de QStash', err))
    return
  }

  await qstash.publishJSON({
    url,
    body,
    retries: 3, // 3 tentativas em caso de erro
  })
}

/**
 * Agenda o post no Instagram para uma data/hora específica
 * QStash aguarda até o horário e então chama /api/postar
 *
 * @param postId - ID do post a ser publicado
 * @param agendadoPara - Data/hora desejada (ISO string)
 */
export async function agendarPost(
  postId: string,
  agendadoPara: string
): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/postar`
  const dataAgendamento = new Date(agendadoPara)
  const agora = new Date()

  // Verifica se a data é futura
  if (dataAgendamento <= agora) {
    throw new Error('Data de agendamento deve ser no futuro')
  }

  // Delay em segundos a partir de agora
  const delaySegundos = Math.floor(
    (dataAgendamento.getTime() - agora.getTime()) / 1000
  )

  await qstash.publishJSON({
    url,
    body: { postId },
    delay: delaySegundos, // QStash aguarda esse tempo antes de chamar
    retries: 3,
  })
}

/**
 * Verifica se uma request do QStash é autêntica
 * Deve ser chamada em todas as API routes chamadas pelo QStash
 *
 * @param req - Request do Next.js
 * @returns true se a assinatura for válida
 */
export async function verificarAssinaturaQStash(
  req: Request
): Promise<boolean> {
  const signature = req.headers.get('upstash-signature')
  if (!signature) return false

  const body = await req.text()

  try {
    return await receiver.verify({
      signature,
      body,
    })
  } catch {
    return false
  }
}
