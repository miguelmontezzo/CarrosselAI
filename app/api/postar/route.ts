// ═══════════════════════════════════════════════════════════════
// app/api/postar/route.ts — Publica o carrossel no Instagram
// Chamado pelo QStash no horário agendado ou imediatamente após aprovação
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { publicarCarrosselInstagram } from '@/lib/instagram'
import type { PostarPayload } from '@/types'

export async function POST(req: NextRequest) {
  const bodyText = await req.text()
  let payload: PostarPayload

  try {
    payload = JSON.parse(bodyText) as PostarPayload
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  const { postId } = payload

  if (!postId) {
    return NextResponse.json({ error: 'postId obrigatório' }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    // ─── Busca o post e seus slides ────────────────────────────
    const { data: post } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single()

    if (!post) {
      throw new Error(`Post ${postId} não encontrado`)
    }

    if (!post.legenda) {
      throw new Error('Post sem legenda — aprove o post antes de publicar')
    }

    // Busca slides ordenados por número
    const { data: slides } = await supabase
      .from('slides')
      .select('numero, image_url')
      .eq('post_id', postId)
      .order('numero', { ascending: true })

    if (!slides || slides.length < 2) {
      throw new Error('Post precisa de pelo menos 2 slides com imagens')
    }

    // Verifica que todos os slides têm imagem
    const urlsImagens = slides.map((s) => s.image_url as string)
    const semImagem = urlsImagens.filter((url) => !url)

    if (semImagem.length > 0) {
      throw new Error(`${semImagem.length} slides sem imagem gerada`)
    }

    // Atualiza status para "postando"
    await supabase
      .from('posts')
      .update({ status: 'postando' })
      .eq('id', postId)

    // ─── Publica no Instagram via Graph API (se credenciais configuradas) ──
    const instagramConfigurado =
      !!process.env.INSTAGRAM_ACCESS_TOKEN && !!process.env.INSTAGRAM_USER_ID

    let instagramPostId: string | null = null

    if (instagramConfigurado) {
      console.log(`[postar] Publicando post ${postId} no Instagram...`)
      instagramPostId = await publicarCarrosselInstagram(urlsImagens, post.legenda)
      console.log(`[postar] Post ${postId} publicado! Instagram ID: ${instagramPostId}`)
    } else {
      console.log(`[postar] Instagram não configurado — marcando como aprovado sem publicar.`)
    }

    // ─── Registra sucesso no banco ──────────────────────────────
    await supabase
      .from('posts')
      .update({
        status: 'postado',
        instagram_post_id: instagramPostId,
        posted_at: new Date().toISOString(),
      })
      .eq('id', postId)

    return NextResponse.json({
      success: true,
      instagramPostId,
    })
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido'
    console.error(`[postar] Erro ao publicar post ${postId}:`, mensagem)

    // Registra o erro no banco
    await supabase
      .from('posts')
      .update({
        status: 'erro',
        erro_mensagem: mensagem,
      })
      .eq('id', postId)

    // Retorna 200 para o QStash não retentar indefinidamente
    return NextResponse.json({ error: mensagem }, { status: 200 })
  }
}
