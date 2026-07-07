'use client'

import { useState } from 'react'
import { Sidebar, MobileHeader } from '@/components/sidebar'
import { BuscaGlobal } from '@/components/busca-global'

export function AppShell({
  email,
  orgNome,
  colapsadoInicial,
  superAdmin = false,
  children,
}: {
  email: string
  orgNome: string
  colapsadoInicial: boolean
  superAdmin?: boolean
  children: React.ReactNode
}) {
  const [colapsado, setColapsado] = useState(colapsadoInicial)

  function toggle() {
    setColapsado((c) => {
      const novo = !c
      // lembra a preferência sem ir ao servidor (instantâneo, sem flash no reload)
      document.cookie = `quotaria_sidebar=${novo ? 'col' : 'exp'}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
      return novo
    })
  }

  return (
    <div className="min-h-[100dvh]">
      <Sidebar email={email} orgNome={orgNome} colapsado={colapsado} onToggle={toggle} superAdmin={superAdmin} />
      <MobileHeader />
      <div className={`transition-all duration-200 ${colapsado ? 'md:pl-[72px]' : 'md:pl-[240px]'}`}>
        <div className="no-print sticky top-0 z-30 hidden border-b border-line bg-cream/80 backdrop-blur md:block">
          <div className="mx-auto flex max-w-[1100px] items-center justify-end px-8 py-2.5">
            <BuscaGlobal />
          </div>
        </div>
        <main className="mx-auto max-w-[1100px] px-5 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  )
}
