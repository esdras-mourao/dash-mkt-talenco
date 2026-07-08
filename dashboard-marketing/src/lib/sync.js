import { supabase } from './supabase'

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL?.replace('.supabase.co', '.functions.supabase.co') + '/v1'

export async function syncMetaAds() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-meta-ads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  return res.json()
}

export async function syncPipedrive() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-pipedrive`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  return res.json()
}

export async function syncAll() {
  const [meta, pipedrive] = await Promise.allSettled([syncMetaAds(), syncPipedrive()])
  return {
    meta: meta.status === 'fulfilled' ? meta.value : { erro: meta.reason?.message },
    pipedrive: pipedrive.status === 'fulfilled' ? pipedrive.value : { erro: pipedrive.reason?.message },
  }
}
