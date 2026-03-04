// ═══════════════════════════════════════════════════════════════
// app/api/posts/refazer/route.ts — Rota para Regerar Imagens
// Mantém os textos de GPT ilesos e re-envia o comando para o Gemini
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { dispararProcessamento } from '@/lib/qstash'

export async function POST(req: NextRequest) {
    try {
        const { postId } = await req.json()

        if (!postId) {
            return NextResponse.json({ error: 'postId obrigatório' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // Marca o status voltando apenas para a etapa das imagens
        const { error: updateError } = await supabase
            .from('posts')
            .update({
                status: 'gerando_imagens',
                erro_mensagem: null,
            })
            .eq('id', postId)

        if (updateError) {
            console.error('[refazer] Erro no supabase ao voltar status:', updateError)
            return NextResponse.json({ error: 'Erro ao agendar refação no Supabase' }, { status: 500 })
        }

        // Coloca novamente no Worker/Queue do processar
        // (O endpoint processar será modificado pra pular textos se já existirem)
        await dispararProcessamento(postId)

        return NextResponse.json({ success: true, message: 'Processo de imagens reiniciado' })

    } catch (error) {
        console.error('[refazer] Erro geral:', error)
        return NextResponse.json({ error: 'Erro interno ao refazer imagens' }, { status: 500 })
    }
}
