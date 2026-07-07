'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  CalendarClock,
  ArrowLeftRight,
  FolderClosed,
  FileText,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { LogoMark, Wordmark } from '@/components/brand'
import { signout } from '@/app/app/actions'

const NAV = [{ href: '/app', label: 'Famílias', icon: Users }]

const EM_BREVE: { label: string; icon: LucideIcon }[] = [
  { label: 'Calendário', icon: CalendarClock },
  { label: 'Distribuições', icon: ArrowLeftRight },
  { label: 'Documentos', icon: FolderClosed },
  { label: 'Relatórios', icon: FileText },
]

export function Sidebar({ email }: { email: string }) {
  const pathname = usePathname()
  const active = pathname.startsWith('/app')

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col bg-rail px-3 py-5 shadow-rail md:flex">
      <Link href="/app" className="mb-7 flex items-center gap-2.5 px-1">
        <LogoMark />
        <Wordmark className="text-[15px] text-white" />
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
              active
                ? 'bg-gold/15 text-gold'
                : 'text-rail-muted hover:bg-rail-hover hover:text-white'
            }`}
          >
            {active && <span className="absolute left-0 h-6 w-1 rounded-r bg-gold" />}
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </Link>
        ))}

        <p className="px-3 pb-1 pt-6 text-[10px] font-semibold uppercase tracking-wider text-rail-muted/60">
          Em breve
        </p>
        {EM_BREVE.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex h-10 cursor-default items-center gap-3 rounded-xl px-3 text-sm font-medium text-rail-muted/45"
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
            <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-rail-muted/60">
              breve
            </span>
          </div>
        ))}
      </nav>

      <div className="mt-auto border-t border-white/10 pt-3">
        <div className="truncate px-3 pb-1 text-xs text-rail-muted">{email}</div>
        <form action={signout}>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-rail-muted transition hover:bg-rail-hover hover:text-white">
            <LogOut size={18} className="shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </aside>
  )
}

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between bg-rail px-4 py-3 md:hidden">
      <Link href="/app" className="flex items-center gap-2">
        <LogoMark className="h-8 w-8 text-sm" />
        <Wordmark className="text-sm text-white" />
      </Link>
      <form action={signout}>
        <button className="text-rail-muted transition hover:text-white" aria-label="Sair">
          <LogOut size={20} />
        </button>
      </form>
    </header>
  )
}
