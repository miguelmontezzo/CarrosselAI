'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from './Sidebar'
import { cn } from '@/lib/utils'

export function BottomNav() {
    const pathname = usePathname()

    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-border p-2 px-4 shadow-xl">
            <div className="flex items-center justify-around gap-2">
                {navItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href))

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex flex-col items-center justify-center w-full py-2 px-1 rounded-xl transition-all duration-200',
                                isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground',
                                item.destaque && !isActive && 'text-primary'
                            )}
                        >
                            <item.icon className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-medium leading-none">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
