import { supabase } from './supabase'

async function callFunction(name) {
  // Pega a session atual
  const { data: { session } } = await supabase.auth.getSession()
  
  // Monta a URL correta das Edge Functions
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const url = `${supabaseUrl}/functions/v1/${name}`
  
  const headers = {
    'Content-Type': 'application/json',
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
  }
  
  // Adiciona Authorization só se tiver sessão
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  } else {
    // Sem sessão, usa a anon key como bearer
    headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
  }

  console.log(`Calling ${url}`)
  
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })

  const text = await res.text()
  console.log(`Response ${res.status}:`, text)

  if (!res.ok) {
    throw new Error(`${name}: HTTP ${res.status} — ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    return { ok: true, raw: text }
  }
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
