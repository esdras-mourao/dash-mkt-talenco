import { supabase } from './supabase'

// URL base das Edge Functions — padrão Supabase
const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function callFunction(name) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  if (!token) throw new Error('Usuário não autenticado')

  const res = await fetch(`${FUNCTIONS_URL}/${name}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`${name}: ${res.status} — ${err}`)
  }

  return res.json()
}

export const syncMetaAds   = () => callFunction('sync-meta-ads')
export const syncPipedrive = () => callFunction('sync-pipedrive')

export async function syncAll() {
  const [meta, pipedrive] = await Promise.allSettled([
    syncMetaAds(),
    syncPipedrive(),
  ])
  return {
    meta:      meta.status      === 'fulfilled' ? meta.value      : { ok: false, erro: meta.reason?.message },
    pipedrive: pipedrive.status === 'fulfilled' ? pipedrive.value : { ok: false, erro: pipedrive.reason?.message },
  }
}
