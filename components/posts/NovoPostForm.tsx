'use client'
// ═══════════════════════════════════════════════════════════════
// components/posts/NovoPostForm.tsx — Formulário de criação de post
// Toggle entre "Colar Link" e "Digitar Tema" com animação
// ═══════════════════════════════════════════════════════════════
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Link, FileText, Loader2, Sparkles, Hash } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

type ModoInput = 'link' | 'tema'

const OPCOES_SLIDES = [3, 5, 7, 9] as const

export function NovoPostForm() {
  const router = useRouter()
  const [modo, setModo] = useState<ModoInput>('link')
  const [link, setLink] = useState('')
  const [tema, setTema] = useState('')
  const [numSlides, setNumSlides] = useState(7)
  const [handle, setHandle] = useState('@miguelito.ai')
  const [carregando, setCarregando] = useState(false)
  const [etapa, setEtapa] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validação básica
    if (modo === 'link' && !link.trim()) {
      toast({ title: 'Informe um link', variant: 'destructive' })
      return
    }
    if (modo === 'tema' && !tema.trim()) {
      toast({ title: 'Informe um tema', variant: 'destructive' })
      return
    }

    setCarregando(true)
    setEtapa('Criando post...')

    try {
      const response = await fetch('/api/posts/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link: modo === 'link' ? link : undefined,
          tema: modo === 'tema' ? tema : undefined,
          num_slides: numSlides,
          handle,
        }),
      })

      if (!response.ok) {
        const erro = await response.json()
        throw new Error(erro.error ?? 'Erro ao criar post')
      }

      const { postId } = await response.json()

      setEtapa('Disparando geração...')

      toast({
        title: 'Carrossel sendo gerado!',
        description: 'Você será redirecionado para acompanhar o progresso.',
      })

      // Redireciona para a página do post onde o usuário acompanha em tempo real
      router.push(`/posts/${postId}`)
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : 'Erro desconhecido'
      toast({ title: 'Erro ao criar post', description: mensagem, variant: 'destructive' })
      setCarregando(false)
      setEtapa('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ─── Toggle Link / Tema ─────────────────────────────────── */}
      <div className="card-dark p-1 flex gap-1">
        <button
          type="button"
          onClick={() => setModo('link')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200',
            modo === 'link'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Link className="w-4 h-4" />
          Colar Link
        </button>
        <button
          type="button"
          onClick={() => setModo('tema')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200',
            modo === 'tema'
              ? 'bg-primary text-white'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <FileText className="w-4 h-4" />
          Digitar Tema
        </button>
      </div>

      {/* ─── Input de Link ou Tema ──────────────────────────────── */}
      <div className="card-dark space-y-4">
        {modo === 'link' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">URL da Notícia</label>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://g1.globo.com/noticia..."
              className="input-dark"
              disabled={carregando}
            />
            <p className="text-xs text-muted-foreground">
              Cole a URL de qualquer notícia ou artigo. O sistema extrai o conteúdo automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Tema ou Assunto</label>
            <textarea
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              placeholder="Descreva o tema do carrossel. Ex: As 7 tendências de IA em 2025 que vão mudar o mercado de trabalho..."
              className="input-dark min-h-[120px] resize-none"
              disabled={carregando}
            />
            <p className="text-xs text-muted-foreground">
              Quanto mais detalhes, melhor o resultado. Pode incluir pontos que quer abordar.
            </p>
          </div>
        )}
      </div>

      {/* ─── Configurações do carrossel ─────────────────────────── */}
      <div className="card-dark space-y-4">
        <h3 className="text-sm font-semibold">Configurações</h3>

        {/* Número de slides */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">
            Quantidade de slides
          </label>
          <div className="flex gap-2">
            {OPCOES_SLIDES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setNumSlides(n)}
                disabled={carregando}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border',
                  numSlides === n
                    ? 'bg-primary border-primary text-white'
                    : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                )}
              >
                {n}
              </button>
            ))}
          </div>
          {numSlides === 7 && (
            <p className="text-xs text-primary">
              ✓ Recomendado — melhor engajamento no Instagram
            </p>
          )}
        </div>

        {/* Handle do Instagram */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5" />
            Handle do Instagram
          </label>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@seuhandle"
            className="input-dark"
            disabled={carregando}
          />
        </div>
      </div>

      {/* ─── Botão de submit ────────────────────────────────────── */}
      <button
        type="submit"
        disabled={carregando}
        className="btn-primary w-full justify-center py-4 text-base"
      >
        {carregando ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {etapa || 'Gerando...'}
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Gerar Carrossel com IA
          </>
        )}
      </button>
    </form>
  )
}
