'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Radar,
  CalendarClock,
  ClipboardCheck,
  ArrowLeftRight,
  Gift,
  FolderClosed,
  FileText,
  Settings,
  HelpCircle,
  Briefcase,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from 'lucide-react'
import { LogoMark, Wordmark } from '@/components/brand'
import { signout } from '@/app/app/actions'

const NAV: { href: string; label: string; icon: LucideIcon; match: (p: string) => boolean }[] = [
  {
    href: '/app',
    label: 'Famílias',
    icon: Users,
    match: (p) => p === '/app' || p.startsWith('/app/familias') || p.startsWith('/app/holdings'),
  },
  {
    href: '/app/radar',
    label: 'Radar',
    icon: Radar,
    match: (p) => p.startsWith('/app/radar'),
  },
  {
    href: '/app/calendario',
    label: 'Calendário',
    icon: CalendarClock,
    match: (p) => p.startsWith('/app/calendario'),
  },
  {
    href: '/app/mes',
    label: 'Mês da Holding',
    icon: ClipboardCheck,
    match: (p) => p.startsWith('/app/mes'),
  },
  {
    href: '/app/distribuicoes',
    label: 'Distribuições',
    icon: ArrowLeftRight,
    match: (p) => p.startsWith('/app/distribuicoes'),
  },
  {
    href: '/app/doacoes',
    label: 'Doações',
    icon: Gift,
    match: (p) => p.startsWith('/app/doacoes'),
  },
  {
    href: '/app/documentos',
    label: 'Documentos',
    icon: FolderClosed,
    match: (p) => p.startsWith('/app/documentos'),
  },
  {
    href: '/app/relatorios',
    label: 'Relatórios',
    icon: FileText,
    match: (p) => p.startsWith('/app/relatorios'),
  },
  {
    href: '/app/ajuda',
    label: 'Ajuda',
    icon: HelpCircle,
    match: (p) => p.startsWith('/app/ajuda'),
  },
  {
    href: '/app/configuracoes',
    label: 'Configurações',
    icon: Settings,
    match: (p) => p.startsWith('/app/configuracoes'),
  },
]

const EM_BREVE: { label: string; icon: LucideIcon }[] = []

export function Sidebar({
  email,
  orgNome,
  colapsado,
  onToggle,
  superAdmin = false,
}: {
  email: string
  orgNome: string
  colapsado: boolean
  onToggle: () => void
  superAdmin?: boolean
}) {
  const pathname = usePathname()

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col bg-rail py-5 shadow-rail transition-all duration-200 md:flex ${
        colapsado ? 'w-[72px] items-center px-2' : 'w-[240px] px-3'
      }`}
    >
      {/* topo: logo + toggle */}
      <div
        className={`mb-6 flex w-full items-center ${
          colapsado ? 'justify-center' : 'justify-between px-1'
        }`}
      >
        <Link href="/app" className="flex items-center gap-2.5 overflow-hidden">
          <LogoMark />
          {!colapsado && <Wordmark className="text-[15px] text-white" />}
        </Link>
        {!colapsado && (
          <button
            onClick={onToggle}
            title="Recolher menu"
            aria-label="Recolher menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-rail-muted transition hover:bg-rail-hover hover:text-white"
          >
            <ChevronsLeft size={18} />
          </button>
        )}
      </div>

      {colapsado && (
        <button
          onClick={onToggle}
          title="Expandir menu"
          aria-label="Expandir menu"
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg text-rail-muted transition hover:bg-rail-hover hover:text-white"
        >
          <ChevronsRight size={18} />
        </button>
      )}

      {/* navegação */}
      <nav className={`flex flex-1 flex-col gap-1 ${colapsado ? 'items-center' : ''}`}>
        {(superAdmin
          ? [...NAV, { href: '/app/admin', label: 'Negócio', icon: Briefcase, match: (p: string) => p.startsWith('/app/admin') }]
          : NAV
        ).map(({ href, label, icon: Icon, match }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} active={match(pathname)} colapsado={colapsado} />
        ))}

        {EM_BREVE.length > 0 && (
          <>
            {!colapsado ? (
              <p className="px-3 pb-1 pt-6 text-[10px] font-semibold uppercase tracking-wider text-rail-muted/60">
                Em breve
              </p>
            ) : (
              <div className="my-3 h-px w-8 bg-white/10" />
            )}
            {EM_BREVE.map(({ label, icon: Icon }) => (
              <DisabledItem key={label} label={label} Icon={Icon} colapsado={colapsado} />
            ))}
          </>
        )}
      </nav>

      {/* rodapé: usuário + sair */}
      <div
        className={`mt-auto w-full border-t border-white/10 pt-3 ${
          colapsado ? 'flex flex-col items-center' : ''
        }`}
      >
        {!colapsado && (
          <div className="px-3 pb-1">
            <div className="truncate text-xs font-semibold text-white/80">{orgNome}</div>
            <div className="truncate text-[11px] text-rail-muted">{email}</div>
          </div>
        )}
        <form action={signout} className={colapsado ? '' : 'w-full'}>
          <button
            title="Sair"
            aria-label="Sair"
            className={`flex items-center gap-3 rounded-xl text-sm font-medium text-rail-muted transition hover:bg-rail-hover hover:text-white ${
              colapsado ? 'h-10 w-10 justify-center' : 'w-full px-3 py-2'
            }`}
          >
            <LogOut size={18} className="shrink-0" />
            {!colapsado && 'Sair'}
          </button>
        </form>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  label,
  Icon,
  active,
  colapsado,
}: {
  href: string
  label: string
  Icon: LucideIcon
  active: boolean
  colapsado: boolean
}) {
  return (
    <Link
      href={href}
      title={colapsado ? label : undefined}
      className={`relative flex items-center gap-3 rounded-xl text-sm font-medium transition ${
        colapsado ? 'h-10 w-10 justify-center' : 'h-10 px-3'
      } ${active ? 'bg-gold/15 text-gold' : 'text-rail-muted hover:bg-rail-hover hover:text-white'}`}
    >
      {active && (
        <span className={`absolute h-6 w-1 rounded-r bg-gold ${colapsado ? '-left-2' : 'left-0'}`} />
      )}
      <Icon size={18} className="shrink-0" />
      {!colapsado && <span>{label}</span>}
    </Link>
  )
}

function DisabledItem({
  label,
  Icon,
  colapsado,
}: {
  label: string
  Icon: LucideIcon
  colapsado: boolean
}) {
  return (
    <div
      title={colapsado ? `${label} (em breve)` : undefined}
      className={`flex cursor-default items-center gap-3 rounded-xl text-sm font-medium text-rail-muted/45 ${
        colapsado ? 'h-10 w-10 justify-center' : 'h-10 px-3'
      }`}
    >
      <Icon size={18} className="shrink-0" />
      {!colapsado && (
        <>
          <span>{label}</span>
          <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-rail-muted/60">
            breve
          </span>
        </>
      )}
    </div>
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
