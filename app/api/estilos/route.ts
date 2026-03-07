// ═══════════════════════════════════════════════════════════════
// app/api/estilos/route.ts — Analisa imagens de referência com GPT-4 Vision
// e salva o style_model no Supabase para uso em todos os posts
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { analisarEstiloVisual } from '@/lib/openai'

export async function POST(req: NextRequest) {
  try {
    // Recebe multipart/form-data com imagens e nome do estilo
    const formData = await req.formData()
    const nome = formData.get('nome') as string
    const arquivos = formData.getAll('imagens') as File[]

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome do estilo é obrigatório' },
        { status: 400 }
      )
    }

    if (arquivos.length === 0) {
      return NextResponse.json(
        { error: 'Envie pelo menos uma imagem de referência' },
        { status: 400 }
      )
    }

    if (arquivos.length > 5) {
      return NextResponse.json(
        { error: 'Máximo de 5 imagens de referência' },
        { status: 400 }
      )
    }

    // Converte arquivos para base64 para enviar ao GPT-4 Vision
    const imagensBase64 = await Promise.all(
      arquivos.map(async (arquivo) => {
        const buffer = await arquivo.arrayBuffer()
        return Buffer.from(buffer).toString('base64')
      })
    )

    // Analisa o estilo visual das imagens
    console.log(`[estilos] Analisando ${arquivos.length} imagens com GPT-4 Vision...`)
    const styleJson = await analisarEstiloVisual(imagensBase64)

    const supabase = createServiceClient()

    // Desativa todos os outros estilos (apenas um ativo por vez)
    await supabase.from('style_models').update({ ativo: false }).eq('ativo', true)

    // Salva o novo estilo como ativo
    const { data: estilo, error } = await supabase
      .from('style_models')
      .insert({
        nome,
        style_json: styleJson,
        ativo: true,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Erro ao salvar estilo: ${error.message}`)
    }

    return NextResponse.json({ estilo, styleJson })
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro)
    console.error('[estilos] Erro:', msg)
    return NextResponse.json(
      { error: `Erro ao analisar estilo visual: ${msg}` },
      { status: 500 }
    )
  }
}

// PATCH — Atualiza campos de um estilo existente
export async function PATCH(req: NextRequest) {
  try {
    const { id, nome, style_json } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'ID do estilo é obrigatório' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const updates: Record<string, unknown> = {}
    if (nome !== undefined) updates.nome = nome
    if (style_json !== undefined) updates.style_json = style_json

    const { data, error } = await supabase
      .from('style_models')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ estilo: data })
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE — Remove um estilo
export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const supabase = createServiceClient()
    const { error } = await supabase.from('style_models').delete().eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true })
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// GET — Lista todos os estilos salvos
export async function GET() {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('style_models')
    .select('id, nome, ativo, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ estilos: data })
}
