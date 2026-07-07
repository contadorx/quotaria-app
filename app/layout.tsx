import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quotaria — Infraestrutura do honorário premium',
  description: 'Gestão de holdings familiares para contadores.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-cream font-sans text-navy antialiased">
        {children}
      </body>
    </html>
  )
}
