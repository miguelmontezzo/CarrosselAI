import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json()

    if (!postId) {
      return NextResponse.json({ error: 'postId obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()

    await supabase
      .from('posts')
      .update({
        status: 'postado',
        posted_at: new Date().toISOString(),
      })
      .eq('id', postId)

    return NextResponse.json({ success: true })
  } catch (erro) {
    console.error('[marcar-postado] Erro:', erro)
    return NextResponse.json({ error: 'Erro ao marcar post' }, { status: 500 })
  }
}
