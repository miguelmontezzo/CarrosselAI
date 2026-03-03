// ═══════════════════════════════════════════════════════════════
// lib/supabase/client.ts — Cliente Supabase para componentes Client
// Usado em componentes React com 'use client'
// ═══════════════════════════════════════════════════════════════
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
