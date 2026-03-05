// ═══════════════════════════════════════════════════════════════
// lib/openai.ts — Integração com Claude Sonnet 4.6 via OpenRouter
// Gera slides, legendas e analisa estilos visuais
// ═══════════════════════════════════════════════════════════════
import OpenAI from 'openai'
import type { CarrosselGerado, StyleJson } from '@/types'

const MODEL = 'anthropic/claude-sonnet-4-6'
const MODEL_VISION = 'google/gemini-2.0-flash-001' // Modelo multimodal para análise de imagens

/** Remove markdown code fences que Claude inclui na resposta */
function extrairJSON(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('`')) return trimmed

  const lines = trimmed.split('\n')
  lines.shift()
  if (lines[lines.length - 1]?.trim() === '```') lines.pop()
  return lines.join('\n').trim()
}

// Inicialização lazy — evita erro em build time quando env vars não estão disponíveis
let _client: OpenAI | null = null
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://carrosselai.vercel.app',
        'X-Title': 'CarrosselAI',
      },
    })
  }
  return _client
}

// ─── Prompt base para geração de carrosseis ─────────────────────
const SYSTEM_PROMPT_CARROSSEL = `Você é especialista em criar carrosseis virais para Instagram
no estilo jornalístico dramático. Você cria conteúdo que gera engajamento máximo,
com headlines impactantes e visual cinematográfico.

REGRAS OBRIGATÓRIAS:
- TRADUZA AUTOMATICAMENTE qualquer conteúdo de entrada (notícias, temas) para o PORTUGUÊS DO BRASIL.
- Retorne APENAS JSON válido, sem markdown, sem explicações. Toda a saída de texto (headlines, body, legenda) DEVE estar em Português do Brasil (pt-BR).
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
  // Informações de estilo para GPT-4o gerar bom conteúdo de texto
  const styleInfo = styleModel
    ? `\nEstilo visual: ${styleModel.descricao_geral}\nCores: fundo ${styleModel.cores.fundo}, texto principal ${styleModel.cores.texto_principal}, destaque ${styleModel.cores.destaque}\nTipografia: ${styleModel.tipografia.titulo} (títulos), ${styleModel.tipografia.corpo} (corpo)`
    : '\nUse estilo dark cinematográfico com fundo preto e texto branco'

  // Template de image_prompt dinâmico baseado no estilo selecionado
  const imagePromptTemplate = styleModel
    ? `"${styleModel.image_style_prompt}. Photorealistic scene specific to this slide's content. Layout: ${styleModel.layout}. Background color: ${styleModel.cores.fundo}. Image position: ${styleModel.posicao_elementos.imagem}. Headline at ${styleModel.posicao_elementos.titulo} using ${styleModel.tipografia.titulo} in ${styleModel.cores.texto_principal}: [EXACT HEADLINE TEXT]. Body at ${styleModel.posicao_elementos.corpo} using ${styleModel.tipografia.corpo} in ${styleModel.cores.texto_secundario}: [EXACT BODY TEXT]. CTA at ${styleModel.posicao_elementos.cta} in ${styleModel.cores.destaque}: [EXACT CTA TEXT]. Handle at ${styleModel.posicao_elementos.handle}: [HANDLE TEXT]. Accent color ${styleModel.cores.destaque}. No extra elements, 4:5 ratio, ultra detailed 8K"`
    : `"Cinematic hyperrealistic image, upper 55%: SPECIFIC SCENE FOR THIS SLIDE, center: smooth gradient fade to pure black #000000, lower 45%: pure solid black #000000, bold white uppercase CENTER ALIGNED text: HEADLINE, smaller white CENTER ALIGNED text: BODY, small grey centered text above handle: CTA, small grey centered text bottom: HANDLE, no extra elements, 4:5 ratio, ultra detailed 8K"`

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
      "image_prompt": ${imagePromptTemplate}
    }
  ]
}`

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT_CARROSSEL },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 8000,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('GPT-4o não retornou conteúdo')
  }

  const resultado = JSON.parse(extrairJSON(content)) as CarrosselGerado

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

  const completion = await getClient().chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: 'system',
        content: `Você é especialista em copywriting para Instagram.
Crie legendas que geram engajamento máximo: fazem perguntas, criam urgência,
têm emojis estratégicos e hashtags relevantes.
O conteúdo gerado DEVE estar estritamente em PORTUGUÊS DO BRASIL (pt-BR), traduzindo o assunto se necessário.
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
 * Analisa imagens de referência com Vision para extrair style_model completo.
 * Quanto mais detalhado o style_model, mais fiel o gerarCarrossel replica o estilo.
 *
 * O campo image_style_prompt extraído é usado diretamente como prefixo
 * nos image_prompts de cada slide gerado pelo gerarCarrossel().
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

  const completion = await getClient().chat.completions.create({
    model: MODEL_VISION,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Você é um especialista em design visual e direção de arte para redes sociais.

Analise CADA imagem de referência com extrema precisão e extraia um style_model completo
que permita replicar esse estilo visual com consistência em novos posts do Instagram.

IMPORTANTE:
- Use valores HEX reais para todas as cores identificadas
- Descreva posições e proporções com precisão (ex: "título ocupa 30% superior esquerdo")
- Identifique texturas, grain de filme, profundidade de campo
- Se um elemento aparece em todos os slides, marque como FIXO
- Se varia por tipo de slide, explique a lógica de variação
- O campo image_style_prompt é o mais crítico — deve ser tão preciso que qualquer
  gerador de IA consiga reproduzir o estilo apenas com esse texto como prefixo

Retorne APENAS JSON válido no formato abaixo — sem markdown, sem explicações:

{
  "layout": "descrição resumida do layout geral — ex: foto real full frame como fundo, card branco arredondado centralizado, título bold branco no topo esquerdo sobre a foto",

  "tipografia": {
    "titulo": "família, peso, tamanho e cor — ex: Barlow Condensed ExtraBold 48px branco",
    "corpo": "família, peso, tamanho e cor — ex: Barlow Regular 16px branco 75% opacidade",
    "destaque": "como elementos destacados aparecem — ex: palavra-chave com fundo colorido arredondado pastel"
  },

  "cores": {
    "fundo": "#hex — cor principal do fundo ou 'foto real' se for imagem",
    "texto_principal": "#hex — cor do texto principal",
    "texto_secundario": "#hex — cor do texto secundário",
    "destaque": "#hex — cor de destaque/accent principal"
  },

  "posicao_elementos": {
    "imagem": "como a imagem de fundo é posicionada — ex: full frame 100% ocupando todo o slide",
    "titulo": "posição exata do título — ex: topo esquerdo sobre a foto, sem card",
    "corpo": "posição exata do corpo — ex: dentro do card branco centralizado",
    "cta": "posição exata do CTA — ex: rodapé centralizado em cinza claro",
    "handle": "posição e formato — ex: topo esquerdo com avatar circular 32px + @handle em texto pequeno"
  },

  "background": {
    "tipo": "foto real / imagem IA / ilustração / cor sólida / gradiente",
    "descricao_detalhada": "descreva o que aparece no fundo — sujeito, ambiente, composição",
    "paleta_dominante": ["#hex1", "#hex2", "#hex3"],
    "iluminacao": "descreva a luz com precisão — ex: golden hour lateral, 3500K, sombras suaves",
    "temperatura_cor": "quente / fria / neutra — temperatura em Kelvin se possível",
    "profundidade_campo": "ex: bokeh suave f/1.8, sujeito em foco, fundo desfocado",
    "camera_style": "ex: Fujifilm XT4 film simulation, Sony A7 editorial, iPhone candid natural",
    "grain_texture": "ex: grão de filme suave Kodak Portra 400, ou 'sem grão'",
    "composicao": "ex: sujeito centralizado regra dos terços, fundo natureza desfocada"
  },

  "card": {
    "existe": true,
    "cor_fundo": "rgba completo — ex: rgba(255,255,255,0.92)",
    "border_radius": "ex: 20px",
    "sombra": "ex: box-shadow 0 8px 32px rgba(0,0,0,0.12) ou 'sem sombra'",
    "posicao_no_slide": "ex: centro do slide, margem 24px lateral, ocupando 55% da altura",
    "tem_bullets_coloridos": true,
    "cores_bullets": ["#FFB3BA", "#BAFFC9", "#FFD700", "#FFCC99", "#C9B3FF", "#BAE1FF"]
  },

  "padroes_por_tipo_slide": {
    "slide_gancho": "descreva o padrão visual EXATO do slide de abertura — elementos fixos, posição do texto, se tem card ou não, como o handle aparece",
    "slide_lista": "descreva o padrão dos slides com lista — como o card aparece, como os bullets são apresentados, cores usadas",
    "slide_comparacao": "descreva o padrão dos slides de comparação/antes-depois — estrutura do card, duas colunas, cores dos labels",
    "slide_cta": "descreva o padrão do slide final — como o CTA e a pergunta aparecem, diferenças em relação ao gancho"
  },

  "descricao_geral": "descrição completa do estilo em 2-3 frases objetivas para uso interno",

  "image_style_prompt": "PROMPT COMPLETO EM INGLÊS para reproduzir o estilo visual do background em qualquer gerador de IA de imagens. Seja extremamente detalhado e específico. Inclua obrigatoriamente: (1) estilo fotográfico — ex: lifestyle editorial photography, (2) simulação de câmera e filme — ex: Fujifilm XT4 Classic Chrome simulation, (3) iluminação com temperatura — ex: warm natural golden hour light 3500K, (4) paleta de cores com HEX — ex: warm greens #7A9E7E, golden yellows #F5C842, (5) profundidade de campo — ex: f/2.0 shallow depth of field soft bokeh, (6) grain e textura — ex: subtle analog film grain, (7) atmosfera emocional — ex: authentic candid warm approachable feel, (8) composição — ex: subject off-center rule of thirds. Este prompt será prefixo de TODOS os image_prompts dos slides — apenas a descrição da cena específica muda de slide para slide.",

  "regras_replicacao": [
    "Regra 1: descreva a regra mais importante de iluminação e cor desse estilo",
    "Regra 2: descreva a regra sobre o tipo de background e o que nunca deve aparecer",
    "Regra 3: descreva a regra sobre o card — quando usar, cor, bordas",
    "Regra 4: descreva a regra sobre tipografia — família, peso, alinhamento",
    "Regra 5: descreva a regra sobre bullets e destaques coloridos",
    "Regra 6 em diante: adicione mais regras até cobrir todos os padrões visuais identificados"
  ]
}`,
          },
          ...imageMessages,
        ],
      },
    ],
    max_tokens: 4000,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('GPT-4 Vision não retornou análise de estilo')
  }

  return JSON.parse(extrairJSON(content)) as StyleJson
}