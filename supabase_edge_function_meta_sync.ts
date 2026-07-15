// ============================================================
// Supabase Edge Function: sync-meta-ads
// Deploy: supabase functions deploy sync-meta-ads
// ============================================================
// Esta função busca dados das campanhas Meta Ads em tempo real
// e sincroniza com as tabelas campanhas e kpis_campanha

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Contas TalenCo queryáveis
const TALENCO_ACCOUNTS = [
  { id: '261847343176342', empreendimento_codigo: 'marino',   nome: 'CA - Marino' },
  { id: '436326696186558', empreendimento_codigo: 'orla',     nome: 'Caiçara SPE (Orla)' },
  { id: '982436320598144', empreendimento_codigo: null,       nome: 'TalenCo Institucional' },
  { id: '461602830307546', empreendimento_codigo: 'arbo',     nome: 'CA - São José (Arbo)' },
]

function parseMetaValue(v: string | null): number {
  if (!v || v === 'Not available') return 0
  return parseFloat(v.replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const META_TOKEN = Deno.env.get('META_ACCESS_TOKEN')!
  const today = new Date().toISOString().slice(0, 10)
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const results: any[] = []

  for (const account of TALENCO_ACCOUNTS) {
    try {
      // Buscar empreendimento_id
      let empId: number | null = null
      if (account.empreendimento_codigo) {
        const { data: emp } = await supabase
          .from('empreendimentos')
          .select('id')
          .eq('codigo', account.empreendimento_codigo)
          .single()
        empId = emp?.id ?? null
      }

      // Buscar campanhas via Meta API
      const url = new URL(`https://graph.facebook.com/v20.0/act_${account.id}/campaigns`)
      url.searchParams.set('fields', 'id,name,status,effective_status,objective,spend,impressions,clicks,reach')
      url.searchParams.set('time_range', JSON.stringify({ since, until: today }))
      url.searchParams.set('access_token', META_TOKEN)
      url.searchParams.set('limit', '50')

      const res = await fetch(url.toString())
      const json = await res.json()

      if (!json.data) continue

      for (const camp of json.data) {
        const spend     = parseMetaValue(camp.spend)
        const impressions = parseMetaValue(camp.impressions)
        const clicks    = parseMetaValue(camp.clicks)
        const reach     = parseMetaValue(camp.reach)

        // Upsert campanha
        const { data: existing } = await supabase
          .from('campanhas')
          .select('id')
          .eq('meta_campaign_id', camp.id)
          .single()

        let campanhaId: number

        if (existing) {
          await supabase.from('campanhas').update({
            status: camp.effective_status === 'ACTIVE' ? 'ativa' : 'pausada',
          }).eq('id', existing.id)
          campanhaId = existing.id
        } else {
          const { data: nova } = await supabase.from('campanhas').insert({
            nome: camp.name,
            empreendimento_id: empId,
            plataforma: 'meta',
            status: camp.effective_status === 'ACTIVE' ? 'ativa' : 'pausada',
            data_inicio: since,
            meta_campaign_id: camp.id,
          }).select('id').single()
          campanhaId = nova?.id
        }

        if (!campanhaId) continue

        // Upsert KPI diário
        if (spend > 0 || impressions > 0) {
          await supabase.from('kpis_campanha').upsert({
            campanha_id: campanhaId,
            data: today,
            investimento: spend,
            impressoes: impressions,
            cliques: clicks,
            alcance: reach,
          }, { onConflict: 'campanha_id,data', ignoreDuplicates: false })
        }

        results.push({ conta: account.nome, campanha: camp.name, spend, impressions, clicks })
      }
    } catch (e) {
      results.push({ conta: account.nome, erro: e.message })
    }
  }

  return new Response(JSON.stringify({
    ok: true,
    sincronizado_em: new Date().toISOString(),
    campanhas: results.length,
    detalhes: results,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
})
