export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold text-base font-extrabold text-rail ${className}`}
    >
      Q
    </span>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-bold tracking-tight ${className}`}>Quotaria</span>
  )
}
