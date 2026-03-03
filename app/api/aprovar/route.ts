// ═══════════════════════════════════════════════════════════════
// app/api/aprovar/route.ts — Aprovação e agendamento do post
// Recebe: { postId, legenda, agendado_para? }
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { agendarPost } from '@/lib/qstash'
import type { AprovarPostPayload } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AprovarPostPayload
    const { postId, legenda, agendado_para } = body

    if (!postId || !legenda) {
      return NextResponse.json(
        { error: 'postId e legenda são obrigatórios' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Verifica que o post existe e está aguardando aprovação
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, status')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { error: 'Post não encontrado' },
        { status: 404 }
      )
    }

    if (post.status !== 'aguardando_aprovacao') {
      return NextResponse.json(
        { error: `Post não está aguardando aprovação (status: ${post.status})` },
        { status: 400 }
      )
    }

    if (agendado_para) {
      // ─── Agendamento para data/hora específica ─────────────────
      const dataAgendamento = new Date(agendado_para)

      if (dataAgendamento <= new Date()) {
        return NextResponse.json(
          { error: 'Data de agendamento deve ser no futuro' },
          { status: 400 }
        )
      }

      // Salva legenda e data no banco
      await supabase
        .from('posts')
        .update({
          legenda,
          agendado_para,
          status: 'agendado',
        })
        .eq('id', postId)

      // QStash aguarda até o horário e chama /api/postar
      await agendarPost(postId, agendado_para)

      return NextResponse.json({
        success: true,
        status: 'agendado',
        agendado_para,
      })
    } else {
      // ─── Postar imediatamente ──────────────────────────────────
      // Atualiza legenda e chama /api/postar diretamente
      await supabase
        .from('posts')
        .update({
          legenda,
          status: 'postando',
        })
        .eq('id', postId)

      // Chama a rota de postar de forma assíncrona (não bloqueia response)
      const postarUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/postar`
      fetch(postarUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      }).catch((err) => {
        console.error('[aprovar] Erro ao chamar /api/postar:', err)
      })

      return NextResponse.json({ success: true, status: 'postando' })
    }
  } catch (erro) {
    console.error('[aprovar] Erro:', erro)
    return NextResponse.json(
      { error: 'Erro ao aprovar post' },
      { status: 500 }
    )
  }
}
