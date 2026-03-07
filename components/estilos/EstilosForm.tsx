'use client'
// ═══════════════════════════════════════════════════════════════
// components/estilos/EstilosForm.tsx — Upload de imagens de referência
// Vision analisa o estilo e cria um style_model
// ═══════════════════════════════════════════════════════════════
import { useState, useRef } from 'react'
import { Upload, Loader2, CheckCircle, Palette, X, Pencil, Trash2, ChevronDown, ChevronUp, Save } from 'lucide-react'
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

  // Estado de edição
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editPromptImagem, setEditPromptImagem] = useState('')
  const [salvando, setSalvando] = useState(false)

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

  function abrirEdicao(estilo: StyleModel) {
    setEditandoId(estilo.id)
    setEditNome(estilo.nome)
    setEditDescricao(estilo.style_json.descricao_geral ?? '')
    setEditPromptImagem(
      estilo.style_json.prompt_base_imagem ??
      estilo.style_json.image_style_prompt ??
      ''
    )
  }

  function fecharEdicao() {
    setEditandoId(null)
  }

  async function salvarEdicao(estilo: StyleModel) {
    setSalvando(true)
    try {
      const novoStyleJson = {
        ...estilo.style_json,
        descricao_geral: editDescricao,
        image_style_prompt: editPromptImagem,
        prompt_base_imagem: editPromptImagem,
      }

      const res = await fetch('/api/estilos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: estilo.id, nome: editNome, style_json: novoStyleJson }),
      })

      if (!res.ok) throw new Error('Erro ao salvar')

      toast({ title: 'Estilo atualizado!' })
      fecharEdicao()
      await recarregarEstilos()
    } catch {
      toast({ title: 'Erro ao salvar estilo', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  async function excluirEstilo(id: string) {
    if (!confirm('Excluir este estilo?')) return
    try {
      const res = await fetch('/api/estilos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Erro ao excluir')
      toast({ title: 'Estilo excluído' })
      await recarregarEstilos()
    } catch {
      toast({ title: 'Erro ao excluir estilo', variant: 'destructive' })
    }
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
            {estilos.map((estilo) => {
              const isEditando = editandoId === estilo.id
              return (
                <div
                  key={estilo.id}
                  className={cn(
                    'rounded-lg border transition-colors',
                    estilo.ativo
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border'
                  )}
                >
                  {/* Cabeçalho do card */}
                  <div className="flex items-center gap-3 p-3">
                    <Palette className={cn('w-4 h-4 shrink-0', estilo.ativo ? 'text-primary' : 'text-muted-foreground')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{estilo.nome}</p>
                      {!isEditando && (
                        <p className="text-xs text-muted-foreground truncate">
                          {estilo.style_json.descricao_geral?.slice(0, 80)}...
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {estilo.ativo && (
                        <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full mr-1">
                          Ativo
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => isEditando ? fecharEdicao() : abrirEdicao(estilo)}
                        className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Editar estilo"
                      >
                        {isEditando ? <ChevronUp className="w-4 h-4" /> : <Pencil className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirEstilo(estilo.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Excluir estilo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Painel de edição inline */}
                  {isEditando && (
                    <div className="border-t border-border px-3 pb-3 pt-3 space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-medium">Nome</label>
                        <input
                          type="text"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          className="input-dark text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-medium">Descrição geral do estilo</label>
                        <textarea
                          value={editDescricao}
                          onChange={(e) => setEditDescricao(e.target.value)}
                          rows={4}
                          className="input-dark text-sm resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs text-muted-foreground font-medium">Prompt de imagem</label>
                        <textarea
                          value={editPromptImagem}
                          onChange={(e) => setEditPromptImagem(e.target.value)}
                          rows={5}
                          className="input-dark text-sm resize-none"
                          placeholder="Prompt usado para gerar as imagens de fundo dos slides..."
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={fecharEdicao}
                          className="btn-secondary text-sm px-3 py-1.5"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => salvarEdicao(estilo)}
                          disabled={salvando}
                          className="btn-primary text-sm px-3 py-1.5"
                        >
                          {salvando ? (
                            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
                          ) : (
                            <><Save className="w-3.5 h-3.5" /> Salvar</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
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
              Analisando estilo visual...
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
