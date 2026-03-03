// ═══════════════════════════════════════════════════════════════
// lib/openai.ts — Integração com GPT-4o para geração de conteúdo
// Gera slides, legendas e analisa estilos visuais
// ═══════════════════════════════════════════════════════════════
import OpenAI from 'openai'
import type { CarrosselGerado, StyleJson } from '@/types'

// Instância singleton do cliente OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ─── Prompt base para geração de carrosseis ─────────────────────
const SYSTEM_PROMPT_CARROSSEL = `Você é especialista em criar carrosseis virais para Instagram
no estilo jornalístico dramático. Você cria conteúdo que gera engajamento máximo,
com headlines impactantes e visual cinematográfico.

REGRAS OBRIGATÓRIAS:
- Retorne APENAS JSON válido, sem markdown, sem explicações
- Headlines sempre em CAIXA ALTA com no máximo 6 palavras
- Body text informativo com 2-4 linhas concisas
- image_prompt sempre em inglês, ultra-detalhado
- Último slide sempre com CTA forte para seguir o perfil
- Legenda com emojis estratégicos e hashtags relevantes`

/**
 * Gera o conteúdo completo do carrossel: slides + legenda
 *
 * @param conteudo - Texto da notícia ou tema digitado
 * @param handle - Handle do Instagram (ex: @miguelito.ai)
 * @param numSlides - Quantidade de slides (3, 5, 7 ou 9)
 * @param styleModel - JSON do estilo visual de referência (opcional)
 */
export async function gerarCarrossel(
  conteudo: string,
  handle: string,
  numSlides: number,
  styleModel?: StyleJson | null
): Promise<CarrosselGerado> {
  const styleInfo = styleModel
    ? `\nEstilo de referência: ${JSON.stringify(styleModel)}`
    : '\nUse estilo dark cinematográfico com fundo preto e texto branco'

  const userPrompt = `Conteúdo: ${conteudo}
Handle: ${handle}
Número de slides: ${numSlides}${styleInfo}

Retorne JSON exato no formato:
{
  "legenda": "legenda completa com emojis e hashtags — finaliza com '🤖 Post criado com CarrosselAI'",
  "slides": [
    {
      "numero": 1,
      "headline": "TÍTULO EM CAIXA ALTA IMPACTANTE",
      "body": "texto explicativo 2-4 linhas claro e direto",
      "cta": "ARRASTA PRO LADO >>>",
      "handle": "${handle}",
      "image_prompt": "Cinematic hyperrealistic image, upper 55%: SPECIFIC SCENE FOR THIS SLIDE, center: smooth gradient fade to pure black #000000, lower 45%: pure solid black #000000, bold white uppercase CENTER ALIGNED text: HEADLINE, smaller white CENTER ALIGNED text: BODY, small grey centered text above handle: CTA, small grey centered text bottom: HANDLE, no extra elements, 4:5 ratio, ultra detailed 8K"
    }
  ]
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_CARROSSEL },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' }, // Força resposta JSON
    temperature: 0.8, // Criatividade moderada
    max_tokens: 4000,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('GPT-4o não retornou conteúdo')
  }

  const resultado = JSON.parse(content) as CarrosselGerado

  // Validação básica da estrutura retornada
  if (!resultado.slides || !Array.isArray(resultado.slides)) {
    throw new Error('GPT-4o retornou formato inválido — sem array de slides')
  }

  if (resultado.slides.length !== numSlides) {
    console.warn(
      `GPT retornou ${resultado.slides.length} slides, esperado ${numSlides}`
    )
  }

  return resultado
}

/**
 * Gera apenas a legenda para um carrossel existente
 * Útil para regenerar legenda sem refazer todo o processo
 */
export async function gerarLegenda(
  titulo: string,
  slides: Array<{ headline: string; body: string }>,
  handle: string
): Promise<string> {
  const slidesResumidos = slides
    .map((s, i) => `Slide ${i + 1}: ${s.headline} — ${s.body}`)
    .join('\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `Você é especialista em copywriting para Instagram.
Crie legendas que geram engajamento máximo: fazem perguntas, criam urgência,
têm emojis estratégicos e hashtags relevantes.
Tom: profissional e descontraído ao mesmo tempo.
Retorne APENAS o texto da legenda, sem explicações.`,
      },
      {
        role: 'user',
        content: `Título do carrossel: ${titulo}
Handle: ${handle}

Conteúdo dos slides:
${slidesResumidos}

Crie uma legenda completa para este carrossel no Instagram.
Inclua emojis, 15-20 hashtags relevantes e finalize com:
"🤖 Post criado com CarrosselAI"`,
      },
    ],
    temperature: 0.9,
    max_tokens: 800,
  })

  return completion.choices[0]?.message?.content ?? ''
}

/**
 * Analisa imagens de referência com GPT-4 Vision para extrair estilo
 * Usado em /api/estilos para criar um style_model
 */
export async function analisarEstiloVisual(
  imagensBase64: string[]
): Promise<StyleJson> {
  const imageMessages = imagensBase64.map((img) => ({
    type: 'image_url' as const,
    image_url: {
      url: `data:image/jpeg;base64,${img}`,
      detail: 'high' as const,
    },
  }))

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analise estas imagens de carrossel do Instagram e extraia o estilo visual em JSON.
Retorne APENAS JSON válido no formato:
{
  "layout": "descrição do layout geral",
  "tipografia": {
    "titulo": "estilo e tamanho do título",
    "corpo": "estilo e tamanho do texto corpo",
    "destaque": "estilo de elementos destacados"
  },
  "cores": {
    "fundo": "cor hexadecimal do fundo",
    "texto_principal": "cor do texto principal",
    "texto_secundario": "cor do texto secundário",
    "destaque": "cor de destaque/accent"
  },
  "posicao_elementos": {
    "imagem": "como a imagem é posicionada",
    "titulo": "posição do título",
    "corpo": "posição do texto corpo",
    "cta": "posição do call to action",
    "handle": "posição do handle"
  },
  "descricao_geral": "descrição completa do estilo em 2-3 frases"
}`,
          },
          ...imageMessages,
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1000,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('GPT-4 Vision não retornou análise de estilo')
  }

  return JSON.parse(content) as StyleJson
}

export { openai }
