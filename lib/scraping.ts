// ═══════════════════════════════════════════════════════════════
// lib/scraping.ts — Extração de conteúdo de notícias via Cheerio
// Tenta múltiplas estratégias para extrair o texto principal
// ═══════════════════════════════════════════════════════════════
import * as cheerio from 'cheerio'

export interface ConteudoExtraido {
  titulo: string
  corpo: string
  fonte: string
  imagem?: string
}

/**
 * Extrai o conteúdo principal de uma URL de notícia
 * Usa heurísticas baseadas em seletores comuns de portais de notícia
 *
 * @param url - URL da notícia a extrair
 * @returns Objeto com título, corpo, fonte e imagem (se disponível)
 */
export async function extrairConteudo(
  url: string
): Promise<ConteudoExtraido> {
  // Faz o fetch da página com User-Agent de navegador
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    // Timeout de 10 segundos para não travar o processamento
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`Erro ao acessar URL: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  const $ = cheerio.load(html)

  // Remove elementos que poluem o texto (nav, ads, footer, etc.)
  $('nav, header, footer, aside, script, style, .ad, .ads, .advertisement, ' +
    '.sidebar, .menu, .nav, #comments, .comments, .social-share').remove()

  // ─── Extração do título ───────────────────────────────────────
  const titulo = extrairTitulo($)

  // ─── Extração do corpo do artigo ─────────────────────────────
  const corpo = extrairCorpo($)

  // ─── Extração da imagem principal ────────────────────────────
  const imagem = extrairImagemPrincipal($, url)

  // Domínio como fonte
  const fonte = new URL(url).hostname.replace('www.', '')

  return {
    titulo,
    corpo,
    fonte,
    imagem,
  }
}

// ─── Funções auxiliares de extração ─────────────────────────────

function extrairTitulo($: cheerio.CheerioAPI): string {
  // Tenta seletores em ordem de prioridade
  const seletores = [
    'h1[class*="title"]',
    'h1[class*="headline"]',
    'h1[itemprop="headline"]',
    'article h1',
    'main h1',
    '.article-title',
    '.post-title',
    '.entry-title',
    'h1',
    'title',
  ]

  for (const seletor of seletores) {
    const texto = $(seletor).first().text().trim()
    if (texto && texto.length > 10) {
      return texto
    }
  }

  return 'Sem título'
}

function extrairCorpo($: cheerio.CheerioAPI): string {
  // Seletores de container de artigo em portais brasileiros e internacionais
  const seletoresArtigo = [
    'article[class*="content"]',
    'article[class*="article"]',
    'article[class*="post"]',
    '[itemprop="articleBody"]',
    '[class*="article-body"]',
    '[class*="article-content"]',
    '[class*="post-content"]',
    '[class*="entry-content"]',
    '[class*="story-body"]',
    '[class*="text-content"]',
    'article',
    'main',
    '.content',
  ]

  for (const seletor of seletoresArtigo) {
    const container = $(seletor).first()
    if (container.length) {
      // Pega todos os parágrafos do container
      const paragrafos: string[] = []
      container.find('p').each((_, el) => {
        const texto = $(el).text().trim()
        if (texto.length > 30) { // Ignora parágrafos muito curtos
          paragrafos.push(texto)
        }
      })

      if (paragrafos.length >= 2) {
        // Limita a 2000 caracteres para não exceder limite do GPT
        const corpo = paragrafos.join('\n\n')
        return corpo.length > 2000 ? corpo.substring(0, 2000) + '...' : corpo
      }
    }
  }

  // Fallback: pega os maiores parágrafos da página
  const paragrafos: string[] = []
  $('p').each((_, el) => {
    const texto = $(el).text().trim()
    if (texto.length > 50) {
      paragrafos.push(texto)
    }
  })

  const corpo = paragrafos.slice(0, 10).join('\n\n')
  return corpo.length > 2000 ? corpo.substring(0, 2000) + '...' : corpo
}

function extrairImagemPrincipal(
  $: cheerio.CheerioAPI,
  baseUrl: string
): string | undefined {
  // Tenta Open Graph primeiro (mais confiável)
  const ogImage = $('meta[property="og:image"]').attr('content')
  if (ogImage) return ogImage

  // Depois Twitter Card
  const twitterImage = $('meta[name="twitter:image"]').attr('content')
  if (twitterImage) return twitterImage

  // Primeira imagem grande no artigo
  let primeiraImagem: string | undefined

  $('article img, main img').each((_, el) => {
    if (primeiraImagem) return

    const src = $(el).attr('src') || $(el).attr('data-src')
    const width = parseInt($(el).attr('width') ?? '0', 10)

    if (src && (width > 300 || !width)) {
      // Converte para URL absoluta se necessário
      try {
        primeiraImagem = new URL(src, baseUrl).href
      } catch {
        primeiraImagem = src
      }
    }
  })

  return primeiraImagem
}
