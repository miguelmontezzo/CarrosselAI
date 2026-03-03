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
export interface StyleJson {
  layout: string
  tipografia: {
    titulo: string
    corpo: string
    destaque: string
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

// Payload para criar um novo post
export interface CriarPostPayload {
  link?: string
  tema?: string
  num_slides: number
  handle: string
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
