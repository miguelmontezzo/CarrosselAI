import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function MobileHeader() {
    return (
        <header className="md:hidden sticky top-0 z-50 flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="titulo-bebas text-lg text-gradient">CarrosselAI</span>
            </Link>
        </header>
    )
}
