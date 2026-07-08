// ============================================================
// Supabase Edge Function: sync-pipedrive
// Deploy: supabase functions deploy sync-pipedrive
// ============================================================
// Busca negócios do Pipedrive por estágio e salva snapshot mensal

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeamento etapas Pipedrive → dashboard
// IDs reais — substituir pelos IDs do seu pipeline após consulta
const STAGE_MAP: Record<string, string> = {
  // Buscaremos os stages dinamicamente
}

const STAGE_NAME_MAP: Record<string, string> = {
  'Lead':               'lead',
  'Contato Realizado':  'contato_realizado',
  'Qualificado':        'qualificado',
  'Agendamento':        'agendamento',
  'Visita':             'visita',
  'Proposta':           'proposta',
  'Ganho':              'ganho',
  'Perdido':            'perdido',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const PIPEDRIVE_TOKEN = Deno.env.get('PIPEDRIVE_API_TOKEN')!
  const PIPEDRIVE_DOMAIN = Deno.env.get('PIPEDRIVE_DOMAIN') ?? 'talenco'
  const BASE = `https://${PIPEDRIVE_DOMAIN}.pipedrive.com/api/v1`
  const today = new Date().toISOString().slice(0, 10)

  // 1. Buscar stages do pipeline
  const stagesRes = await fetch(`${BASE}/stages?api_token=${PIPEDRIVE_TOKEN}`)
  const stagesJson = await stagesRes.json()
  const stages = stagesJson.data ?? []

  // 2. Para cada stage buscar deals
  const snapshots: any[] = []

  for (const stage of stages) {
    const stageName = stage.name as string
    const estagio = STAGE_NAME_MAP[stageName] ?? stageName.toLowerCase().replace(/\s/g, '_')

    let start = 0
    let total = 0
    let valorTotal = 0

    while (true) {
      const dealsRes = await fetch(
        `${BASE}/deals?stage_id=${stage.id}&start=${start}&limit=100&status=open&api_token=${PIPEDRIVE_TOKEN}`
      )
      const dealsJson = await dealsRes.json()
      const deals = dealsJson.data ?? []

      total += deals.length
      valorTotal += deals.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0)

      if (!dealsJson.additional_data?.pagination?.more_items_in_collection) break
      start += 100
    }

    // Salvar snapshot
    await supabase.from('pipedrive_safra').insert({
      data_snapshot: today,
      estagio,
      quantidade: total,
      valor_total: valorTotal,
    })

    snapshots.push({ estagio, stage_name: stageName, quantidade: total, valor_total: valorTotal })
  }

  return new Response(JSON.stringify({
    ok: true,
    sincronizado_em: new Date().toISOString(),
    estagios: snapshots,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
