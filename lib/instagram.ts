// ═══════════════════════════════════════════════════════════════
// lib/instagram.ts — Instagram Graph API para publicação de carrosseis
// Fluxo: criar containers de imagem → criar container carrossel → publicar
// ═══════════════════════════════════════════════════════════════

const IG_API_BASE = 'https://graph.facebook.com/v19.0'
const USER_ID = process.env.INSTAGRAM_USER_ID!
const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN!

/**
 * Cria um container de mídia para uma única imagem no Instagram
 * Passo 1 do processo de publicação de carrossel
 *
 * @param imageUrl - URL pública da imagem (deve estar no Supabase Storage)
 * @returns ID do container criado
 */
async function criarContainerImagem(imageUrl: string): Promise<string> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: 'true', // Marca como item de carrossel
    access_token: ACCESS_TOKEN,
  })

  const response = await fetch(
    `${IG_API_BASE}/${USER_ID}/media?${params.toString()}`,
    { method: 'POST' }
  )

  if (!response.ok) {
    const erro = await response.json()
    throw new Error(
      `Erro ao criar container de imagem: ${JSON.stringify(erro)}`
    )
  }

  const data = await response.json()
  return data.id as string
}

/**
 * Cria o container do carrossel com todos os containers de imagem
 * Passo 2 do processo de publicação
 *
 * @param containerIds - IDs dos containers de imagem criados
 * @param legenda - Legenda completa do post
 * @returns ID do container carrossel
 */
async function criarContainerCarrossel(
  containerIds: string[],
  legenda: string
): Promise<string> {
  const params = new URLSearchParams({
    media_type: 'CAROUSEL',
    caption: legenda,
    children: containerIds.join(','), // IDs separados por vírgula
    access_token: ACCESS_TOKEN,
  })

  const response = await fetch(
    `${IG_API_BASE}/${USER_ID}/media?${params.toString()}`,
    { method: 'POST' }
  )

  if (!response.ok) {
    const erro = await response.json()
    throw new Error(
      `Erro ao criar container carrossel: ${JSON.stringify(erro)}`
    )
  }

  const data = await response.json()
  return data.id as string
}

/**
 * Publica o carrossel no Instagram
 * Passo 3 e final do processo
 *
 * @param carrosselContainerId - ID do container carrossel
 * @returns ID do post publicado no Instagram
 */
async function publicarCarrossel(carrosselContainerId: string): Promise<string> {
  const params = new URLSearchParams({
    creation_id: carrosselContainerId,
    access_token: ACCESS_TOKEN,
  })

  const response = await fetch(
    `${IG_API_BASE}/${USER_ID}/media_publish?${params.toString()}`,
    { method: 'POST' }
  )

  if (!response.ok) {
    const erro = await response.json()
    throw new Error(`Erro ao publicar carrossel: ${JSON.stringify(erro)}`)
  }

  const data = await response.json()
  return data.id as string
}

/**
 * Fluxo completo de publicação de carrossel no Instagram
 * Orquestra todos os 3 passos em sequência
 *
 * @param imageUrls - URLs públicas das imagens (ordem dos slides)
 * @param legenda - Legenda completa com hashtags
 * @returns ID do post publicado no Instagram
 */
export async function publicarCarrosselInstagram(
  imageUrls: string[],
  legenda: string
): Promise<string> {
  if (imageUrls.length < 2) {
    throw new Error('Carrossel precisa de pelo menos 2 imagens')
  }

  if (imageUrls.length > 10) {
    throw new Error('Carrossel suporta no máximo 10 imagens')
  }

  // Passo 1: Criar container para cada imagem em paralelo
  console.log(`[Instagram] Criando ${imageUrls.length} containers de imagem...`)
  const containerIds = await Promise.all(
    imageUrls.map((url) => criarContainerImagem(url))
  )

  // Passo 2: Criar container do carrossel
  console.log('[Instagram] Criando container do carrossel...')
  const carrosselId = await criarContainerCarrossel(containerIds, legenda)

  // Aguarda 5 segundos — Instagram precisa processar os containers
  await new Promise((resolve) => setTimeout(resolve, 5000))

  // Passo 3: Publicar
  console.log('[Instagram] Publicando carrossel...')
  const postId = await publicarCarrossel(carrosselId)

  console.log(`[Instagram] Carrossel publicado com sucesso! ID: ${postId}`)
  return postId
}
