import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Client com service role — IGNORA RLS. Usar SOMENTE em rotas de servidor
// sem sessão (webhook do Asaas, cron das réguas). NUNCA expor no cliente.
// Requer SUPABASE_SERVICE_ROLE_KEY no ambiente (Vercel).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role não configurado.')
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
