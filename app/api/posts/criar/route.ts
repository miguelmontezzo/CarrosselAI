// ═══════════════════════════════════════════════════════════════
// app/api/posts/criar/route.ts — Cria novo post e dispara processamento
// Recebe: { link?, tema?, num_slides, handle }
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { CriarPostPayload } from '@/types'

// Aumenta o limite de tempo de execução pro Vercel free(60s) / pro(300s)
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CriarPostPayload
    const { link, tema, num_slides = 7, handle = '@miguelito.ai', style_model_id, image_model, image_resolution } = body

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

    // Se o usuário não enviou o style_model_id, busca o primeiro ativo
    let finalStyleModelId = style_model_id
    if (!finalStyleModelId) {
      const { data: styleModel } = await supabase
        .from('style_models')
        .select('id')
        .eq('ativo', true)
        .limit(1)
        .single()

      finalStyleModelId = styleModel?.id ?? null
    }

    // Cria o post no banco com status inicial "gerando"
    const { data: post, error: insertError } = await supabase
      .from('posts')
      .insert({
        link_fonte: link ?? null,
        tema: tema ?? null,
        handle,
        num_slides,
        status: 'gerando',
        style_model_id: finalStyleModelId,
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

    // Dispara o processamento aguardando a finalização para que o Vercel Serverless não mate a request
    // Usamos maxDuration = 60 na rota para garantir tempo hábil no Vercel Free Hobby.
    const processResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5001'}/api/processar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId: post.id, image_model: image_model, image_resolution: image_resolution }),
    });

    if (!processResponse.ok) {
      console.warn('[criar] Processamento finalizou com status de erro (não impeditivo da criação):', processResponse.status);
    }

    return NextResponse.json({ postId: post.id }, { status: 201 })
  } catch (erro) {
    console.error('[criar] Erro inesperado:', erro)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
