'use client'
// ═══════════════════════════════════════════════════════════════
// components/estilos/EstilosForm.tsx — Upload de imagens de referência
// GPT-4 Vision analisa o estilo e cria um style_model
// ═══════════════════════════════════════════════════════════════
import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle, Palette, X } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { StyleModel } from '@/types'
import { cn } from '@/lib/utils'

interface EstilosFormProps {
  estilosExistentes: StyleModel[]
}

export function EstilosForm({ estilosExistentes: initialEstilos }: EstilosFormProps) {
  const [estilos, setEstilos] = useState<StyleModel[]>(initialEstilos)
  const [nome, setNome] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [carregando, setCarregando] = useState(false)
  const [analise, setAnalise] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function recarregarEstilos() {
    const supabase = createClient()
    const { data } = await supabase
      .from('style_models')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setEstilos(data as StyleModel[])
  }

  function handleArquivos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length + arquivos.length > 5) {
      toast({ title: 'Máximo de 5 imagens', variant: 'destructive' })
      return
    }
    setArquivos((prev) => [...prev, ...files].slice(0, 5))
  }

  function removerArquivo(index: number) {
    setArquivos((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nome.trim()) {
      toast({ title: 'Informe um nome para o estilo', variant: 'destructive' })
      return
    }
    if (arquivos.length === 0) {
      toast({ title: 'Adicione pelo menos uma imagem de referência', variant: 'destructive' })
      return
    }

    setCarregando(true)
    setAnalise(null)

    const formData = new FormData()
    formData.append('nome', nome)
    arquivos.forEach((f) => formData.append('imagens', f))

    try {
      const response = await fetch('/api/estilos', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Erro ao analisar estilo')

      const { styleJson } = await response.json()
      setAnalise(styleJson.descricao_geral)

      toast({
        title: 'Estilo salvo!',
        description: 'Será usado em todos os próximos carrosseis.',
      })

      setNome('')
      setArquivos([])

      // Recarrega a lista de estilos automaticamente após salvar
      await recarregarEstilos()
    } catch {
      toast({ title: 'Erro ao analisar estilo', variant: 'destructive' })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Estilos existentes */}
      {estilos.length > 0 && (
        <div className="card-dark space-y-3">
          <h3 className="text-sm font-semibold">Estilos Salvos</h3>
          <div className="space-y-2">
            {estilos.map((estilo) => (
              <div
                key={estilo.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  estilo.ativo
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border'
                )}
              >
                <Palette className={cn('w-4 h-4', estilo.ativo ? 'text-primary' : 'text-muted-foreground')} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{estilo.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {estilo.style_json.descricao_geral?.slice(0, 80)}...
                  </p>
                </div>
                {estilo.ativo && (
                  <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Ativo
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulário de novo estilo */}
      <form onSubmit={handleSubmit} className="card-dark space-y-5">
        <h3 className="text-sm font-semibold">Adicionar Novo Estilo</h3>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Nome do Estilo</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Dark Jornalístico, Clean Minimalista..."
            className="input-dark"
            disabled={carregando}
          />
        </div>

        {/* Drop zone para imagens */}
        <div className="space-y-3">
          <label className="text-sm text-muted-foreground">
            Imagens de Referência (até 5)
          </label>

          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Clique para selecionar imagens dos seus carrosseis de referência
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              JPG, PNG — máximo 5 imagens
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleArquivos}
          />

          {/* Preview dos arquivos selecionados */}
          {arquivos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {arquivos.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-lg text-sm"
                >
                  <span className="text-xs truncate max-w-[120px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removerArquivo(index)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="btn-primary w-full justify-center"
        >
          {carregando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analisando com GPT-4 Vision...
            </>
          ) : (
            <>
              <Palette className="w-4 h-4" />
              Analisar e Salvar Estilo
            </>
          )}
        </button>

        {/* Resultado da análise */}
        {analise && (
          <div className="bg-green-400/5 border border-green-400/20 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Estilo analisado com sucesso!
            </div>
            <p className="text-sm text-muted-foreground">{analise}</p>
          </div>
        )}
      </form>
    </div>
  )
}
