// app/page.tsx — Redireciona raiz para /dashboard
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/dashboard')
}
