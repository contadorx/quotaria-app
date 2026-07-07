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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface font-sans text-ink antialiased">{children}</body>
    </html>
  )
}
