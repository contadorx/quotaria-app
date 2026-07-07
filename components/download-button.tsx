'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function DownloadButton({ path }: { path: string }) {
  const [loading, setLoading] = useState(false)
  async function baixar() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage.from('documentos').createSignedUrl(path, 60)
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
      else alert('Não foi possível gerar o link' + (error ? ': ' + error.message : '.'))
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={baixar}
      disabled={loading}
      title="Baixar"
      aria-label="Baixar"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft transition hover:bg-surface hover:text-navy disabled:opacity-50"
    >
      <Download size={15} />
    </button>
  )
}
