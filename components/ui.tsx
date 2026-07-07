import Link from 'next/link'

export const fieldClass =
  'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-gold focus:ring-2 focus:ring-gold/20'

export function PageHeader({
  eyebrow,
  title,
  description,
  back,
}: {
  eyebrow?: string
  title: string
  description?: string
  back?: { href: string; label: string }
}) {
  return (
    <div className="mb-8">
      {back && (
        <Link
          href={back.href}
          className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted transition hover:text-ink"
        >
          ← {back.label}
        </Link>
      )}
      {eyebrow && (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-deep">
          {eyebrow}
        </div>
      )}
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{title}</h1>
      {description && <p className="mt-2 max-w-xl text-sm text-ink-muted">{description}</p>}
    </div>
  )
}

export function Card({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl2 border border-line bg-white shadow-card ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
      {children}
    </h2>
  )
}

export function Label({
  htmlFor,
  children,
}: {
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-ink-muted">
      {children}
    </label>
  )
}

export function SubmitButton({
  action,
  children,
  variant = 'primary',
}: {
  action: (formData: FormData) => void
  children: React.ReactNode
  variant?: 'primary' | 'ghost'
}) {
  const cls =
    variant === 'primary'
      ? 'bg-navy text-white hover:bg-navy-soft'
      : 'border border-line text-ink hover:bg-surface'
  return (
    <button
      formAction={action}
      className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${cls}`}
    >
      {children}
    </button>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card className="p-8 text-center text-sm text-ink-soft">{children}</Card>
  )
}

export function ListCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="divide-y divide-line overflow-hidden">{children}</Card>
  )
}

export function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-cream px-2 py-0.5 text-[11px] font-medium text-navy">
      {children}
    </span>
  )
}
