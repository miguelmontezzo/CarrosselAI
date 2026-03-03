// ═══════════════════════════════════════════════════════════════
// app/api/posts/criar/route.ts — Cria novo post e dispara processamento
// Recebe: { link?, tema?, num_slides, handle }
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { dispararProcessamento } from '@/lib/qstash'
import type { CriarPostPayload } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CriarPostPayload
    const { link, tema, num_slides = 7, handle = '@miguelito.ai' } = body

    // Validação: precisa de link OU tema
    if (!link && !tema) {
      return NextResponse.json(
        { error: 'Informe um link ou tema para gerar o carrossel' },
        { status: 400 }
      )
    }

    // Valida quantidade de slides
    if (![3, 5, 7, 9].includes(num_slides)) {
      return NextResponse.json(
        { error: 'num_slides deve ser 3, 5, 7 ou 9' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Busca o style_model ativo para usar na geração
    const { data: styleModel } = await supabase
      .from('style_models')
      .select('id')
      .eq('ativo', true)
      .single()

    // Cria o post no banco com status inicial "gerando"
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert({
        link_fonte: link ?? null,
        tema: tema ?? null,
        handle,
        num_slides,
        status: 'gerando',
        style_model_id: styleModel?.id ?? null,
      })
      .select()
      .single()

    if (insertError || !post) {
      console.error('[criar] Erro ao inserir post:', insertError)
      return NextResponse.json(
        { error: 'Erro ao criar post no banco de dados' },
        { status: 500 }
      )
    }

    // Dispara o processamento assíncrono via QStash
    // QStash garante entrega e retry automático
    await dispararProcessamento(post.id)

    return NextResponse.json({ postId: post.id }, { status: 201 })
  } catch (erro) {
    console.error('[criar] Erro inesperado:', erro)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
