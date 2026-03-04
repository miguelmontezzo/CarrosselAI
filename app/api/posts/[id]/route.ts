// ═══════════════════════════════════════════════════════════════
// app/api/posts/[id]/route.ts — Operações em posts específicos
// DELETE: Exclui post e todos os seus slides do banco
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function DELETE(
    _req: NextRequest,
    { params }: { params: { id: string } }
) {
    const { id } = params

    if (!id) {
        return NextResponse.json({ error: 'ID do post obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Remove os slides primeiro (FK constraint)
    const { error: slidesError } = await supabase
        .from('slides')
        .delete()
        .eq('post_id', id)

    if (slidesError) {
        console.error('[delete] Erro ao remover slides:', slidesError)
        return NextResponse.json({ error: 'Erro ao remover slides' }, { status: 500 })
    }

    // Remove o post
    const { error: postError } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)

    if (postError) {
        console.error('[delete] Erro ao remover post:', postError)
        return NextResponse.json({ error: 'Erro ao remover post' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}
