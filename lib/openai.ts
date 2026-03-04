// ═══════════════════════════════════════════════════════════════
// lib/openai.ts — Integração com Claude Sonnet 4.6 via OpenRouter
// Gera slides, legendas e analisa estilos visuais
// ═══════════════════════════════════════════════════════════════
import OpenAI from 'openai'
import type { CarrosselGerado, StyleJson } from '@/types'

const MODEL = 'anthropic/claude-sonnet-4-6'

/** Remove markdown code fences que Claude inclui na resposta */
function extrairJSON(content: string): string {
  const trimmed = content.trim()
  if (!trimmed.startsWith('`')) return trimmed
  const lines = trimmed.split('\n')
  lines.shift()
  if (lines[lines.length - 1]?.trim() === '```') lines.pop()
  return lines.join('\n').trim()
}

// Inicialização lazy
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

// ─── PROMPT DE EXTRAÇÃO DE ESTILO VISUAL ────────────────────────
// Analisa imagens de referência e extrai style_model completo
const PROMPT_EXTRACAO_ESTILO = `Você é um especialista em design visual e direção de arte para redes sociais.

Analise CADA imagem de referência com extrema precisão e extraia um style_model completo
que permita replicar esse estilo visual com consistência em novos posts.

Seja extremamente específico em cores HEX reais, posições, proporções e texturas.
Se um elemento aparece em todos os slides, marque como FIXO.

Retorne APENAS JSON válido no formato abaixo:

{
  "identidade_visual": {
    "descricao_geral": "descreva o estilo em 1 frase objetiva",
    "tom_visual": "ex: leve orgânico / dramático cinematic / minimalista clean",
    "sensacao_emocional": "o que o visual transmite emocionalmente ao espectador",
    "referencias_esteticas": "cite estilos fotográficos ou artísticos parecidos"
  },

  "background": {
    "tipo": "foto real / imagem IA / ilustração / cor sólida / gradiente",
    "descricao_detalhada": "descreva exatamente o que aparece no fundo de cada slide",
    "paleta_dominante": ["#hex1", "#hex2", "#hex3"],
    "iluminacao": "descreva a luz — golden hour, estúdio, natural, difusa, contrastada",
    "temperatura_cor": "quente / fria / neutra — temperatura estimada em Kelvin se possível",
    "profundidade_campo": "bokeh suave / foco total / parcial / desfoque progressivo",
    "camera_style": "ex: Fujifilm XT4, Sony A7, iPhone candid, editorial magazine",
    "grain_texture": "tem grão de filme? descreva intensidade e tipo",
    "composicao": "como os elementos estão dispostos — regra dos terços, centralizado, etc"
  },

  "layout_estrutura": {
    "divisao_imagem": "ex: foto ocupa 100% / 55% topo + 45% fundo preto",
    "tem_gradiente": true,
    "gradiente_descricao": "de onde para onde, cores e opacidade",
    "posicao_titulo": "topo esquerdo / centro / inferior esquerdo / sobre imagem",
    "posicao_body": "abaixo do título / sobre a imagem / dentro do card",
    "posicao_handle": "topo com avatar / rodapé / dentro do card",
    "posicao_cta": "acima do handle / rodapé centralizado",
    "tem_card": true,
    "card": {
      "cor_fundo": "#hex ou rgba",
      "opacidade": "valor 0-100%",
      "border_radius": "ex: 20px arredondado",
      "sombra": "tem sombra? descreva",
      "posicao_no_slide": "centro / inferior / ocupando 60% da altura",
      "padding_interno": "estimativa de espaçamento interno"
    }
  },

  "tipografia": {
    "headline": {
      "estilo": "bold / black / condensed / regular / italic",
      "tamanho_relativo": "muito grande / grande / médio",
      "cor": "#hex",
      "cor_secundaria": "#hex — se tiver variação",
      "caixa": "ALTA / baixa / Mista",
      "alinhamento": "esquerda / centro / direita",
      "familia_aproximada": "ex: Barlow Condensed, Helvetica Neue, Playfair Display",
      "espacamento_letras": "normal / apertado / espaçado",
      "line_height": "normal / comprimido / amplo"
    },
    "body": {
      "estilo": "regular / medium / light / semibold",
      "tamanho_relativo": "pequeno / médio",
      "cor": "#hex",
      "alinhamento": "esquerda / centro / direita",
      "familia_aproximada": "ex: Barlow, DM Sans, Inter"
    },
    "handle": {
      "posicao_detalhada": "onde exatamente aparece no slide",
      "formato": "só texto / avatar circular + texto",
      "tamanho": "muito pequeno / pequeno",
      "cor": "#hex",
      "tem_verificacao": "tem ícone de verificação azul?"
    }
  },

  "elementos_graficos": {
    "tem_bullets": true,
    "bullets_estilo": "círculo preenchido / quadrado / traço / emoji / ponto",
    "palavras_destacadas": true,
    "destaque_estilo": "fundo colorido arredondado / sublinhado / negrito / cor diferente",
    "cores_destaque_bullets": [
      {"nome": "rosa", "hex": "#FFB3BA"},
      {"nome": "verde", "hex": "#BAFFC9"},
      {"nome": "amarelo", "hex": "#FFD700"}
    ],
    "tem_emoji": true,
    "emoji_posicao": "ao lado do título / dentro do body / no final",
    "tem_borda_card": false,
    "outros_elementos": "descreva qualquer outro elemento visual relevante"
  },

  "padroes_por_tipo_slide": {
    "slide_gancho": {
      "descricao": "descreva o padrão visual exato do slide de abertura",
      "elementos_obrigatorios": ["liste o que sempre aparece nesse tipo"]
    },
    "slide_lista": {
      "descricao": "descreva o padrão dos slides com lista de itens",
      "elementos_obrigatorios": ["liste o que sempre aparece nesse tipo"]
    },
    "slide_comparacao": {
      "descricao": "descreva o padrão dos slides de comparação/antes-depois",
      "elementos_obrigatorios": ["liste o que sempre aparece nesse tipo"]
    },
    "slide_cta": {
      "descricao": "descreva o padrão do slide final de CTA",
      "elementos_obrigatorios": ["liste o que sempre aparece nesse tipo"]
    }
  },

  "prompt_base_imagem": "Escreva aqui um prompt base COMPLETO em inglês para reproduzir o estilo visual do background dessas imagens em qualquer gerador de IA. Inclua: estilo fotográfico específico, câmera e simulação de filme, temperatura de luz, paleta de cores com HEX, profundidade de campo, grain/textura, atmosfera emocional, composição. Esse prompt será prefixo de TODOS os slides — apenas a descrição da cena específica muda.",

  "regras_replicacao": [
    "Regra 1: seja específico — ex: sempre usar luz natural quente entre 3200K-4000K",
    "Regra 2: ex: nunca usar fundo escuro ou gradiente para preto nesse estilo",
    "Regra 3: ex: card sempre branco rgba(255,255,255,0.92) com border-radius 20px",
    "Regra 4: adicione de 5 a 10 regras claras que garantem consistência"
  ],

  "descricao_geral": "resumo executivo do estilo em 2-3 frases para uso interno",
  "cores": {
    "fundo": "#hex principal do fundo",
    "texto_principal": "#hex do texto principal",
    "texto_secundario": "#hex do texto secundário",
    "destaque": "#hex da cor de destaque/accent"
  },
  "layout": "descrição resumida do layout para uso no image_prompt",
  "tipografia_resumida": {
    "titulo": "descrição resumida da fonte do título",
    "corpo": "descrição resumida da fonte do corpo"
  },
  "posicao_elementos": {
    "imagem": "como a imagem é posicionada",
    "titulo": "posição do título",
    "corpo": "posição do texto corpo",
    "cta": "posição do call to action",
    "handle": "posição do handle"
  },
  "image_style_prompt": "versão concisa do prompt_base_imagem para uso no gerador"
}`

// ─── SYSTEM PROMPT PARA GERAÇÃO DE CARROSSEIS ───────────────────
const SYSTEM_PROMPT_CARROSSEL = `Você é especialista em criar carrosseis virais para Instagram.
Você domina dois estilos principais:

ESTILO 1 — JORNALÍSTICO DRAMÁTICO:
Visual cinemático e impactante. Fundo escuro ou gradiente para preto.
Imagem IA hiperealista cinematográfica na parte superior.
Texto bold em caixa alta centralizado sobre fundo preto.
Usado para: notícias, tecnologia, política, negócios, IA.

ESTILO 2 — LIFESTYLE ORGÂNICO:
Visual leve, acolhedor e autêntico. Foto real ou estilo foto real.
Luz natural quente, bokeh suave, cores orgânicas.
Cards brancos arredondados com bullets coloridos.
Usado para: saúde, bem-estar, hábitos, rotina, lifestyle.

REGRAS OBRIGATÓRIAS:
- Retorne APENAS JSON válido sem markdown nem explicações
- Todo conteúdo de texto em PORTUGUÊS DO BRASIL
- Headlines sempre em CAIXA ALTA com no máximo 6 palavras
- Body text informativo com 2-4 linhas concisas
- image_prompt sempre em inglês, ultra-detalhado e específico
- Último slide sempre com CTA forte para seguir o perfil
- Quando um style_model for fornecido, siga-o com PRECISÃO ABSOLUTA`

/**
 * Monta o image_prompt correto baseado no style_model extraído das referências.
 * Se não houver style_model, usa o template dramático padrão.
 */
function montarImagePrompt(
  styleModel: StyleJson | null | undefined,
  tipoSlide: 'gancho' | 'lista' | 'comparacao' | 'cta' | 'conteudo'
): string {
  if (!styleModel) {
    // Template padrão jornalístico dramático
    return `Cinematic hyperrealistic image, no real people unless essential,
upper 55% of image: [SPECIFIC CINEMATIC SCENE FOR THIS SLIDE CONTENT],
center: smooth natural gradient fade from scene transitioning to pure solid black #000000,
lower 45% of image: pure solid black background #000000,
bold white uppercase heavy font CENTER ALIGNED text: [EXACT HEADLINE],
smaller regular white font CENTER ALIGNED text: [EXACT BODY TEXT],
small spaced uppercase grey font centered above handle: [CTA TEXT],
small spaced uppercase grey font centered at very bottom: [HANDLE],
no extra elements, no borders, no watermarks, 4:5 vertical ratio, ultra detailed 8K photorealistic`
  }

  // Usa o prompt_base_imagem extraído das imagens de referência
  const basePrompt = styleModel.prompt_base_imagem || styleModel.image_style_prompt || ''

  // Instruções de layout específicas por tipo de slide
  const layoutInstrucoes: Record<string, string> = {
    gancho: `Full frame background photo. Large bold white text on lower left area of image directly over photo (no card). One colorful emoji next to the headline. Smaller subtitle text below headline.`,
    lista: `Full frame background photo. Bold white title text at top left over photo. White rounded card (rgba(255,255,255,0.92), border-radius 20px) centered on image containing bullet list with colorful highlighted keywords.`,
    comparacao: `Full frame background photo. Bold white title text at top over photo. White rounded card (rgba(255,255,255,0.92), border-radius 20px) centered with two columns side by side, each with a colored label badge.`,
    cta: `Full frame background photo. Large bold white text centered on image. Smaller engaging question text below. Handle with small circular avatar at top.`,
    conteudo: `Full frame background photo. Bold white title text at top. White rounded card with relevant information displayed cleanly.`,
  }

  const layoutEspecifico = layoutInstrucoes[tipoSlide] || layoutInstrucoes.conteudo

  return `${basePrompt}. ${layoutEspecifico} Small circular avatar + handle text at top of image. No watermarks, 4:5 vertical ratio, ultra detailed, high quality`
}

/**
 * Determina automaticamente o tipo de slide baseado no número e contexto
 */
function determinarTipoSlide(
  numero: number,
  totalSlides: number,
  conteudo: string
): 'gancho' | 'lista' | 'comparacao' | 'cta' | 'conteudo' {
  if (numero === 1) return 'gancho'
  if (numero === totalSlides) return 'cta'

  const conteudoLower = conteudo.toLowerCase()
  if (
    conteudoLower.includes('antes') ||
    conteudoLower.includes('depois') ||
    conteudoLower.includes('vs') ||
    conteudoLower.includes('diferença') ||
    conteudoLower.includes('comparação')
  ) return 'comparacao'

  if (
    conteudoLower.includes('lista') ||
    conteudoLower.includes('passo') ||
    conteudoLower.includes('minuto') ||
    conteudoLower.includes('dia') ||
    conteudoLower.includes('benefício') ||
    conteudoLower.includes('dica')
  ) return 'lista'

  return 'conteudo'
}

/**
 * Gera o conteúdo completo do carrossel: slides + legenda
 */
export async function gerarCarrossel(
  conteudo: string,
  handle: string,
  numSlides: number,
  styleModel?: StyleJson | null
): Promise<CarrosselGerado> {

  // ── Determina o estilo a usar ──────────────────────────────────
  const temStyleModel = !!styleModel
  const estiloNome = temStyleModel
    ? styleModel!.identidade_visual?.tom_visual || styleModel!.descricao_geral
    : 'jornalístico dramático (padrão)'

  // ── Monta descrição detalhada do estilo para o modelo ─────────
  const styleContexto = temStyleModel ? `
════════════════════════════════════
ESTILO VISUAL DE REFERÊNCIA (SIGA COM PRECISÃO ABSOLUTA):
════════════════════════════════════
Identidade: ${styleModel!.identidade_visual?.descricao_geral || styleModel!.descricao_geral}
Tom visual: ${styleModel!.identidade_visual?.tom_visual || ''}
Sensação: ${styleModel!.identidade_visual?.sensacao_emocional || ''}

BACKGROUND:
- Tipo: ${styleModel!.background?.tipo || ''}
- Iluminação: ${styleModel!.background?.iluminacao || ''}
- Temperatura: ${styleModel!.background?.temperatura_cor || ''}
- Profundidade de campo: ${styleModel!.background?.profundidade_campo || ''}
- Estilo câmera: ${styleModel!.background?.camera_style || ''}
- Grão/textura: ${styleModel!.background?.grain_texture || ''}

CORES:
- Fundo: ${styleModel!.cores?.fundo || ''}
- Texto principal: ${styleModel!.cores?.texto_principal || ''}
- Texto secundário: ${styleModel!.cores?.texto_secundario || ''}
- Destaque/accent: ${styleModel!.cores?.destaque || ''}

TIPOGRAFIA:
- Título: ${styleModel!.tipografia?.headline?.familia_aproximada || styleModel!.tipografia?.titulo || ''} — ${styleModel!.tipografia?.headline?.estilo || ''} ${styleModel!.tipografia?.headline?.caixa || 'ALTA'}
- Corpo: ${styleModel!.tipografia?.body?.familia_aproximada || styleModel!.tipografia?.corpo || ''}

LAYOUT:
- Estrutura: ${styleModel!.layout_estrutura?.divisao_imagem || styleModel!.layout || ''}
- Gradiente: ${styleModel!.layout_estrutura?.tem_gradiente ? styleModel!.layout_estrutura?.gradiente_descricao : 'Não tem gradiente'}
- Card: ${styleModel!.layout_estrutura?.tem_card ? JSON.stringify(styleModel!.layout_estrutura?.card) : 'Sem card'}

ELEMENTOS GRÁFICOS:
- Bullets: ${styleModel!.elementos_graficos?.bullets_estilo || ''}
- Destaques: ${styleModel!.elementos_graficos?.destaque_estilo || ''}
- Cores de destaque: ${JSON.stringify(styleModel!.elementos_graficos?.cores_destaque_bullets || [])}
- Emoji: ${styleModel!.elementos_graficos?.tem_emoji ? styleModel!.elementos_graficos?.emoji_posicao : 'Sem emoji'}

PADRÕES POR TIPO DE SLIDE:
- Gancho (slide 1): ${JSON.stringify(styleModel!.padroes_por_tipo_slide?.slide_gancho || {})}
- Lista: ${JSON.stringify(styleModel!.padroes_por_tipo_slide?.slide_lista || {})}
- Comparação: ${JSON.stringify(styleModel!.padroes_por_tipo_slide?.slide_comparacao || {})}
- CTA (último slide): ${JSON.stringify(styleModel!.padroes_por_tipo_slide?.slide_cta || {})}

REGRAS DE REPLICAÇÃO:
${(styleModel!.regras_replicacao || []).map((r: string, i: number) => `${i + 1}. ${r}`).join('\n')}

PROMPT BASE DE IMAGEM (use como prefixo em todos os image_prompts):
"${styleModel!.prompt_base_imagem || styleModel!.image_style_prompt || ''}"
════════════════════════════════════` : `
Estilo: Jornalístico Dramático (padrão)
Use fundo preto, imagens cinemáticas hiperealistas, texto bold branco centralizado.`

  // ── Monta template do image_prompt por tipo de slide ──────────
  const imagePromptGancho = montarImagePrompt(styleModel, 'gancho')
  const imagePromptLista = montarImagePrompt(styleModel, 'lista')
  const imagePromptComparacao = montarImagePrompt(styleModel, 'comparacao')
  const imagePromptCTA = montarImagePrompt(styleModel, 'cta')
  const imagePromptConteudo = montarImagePrompt(styleModel, 'conteudo')

  const userPrompt = `Conteúdo/Notícia: ${conteudo}
Handle: ${handle}
Número de slides: ${numSlides}
Estilo selecionado: ${estiloNome}
${styleContexto}

INSTRUÇÕES PARA OS image_prompts:
Para cada slide, escolha o tipo correto e use o template correspondente:

SLIDE 1 (gancho): "${imagePromptGancho}"
SLIDES MEIO com lista: "${imagePromptLista}"
SLIDES MEIO com comparação: "${imagePromptComparacao}"
SLIDES MEIO conteúdo geral: "${imagePromptConteudo}"
ÚLTIMO SLIDE (cta): "${imagePromptCTA}"

Substitua [SPECIFIC SCENE] pela cena específica do conteúdo do slide.
Substitua [EXACT HEADLINE], [EXACT BODY TEXT], [CTA TEXT], [HANDLE] pelos textos reais do slide.
A cena deve ser DIRETAMENTE relacionada ao conteúdo do slide — não genérica.

Retorne JSON exato:
{
  "estilo_usado": "${estiloNome}",
  "legenda": "legenda completa em português com emojis estratégicos e 15-20 hashtags relevantes — finalize com '🤖 Post criado com CarrosselAI'",
  "slides": [
    {
      "numero": 1,
      "tipo_layout": "gancho | lista | comparacao | cta | conteudo",
      "headline": "TÍTULO EM CAIXA ALTA MÁXIMO 6 PALAVRAS",
      "body": "texto explicativo 2-4 linhas claro e direto em português",
      "cta": "ARRASTA PRO LADO >>>",
      "handle": "${handle}",
      "emoji": "emoji relevante se o estilo usar (ou null)",
      "items_lista": null,
      "comparacao": null,
      "image_prompt": "prompt completo ultra-detalhado em inglês baseado no template do tipo de slide"
    }
  ]
}

Para slides tipo LISTA, preencha items_lista:
"items_lista": [
  { "destaque": "palavra chave", "cor": "#hex da cor de destaque", "complemento": "resto da frase" }
]

Para slides tipo COMPARAÇÃO, preencha comparacao:
"comparacao": {
  "coluna_a": { "label": "texto", "cor_label": "#hex", "descricao": "descrição" },
  "coluna_b": { "label": "texto", "cor_label": "#hex", "descricao": "descrição" }
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
  if (!content) throw new Error('Modelo não retornou conteúdo')

  const resultado = JSON.parse(extrairJSON(content)) as CarrosselGerado

  if (!resultado.slides || !Array.isArray(resultado.slides)) {
    throw new Error('Formato inválido — sem array de slides')
  }

  if (resultado.slides.length !== numSlides) {
    console.warn(`Modelo retornou ${resultado.slides.length} slides, esperado ${numSlides}`)
  }

  return resultado
}

/**
 * Gera apenas a legenda para um carrossel existente
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
Todo conteúdo em PORTUGUÊS DO BRASIL.
Tom: profissional e descontraído ao mesmo tempo.
Retorne APENAS o texto da legenda, sem explicações.`,
      },
      {
        role: 'user',
        content: `Título: ${titulo}
Handle: ${handle}

Slides:
${slidesResumidos}

Crie legenda completa com emojis, 15-20 hashtags e finalize com:
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
 * O style_model extraído é passado diretamente para gerarCarrossel().
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
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT_EXTRACAO_ESTILO },
          ...imageMessages,
        ],
      },
    ],
    max_tokens: 4000,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('Vision não retornou análise de estilo')

  return JSON.parse(extrairJSON(content)) as StyleJson
}