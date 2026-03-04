// ═══════════════════════════════════════════════════════════════
// types/index.ts — Tipos centrais do CarrosselAI
// ═══════════════════════════════════════════════════════════════

// Status possíveis de um post ao longo do fluxo
export type PostStatus =
  | 'gerando'
  | 'extraindo'
  | 'gerando_prompts'
  | 'gerando_imagens'
  | 'aguardando_aprovacao'
  | 'agendado'
  | 'postando'
  | 'postado'
  | 'erro'

// Representação de um Post no banco de dados
export interface Post {
  id: string
  titulo: string | null
  link_fonte: string | null
  tema: string | null
  legenda: string | null
  handle: string
  num_slides: number
  status: PostStatus
  agendado_para: string | null
  instagram_post_id: string | null
  style_model_id: string | null
  erro_mensagem: string | null
  created_at: string
  posted_at: string | null
  // Campo virtual para mostrar progresso das imagens (ex: "3/7")
  progresso_imagens?: string
  capa_url?: string | null
}

// Representação de um Slide individual
export interface Slide {
  id: string
  post_id: string
  numero: number
  headline: string | null
  body: string | null
  cta: string | null
  handle: string | null
  image_prompt: string | null
  image_url: string | null
  created_at: string
}

// Modelo de estilo visual salvo pelo usuário
export interface StyleModel {
  id: string
  nome: string
  style_json: StyleJson
  ativo: boolean
  created_at: string
}

// Estrutura do JSON de estilo extraído via GPT-4 Vision
// Compatível com prompts antigos (campos legados) e novos (campos expandidos)
export interface StyleJson {
  // Campos legados (compatibilidade com estilos antigos)
  layout: string
  tipografia: {
    titulo: string
    corpo: string
    destaque: string
    // Novos campos expandidos
    headline?: {
      estilo?: string
      tamanho_relativo?: string
      cor?: string
      cor_secundaria?: string
      caixa?: string
      alinhamento?: string
      familia_aproximada?: string
      espacamento_letras?: string
      line_height?: string
    }
    body?: {
      estilo?: string
      tamanho_relativo?: string
      cor?: string
      alinhamento?: string
      familia_aproximada?: string
    }
  }
  cores: {
    fundo: string
    texto_principal: string
    texto_secundario: string
    destaque: string
  }
  posicao_elementos: {
    imagem: string
    titulo: string
    corpo: string
    cta: string
    handle: string
  }
  descricao_geral: string
  image_style_prompt: string

  // Novos campos do prompt expandido
  identidade_visual?: {
    descricao_geral?: string
    tom_visual?: string
    sensacao_emocional?: string
    referencias_esteticas?: string
  }
  background?: {
    tipo?: string
    descricao_detalhada?: string
    paleta_dominante?: string[]
    iluminacao?: string
    temperatura_cor?: string
    profundidade_campo?: string
    camera_style?: string
    grain_texture?: string
    composicao?: string
  }
  layout_estrutura?: {
    divisao_imagem?: string
    tem_gradiente?: boolean
    gradiente_descricao?: string
    posicao_titulo?: string
    posicao_body?: string
    posicao_handle?: string
    posicao_cta?: string
    tem_card?: boolean
    card?: {
      cor_fundo?: string
      opacidade?: string
      border_radius?: string
      sombra?: string
      posicao_no_slide?: string
      padding_interno?: string
    }
  }
  elementos_graficos?: {
    tem_bullets?: boolean
    bullets_estilo?: string
    palavras_destacadas?: boolean
    destaque_estilo?: string
    cores_destaque_bullets?: Array<{ nome: string; hex: string }>
    tem_emoji?: boolean
    emoji_posicao?: string
    tem_borda_card?: boolean
    outros_elementos?: string
  }
  padroes_por_tipo_slide?: {
    slide_gancho?: { descricao?: string; elementos_obrigatorios?: string[] }
    slide_lista?: { descricao?: string; elementos_obrigatorios?: string[] }
    slide_comparacao?: { descricao?: string; elementos_obrigatorios?: string[] }
    slide_cta?: { descricao?: string; elementos_obrigatorios?: string[] }
  }
  prompt_base_imagem?: string
  regras_replicacao?: string[]
  tipografia_resumida?: {
    titulo?: string
    corpo?: string
  }
}

// Estrutura de um slide gerado pelo GPT-4o
export interface SlideGerado {
  numero: number
  headline: string
  body: string
  cta: string
  handle: string
  image_prompt: string
}

// Resposta completa do GPT-4o para geração de carrossel
export interface CarrosselGerado {
  legenda: string
  slides: SlideGerado[]
}

export type ImageModel = 'nanobana-2' | 'nanobana-pro'
export type ImageResolution = '1k' | '2k'

export interface CriarPostPayload {
  link?: string
  tema?: string
  num_slides: number
  handle: string
  style_model_id?: string
  image_model?: ImageModel
  image_resolution?: ImageResolution
}

// Payload para aprovar e agendar um post
export interface AprovarPostPayload {
  postId: string
  legenda: string
  agendado_para?: string // ISO string, opcional (se vazio = postar agora)
}

// Payload que o QStash envia para /api/processar
export interface ProcessarPayload {
  postId: string
  image_model?: ImageModel
  image_resolution?: ImageResolution
}

// Payload que o QStash envia para /api/postar
export interface PostarPayload {
  postId: string
}

// Resposta da Nanobana API
export interface NanobanaResponse {
  image_url: string
  id: string
  status: 'completed' | 'failed'
}

// Resposta da Instagram Graph API ao criar container
export interface InstagramContainerResponse {
  id: string
}

// Label e cor para cada status de post
export const STATUS_CONFIG: Record<
  PostStatus,
  { label: string; color: string; bgColor: string }
> = {
  gerando: {
    label: 'Gerando',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  extraindo: {
    label: 'Extraindo',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  gerando_prompts: {
    label: 'Gerando Prompts',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  gerando_imagens: {
    label: 'Gerando Imagens',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  aguardando_aprovacao: {
    label: 'Aguardando Aprovação',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
  },
  agendado: {
    label: 'Agendado',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
  },
  postando: {
    label: 'Postando',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  postado: {
    label: 'Postado',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10',
  },
  erro: {
    label: 'Erro',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
}

// Converte status para porcentagem de progresso
export function statusToProgress(status: PostStatus): number {
  const map: Record<PostStatus, number> = {
    gerando: 5,
    extraindo: 15,
    gerando_prompts: 35,
    gerando_imagens: 60,
    aguardando_aprovacao: 80,
    agendado: 90,
    postando: 95,
    postado: 100,
    erro: 0,
  }
  return map[status] ?? 0
}
