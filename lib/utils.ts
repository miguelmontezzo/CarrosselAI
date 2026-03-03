// lib/utils.ts — Utilitários compartilhados
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utilitário padrão shadcn/ui para mesclar classes Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
