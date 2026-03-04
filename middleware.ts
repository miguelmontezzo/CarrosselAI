// ═══════════════════════════════════════════════════════════════
// middleware.ts — Middleware do Next.js para autenticação
// Protege rotas que exigem login via Supabase Auth
// ═══════════════════════════════════════════════════════════════
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Cria cliente Supabase no middleware para checar sessão
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: Não execute lógica entre createServerClient e getUser()
  // para não desincronizar cookies de sessão
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas públicas — acessíveis sem login
  const rotasPublicas = ['/login', '/auth', '/api/processar', '/api/postar']
  const isPublica = rotasPublicas.some((rota) =>
    request.nextUrl.pathname.startsWith(rota)
  )

  // Redireciona para login se não autenticado
  if (!user && !isPublica) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redireciona para dashboard se já logado e tentar acessar /login
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Aplica middleware em todas as rotas exceto assets estáticos
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
