// ═══════════════════════════════════════════════════════════════
// app/api/processar/route.ts — Pipeline completo de geração
// Chamado pelo QStash: extrai → gera prompts → gera imagens → salva
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { extrairConteudo } from '@/lib/scraping'
import { gerarCarrossel } from '@/lib/openai'
import { gerarTodasImagens, salvarImagemNoStorage } from '@/lib/nanobana'
import type { ProcessarPayload, SlideGerado, StyleJson } from '@/types'

// Utilitário para atualizar status no banco
async function atualizarStatus(
  supabase: ReturnType<typeof createServiceClient>,
  postId: string,
  status: string,
  extra?: Record<string, unknown>
) {
  await supabase
    .from('posts')
    .update({ status, ...extra })
    .eq('id', postId)
}

export async function POST(req: NextRequest) {
  // QStash envia o body como texto — fazemos parse manual
  const bodyText = await req.text()
  let payload: ProcessarPayload

  try {
    payload = JSON.parse(bodyText) as ProcessarPayload
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { postId } = payload

  if (!postId) {
    return NextResponse.json({ error: 'postId obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    // ─── Busca o post no banco ───────────────────────────────────
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('*, style_models(style_json)')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      throw new Error(`Post ${postId} não encontrado`)
    }

    // ─── PASSO 1: Extração do conteúdo ──────────────────────────
    await atualizarStatus(supabase, postId, 'extraindo')

    let conteudo = ''
    let titulo = ''

    if (post.link_fonte) {
      // Faz scraping da URL fornecida
      console.log(`[processar] Extraindo conteúdo de: ${post.link_fonte}`)
      const extraido = await extrairConteudo(post.link_fonte)
      conteudo = `${extraido.titulo}\n\n${extraido.corpo}`
      titulo = extraido.titulo

      // Salva o título extraído no post
      await supabase
        .from('posts')
        .update({ titulo: extraido.titulo })
        .eq('id', postId)
    } else if (post.tema) {
      // Usa o tema digitado diretamente
      conteudo = post.tema
      titulo = post.tema.split('\n')[0].slice(0, 100)

      await supabase
        .from('posts')
        .update({ titulo })
        .eq('id', postId)
    } else {
      throw new Error('Post sem link_fonte nem tema')
    }

    // ─── PASSO 2: GPT-4o gera JSON com slides e legenda ─────────
    await atualizarStatus(supabase, postId, 'gerando_prompts')

    console.log(`[processar] Gerando ${post.num_slides} slides com GPT-4o...`)

    // Recupera o style_model se disponível
    const styleModel = (post as { style_models?: { style_json: StyleJson } })
      .style_models?.style_json ?? null

    const carrossel = await gerarCarrossel(
      conteudo,
      post.handle,
      post.num_slides,
      styleModel
    )

    // Salva a legenda gerada no post
    await supabase
      .from('posts')
      .update({ legenda: carrossel.legenda })
      .eq('id', postId)

    // ─── PASSO 3: Nanobana gera imagens em paralelo ─────────────
    await atualizarStatus(supabase, postId, 'gerando_imagens')

    console.log(`[processar] Gerando ${carrossel.slides.length} imagens em paralelo...`)

    let imagensGeradas = 0
    const urlsImagens = await gerarTodasImagens(
      carrossel.slides as SlideGerado[],
      async (geradas, total) => {
        imagensGeradas = geradas
        // Atualiza progresso no banco para o Realtime notificar o front
        await atualizarStatus(supabase, postId, 'gerando_imagens', {
          progresso_imagens: `${geradas}/${total}`,
        })
        console.log(`[processar] Imagem ${geradas}/${total} gerada`)
      }
    )

    // ─── PASSO 4: Salva imagens no Supabase Storage ──────────────
    console.log('[processar] Salvando imagens no Storage...')

    const urlsPublicas = await Promise.all(
      urlsImagens.map((url, idx) =>
        salvarImagemNoStorage(url, postId, idx + 1)
      )
    )

    // ─── PASSO 5: Insere slides no banco ────────────────────────
    const slidesParaInserir = carrossel.slides.map((slide, idx) => ({
      post_id: postId,
      numero: slide.numero,
      headline: slide.headline,
      body: slide.body,
      cta: slide.cta,
      handle: slide.handle,
      image_prompt: slide.image_prompt,
      image_url: urlsPublicas[idx],
    }))

    const { error: slidesError } = await supabase
      .from('slides')
      .insert(slidesParaInserir)

    if (slidesError) {
      throw new Error(`Erro ao inserir slides: ${slidesError.message}`)
    }

    // ─── PASSO 6: Finaliza — aguarda aprovação do usuário ────────
    await atualizarStatus(supabase, postId, 'aguardando_aprovacao', {
      progresso_imagens: null, // Limpa o campo de progresso
    })

    console.log(`[processar] Post ${postId} processado com sucesso!`)
    return NextResponse.json({ success: true, postId })
  } catch (erro) {
    // Em caso de erro, registra no banco para o usuário ver
    const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido'
    console.error(`[processar] Erro no post ${postId}:`, mensagem)

    await atualizarStatus(supabase, postId, 'erro', {
      erro_mensagem: mensagem,
    })

    // Retorna 200 para o QStash não retentar (erro de conteúdo, não de infra)
    return NextResponse.json({ error: mensagem }, { status: 200 })
  }
}
