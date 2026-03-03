// ═══════════════════════════════════════════════════════════════
// app/api/gerar-legenda/route.ts — Regenera legenda via GPT-4o
// Permite ao usuário pedir nova legenda sem refazer todo o post
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { gerarLegenda } from '@/lib/openai'
import { createServiceClient } from '@/lib/supabase/server'

interface GerarLegendaPayload {
  postId?: string
  titulo: string
  slides: Array<{ headline: string; body: string }>
  handle: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GerarLegendaPayload
    const { postId, titulo, slides, handle } = body

    if (!titulo || !slides?.length || !handle) {
      return NextResponse.json(
        { error: 'titulo, slides e handle são obrigatórios' },
        { status: 400 }
      )
    }

    // Gera nova legenda via GPT-4o
    const legenda = await gerarLegenda(titulo, slides, handle)

    // Se postId fornecido, salva no banco imediatamente
    if (postId) {
      const supabase = createServiceClient()
      await supabase
        .from('posts')
        .update({ legenda })
        .eq('id', postId)
    }

    return NextResponse.json({ legenda })
  } catch (erro) {
    console.error('[gerar-legenda] Erro:', erro)
    return NextResponse.json(
      { error: 'Erro ao gerar legenda' },
      { status: 500 }
    )
  }
}
