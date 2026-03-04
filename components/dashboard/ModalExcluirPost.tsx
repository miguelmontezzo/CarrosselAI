'use client'
// ═══════════════════════════════════════════════════════════════
// components/dashboard/ModalExcluirPost.tsx — Modal de confirmação de exclusão
// Design premium com animação e alerta visual de perigo
// ═══════════════════════════════════════════════════════════════
import { useState } from 'react'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface ModalExcluirPostProps {
    postId: string
    postTitulo: string | null
    open: boolean
    onClose: () => void
    onDeleted: (postId: string) => void
}

export function ModalExcluirPost({
    postId,
    postTitulo,
    open,
    onClose,
    onDeleted,
}: ModalExcluirPostProps) {
    const [excluindo, setExcluindo] = useState(false)

    if (!open) return null

    async function handleExcluir() {
        setExcluindo(true)
        try {
            const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' })
            if (!res.ok) {
                const erro = await res.json()
                throw new Error(erro.error ?? 'Erro ao excluir')
            }
            toast({ title: 'Carrossel excluído com sucesso!' })
            onDeleted(postId)
            onClose()
        } catch (err) {
            const mensagem = err instanceof Error ? err.message : 'Erro desconhecido'
            toast({ title: 'Erro ao excluir', description: mensagem, variant: 'destructive' })
        } finally {
            setExcluindo(false)
        }
    }

    return (
        /* Overlay */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Fundo escurecido com blur */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative z-10 w-full max-w-md animate-fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="card-dark border border-red-500/30 rounded-2xl p-6 space-y-5 shadow-2xl shadow-red-500/10">
                    {/* Ícone de alerta */}
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                            <Trash2 className="w-7 h-7 text-red-400" />
                        </div>
                    </div>

                    {/* Título e descrição */}
                    <div className="text-center space-y-2">
                        <h2 className="text-xl font-bold text-foreground">
                            Excluir Carrossel
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Tem certeza que deseja excluir{' '}
                            <span className="text-foreground font-medium">
                                &ldquo;{postTitulo ?? 'este carrossel'}&rdquo;
                            </span>
                            ? Esta ação não pode ser desfeita e todos os slides serão removidos.
                        </p>
                    </div>

                    {/* Aviso visual */}
                    <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-red-300 leading-relaxed">
                            Os slides e imagens geradas por IA serão permanentemente excluídos.
                        </p>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={excluindo}
                            className="flex-1 py-2.5 px-4 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-all duration-200 disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleExcluir}
                            disabled={excluindo}
                            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            {excluindo ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Excluindo...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Excluir
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
