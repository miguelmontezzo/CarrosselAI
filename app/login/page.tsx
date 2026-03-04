// ═══════════════════════════════════════════════════════════════
// app/login/page.tsx — Página de login com Supabase Auth
// ═══════════════════════════════════════════════════════════════
import { Sparkles, Lock } from 'lucide-react'
import { login } from './actions'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirect?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8 animate-fade-in">

        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="titulo-bebas text-4xl text-gradient">CarrosselAI</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Acesso restrito — faça login para continuar
            </p>
          </div>
        </div>

        {/* Card do formulário */}
        <div className="card-dark space-y-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Lock className="w-4 h-4 text-primary" />
            <span>Entrar na plataforma</span>
          </div>

          {/* Erro de login */}
          {error === 'credenciais_invalidas' && (
            <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm text-red-400">
              E-mail ou senha incorretos. Tente novamente.
            </div>
          )}

          <form action={login} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm text-muted-foreground">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="input-dark"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm text-muted-foreground">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="input-dark"
              />
            </div>

            <button type="submit" className="btn-primary w-full justify-center py-3 mt-2">
              <Sparkles className="w-4 h-4" />
              Entrar
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Sistema privado — acesso apenas para usuários autorizados.
        </p>
      </div>
    </div>
  )
}
