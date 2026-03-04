// ═══════════════════════════════════════════════════════════════
// app/api/processar/route.ts — Pipeline completo de geração
// Chamado pelo QStash: extrai → gera prompts → gera imagens → salva
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { extrairConteudo } from '@/lib/scraping'
import { gerarCarrossel } from '@/lib/openai'
import { gerarTodasImagens, salvarImagemNoStorage } from '@/lib/nanobana'
import type { ProcessarPayload, SlideGerado, StyleJson, CarrosselGerado } from '@/types'

// Aumenta o limite de tempo de execução no Vercel para 60 segundos (limite hobby)
// Se for plano Pro na Vercel, pode colocar até 300 segundos
export const maxDuration = 60;

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
  let payload: ProcessarPayload

  // Verifica se o parser deve focar em req.text (Qstash) ou req.json (Chamada direta/Fetch)
  if (req.headers.get('content-type')?.includes('application/json')) {
    payload = await req.json() as ProcessarPayload
  } else {
    const bodyText = await req.text()
    try {
      payload = JSON.parse(bodyText) as ProcessarPayload
    } catch {
      return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
    }
  }

  const { postId, image_model = 'nanobana-2', image_resolution = '2k' } = payload

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
    let carrossel: CarrosselGerado
    const refazendoImagens = post.status === 'gerando_imagens'

    // Extrai style_json do join para uso na geração de texto e imagens
    const styleJson = (post as { style_models?: { style_json: StyleJson } | null })
      .style_models?.style_json ?? null

    if (refazendoImagens) {
      console.log(`[processar] Pulo GPT: Apenas regerando imagens do Post ${postId}...`)
      // Busca slides existentes
      const { data: slidesDb } = await supabase
        .from('slides')
        .select('*')
        .eq('post_id', postId)
        .order('numero', { ascending: true })

      carrossel = {
        legenda: post.legenda ?? '',
        slides: slidesDb || [],
      }
    } else {
      // Fluxo Normal - Criação do Zero
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

      carrossel = await gerarCarrossel(
        conteudo,
        post.handle,
        post.num_slides,
        styleJson
      )

      // Salva a legenda gerada no post
      await supabase
        .from('posts')
        .update({ legenda: carrossel.legenda })
        .eq('id', postId)
    }

    // ─── PASSO 3: Nanobana gera imagens em paralelo ─────────────
    await atualizarStatus(supabase, postId, 'gerando_imagens')

    console.log(`[processar] Gerando ${carrossel.slides.length} imagens em paralelo...`)

    let imagensGeradas = 0
    const imageStylePrompt = styleJson?.image_style_prompt ?? undefined

    const urlsImagens = await gerarTodasImagens(
      carrossel.slides as SlideGerado[],
      async (geradas, total) => {
        imagensGeradas = geradas
        // Atualiza progresso no banco para o Realtime notificar o front
        await atualizarStatus(supabase, postId, 'gerando_imagens', {
          progresso_imagens: `${geradas}/${total}`,
        })
        console.log(`[processar] Imagem ${geradas}/${total} gerada`)
      },
      image_model,
      image_resolution,
      imageStylePrompt
    )

    // ─── PASSO 4: Salva imagens no Supabase Storage ──────────────
    console.log('[processar] Salvando imagens no Storage...')

    const urlsPublicas = await Promise.all(
      urlsImagens.map((url, idx) =>
        salvarImagemNoStorage(url, postId, idx + 1)
      )
    )

    // ─── PASSO 5: Insere slides no banco ────────────────────────
    if (!refazendoImagens) {
      const slidesParaInserir = carrossel.slides.map((slide: Record<string, any>, idx: number) => ({
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
    } else {
      // Se apenas refazendo imagens, só precisamos ATUALIZAR as image_urls dos slides existentes
      for (let i = 0; i < carrossel.slides.length; i++) {
        const slideParaAtualizar = carrossel.slides[i] as Record<string, any>
        await supabase
          .from('slides')
          .update({ image_url: urlsPublicas[i] })
          .eq('id', slideParaAtualizar.id)
      }
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
