import { useEffect, useState } from 'react'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../lib/supabase'
import { num, brl, MESES } from '../lib/fmt'
import { Card, PageHeader, StatCard, Btn, Modal, Input, Select, DateFilter, ExportBtn, RefreshBtn } from '../components/UI'
import { syncMetaAds } from '../lib/sync'

export default function Audiencia() {
  const ano = new Date().getFullYear()
  const [dados, setDados] = useState([])
  const [kpis, setKpis] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [modal, setModal] = useState(false)
  const [filtroDE, setFiltroDE] = useState('')
  const [filtroATE, setFiltroATE] = useState('')
  const [form, setForm] = useState({
    data:'', canal:'misto',
    seguidores_instagram:0, seguidores_facebook:0, inscritos_youtube:0,
    sessoes_site:0, sessoes_perfil_ig:0,
    alcance_organico:0, alcance_nao_seguidores:0,
    alcance_pago_meta:0, alcance_pago_google:0,
    impressoes_organicas:0, impressoes_pagas:0,
    cliques_total:0, salvamentos:0, buscas_marca:0,
    cpl_medio:0, cpa_medio:0, evento_publico:0, evento_nome:'',
  })

  async function load() {
    setLoading(true)
    // Audiência manual
    const { data: audData } = await supabase.from('audiencia').select('*').eq('ano', ano).order('mes')
    // KPIs das campanhas Meta (alcance e impressões pagos)
    let kpisQ = supabase.from('kpis_campanha').select('data, investimento, impressoes, alcance, cliques, leads, campanha_id, campanhas(nome,empreendimento_id)')
    if (filtroDE) kpisQ = kpisQ.gte('data', filtroDE)
    if (filtroATE) kpisQ = kpisQ.lte('data', filtroATE)
    const { data: kpisData } = await kpisQ
    setDados(audData||[])
    setKpis(kpisData||[])
    setLoading(false)
  }

  // Auto-sync Meta no carregamento
  useEffect(()=>{
    async function init() {
      setSyncing(true)
      try { await syncMetaAds() } catch(e) {}
      setSyncing(false)
      load()
    }
    init()
  },[])

  useEffect(()=>{ if(!loading) load() },[filtroDE, filtroATE])

  async function handleSync() {
    setSyncing(true); setSyncMsg('')
    try {
      const r = await syncMetaAds()
      setSyncMsg(r.ok ? `✓ ${r.campanhas} campanhas sincronizadas` : '✗ '+r.erro)
      load()
    } catch(e) { setSyncMsg('✗ '+e.message) }
    setSyncing(false)
    setTimeout(()=>setSyncMsg(''),6000)
  }

  async function save() {
    await supabase.from('audiencia').insert({
      data:form.data, canal:form.canal,
      seguidores_instagram:Number(form.seguidores_instagram||0),
      seguidores_facebook:Number(form.seguidores_facebook||0),
      inscritos_youtube:Number(form.inscritos_youtube||0),
      sessoes_site:Number(form.sessoes_site||0),
      sessoes_perfil_ig:Number(form.sessoes_perfil_ig||0),
      alcance_organico:Number(form.alcance_organico||0),
      alcance_nao_seguidores:Number(form.alcance_nao_seguidores||0),
      alcance_pago_meta:Number(form.alcance_pago_meta||0),
      alcance_pago_google:Number(form.alcance_pago_google||0),
      impressoes_organicas:Number(form.impressoes_organicas||0),
      impressoes_pagas:Number(form.impressoes_pagas||0),
      cliques_total:Number(form.cliques_total||0),
      salvamentos:Number(form.salvamentos||0),
      buscas_marca:Number(form.buscas_marca||0),
      cpl_medio:Number(form.cpl_medio||0),
      cpa_medio:Number(form.cpa_medio||0),
      evento_publico:Number(form.evento_publico||0),
      evento_nome:form.evento_nome||null,
    })
    await load(); setModal(false)
  }

  // Dados Meta (pago) direto dos KPIs
  const metaPorMes = Array.from({length:12},(_,i)=>{
    const m = i+1
    const rows = kpis.filter(k=>new Date(k.data).getMonth()===i && new Date(k.data).getFullYear()===ano)
    return {
      mes: MESES[i],
      alcance_pago: rows.reduce((s,r)=>s+Number(r.alcance||0),0),
      impressoes_pagas: rows.reduce((s,r)=>s+Number(r.impressoes||0),0),
      cliques: rows.reduce((s,r)=>s+Number(r.cliques||0),0),
      leads: rows.reduce((s,r)=>s+Number(r.leads||0),0),
      investimento: rows.reduce((s,r)=>s+Number(r.investimento||0),0),
    }
  })

  // Dados orgânicos (manual)
  const orgPorMes = Array.from({length:12},(_,i)=>{
    const m = i+1
    const rows = dados.filter(r=>r.mes===m)
    return {
      mes: MESES[i],
      seguidores: rows.reduce((s,r)=>s+Number(r.seguidores_instagram||0),0),
      sessoes_site: rows.reduce((s,r)=>s+Number(r.sessoes_site||0),0),
      sessoes_ig: rows.reduce((s,r)=>s+Number(r.sessoes_perfil_ig||0),0),
      salvamentos: rows.reduce((s,r)=>s+Number(r.salvamentos||0),0),
      buscas_marca: rows.reduce((s,r)=>s+Number(r.buscas_marca||0),0),
      alcance_nao_seg: rows.reduce((s,r)=>s+Number(r.alcance_nao_seguidores||0),0),
      cpl: rows.length ? rows.reduce((s,r)=>s+Number(r.cpl_medio||0),0)/rows.length : 0,
    }
  })

  // Funil branding combinado
  const totalAlcancePago = metaPorMes.reduce((s,r)=>s+r.alcance_pago,0)
  const totalImpressoes  = metaPorMes.reduce((s,r)=>s+r.impressoes_pagas,0)
  const totalCliques     = metaPorMes.reduce((s,r)=>s+r.cliques,0)
  const totalLeads       = metaPorMes.reduce((s,r)=>s+r.leads,0)
  const ultimoSeg = dados.length ? Number(dados[dados.length-1].seguidores_instagram||0) : 0
  const ultimoSalv = dados.length ? Number(dados[dados.length-1].salvamentos||0) : 0
  const ultimoBusca = dados.length ? Number(dados[dados.length-1].buscas_marca||0) : 0

  const funilBranding = [
    { label:'Alcance Pago',  val:totalAlcancePago, color:'#1A4060', icon:'💰' },
    { label:'Impressões',    val:totalImpressoes,  color:'#2563eb', icon:'📺' },
    { label:'Cliques',       val:totalCliques,     color:'#F2B82A', icon:'👆' },
    { label:'Leads Meta',    val:totalLeads,       color:'#C6552A', icon:'🎯' },
    { label:'Seguidores IG', val:ultimoSeg,        color:'#D4956A', icon:'👥' },
  ]
  const maxFunil = Math.max(...funilBranding.map(f=>f.val), 1)

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Audiência & Branding" sub="Dados em tempo real do Meta Ads + lançamentos orgânicos">
        <div className="flex gap-2 items-center flex-wrap no-print">
          <DateFilter from={filtroDE} to={filtroATE} onFrom={setFiltroDE} onTo={setFiltroATE} onClear={()=>{setFiltroDE('');setFiltroATE('')}}/>
          <Btn onClick={()=>setModal(true)}>+ Lançar Orgânico</Btn>
          <RefreshBtn onRefresh={handleSync} loading={syncing} label="Sync Meta"/>
          <ExportBtn/>
        </div>
      </PageHeader>

      {syncMsg && <div className="mb-3 text-xs px-3 py-2 rounded-lg no-print" style={{background:'var(--bg-input)',color:syncMsg.startsWith('✓')?'#4ade80':'#f87171'}}>{syncMsg}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm" style={{color:'var(--text-faint)'}}>
          {syncing ? 'Sincronizando Meta Ads...' : 'Carregando...'}
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Alcance Pago (Meta)" value={num(totalAlcancePago)} sub={`${ano} acumulado`} accent="#1A4060"/>
            <StatCard label="Leads Gerados (Meta)" value={num(totalLeads)} sub={`CPL ${brl(totalLeads>0?metaPorMes.reduce((s,r)=>s+r.investimento,0)/totalLeads:0,2)}`} accent="#C6552A"/>
            <StatCard label="Seguidores Instagram" value={num(ultimoSeg)} sub="último lançamento" accent="#D4956A"/>
            <StatCard label="Salvamentos" value={num(ultimoSalv)} sub="intenção de lembrança" accent="#F2B82A"/>
          </div>

          {/* Funil Branding */}
          <Card className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{color:'var(--text-faint)'}}>
              Funil de Branding & Awareness — {ano} (dados Meta Ads em tempo real)
            </div>
            <div className="flex flex-col gap-2.5">
              {funilBranding.map(({label,val,color,icon},i)=>{
                const w = Math.max((val/maxFunil)*100, val>0?1:0)
                const prev = i>0 ? funilBranding[i-1].val : null
                const conv = prev&&prev>0 ? ((val/prev)*100).toFixed(1) : null
                return (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-36 text-right text-xs font-semibold flex items-center justify-end gap-1.5" style={{color:'var(--text-muted)'}}>
                      <span>{icon}</span><span>{label}</span>
                    </div>
                    <div className="flex-1 h-8 rounded-xl overflow-hidden" style={{background:'var(--bg-input)'}}>
                      <div className="h-full rounded-xl flex items-center px-3 transition-all"
                        style={{width:`${w}%`,background:color,minWidth:val>0?'60px':'0'}}>
                        <span className="text-xs font-bold text-white whitespace-nowrap">{num(val)}</span>
                      </div>
                    </div>
                    <div className="w-16 text-xs text-right" style={{color:'var(--text-faint)'}}>
                      {conv ? <span className={Number(conv)>=50?'text-green-400':Number(conv)>=20?'text-yellow-400':'text-red-400'}>{conv}%</span> : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Alcance e Impressões — Meta Ads</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={metaPorMes}>
                  <defs>
                    <linearGradient id="gAlc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1A4060" stopOpacity={0.4}/><stop offset="95%" stopColor="#1A4060" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F2B82A" stopOpacity={0.4}/><stop offset="95%" stopColor="#F2B82A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>num(v)}/>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}} formatter={num}/>
                  <Legend wrapperStyle={{fontSize:11,color:'var(--text-faint)'}}/>
                  <Area type="monotone" dataKey="alcance_pago" stroke="#1A4060" fill="url(#gAlc)" strokeWidth={2} name="Alcance"/>
                  <Area type="monotone" dataKey="impressoes_pagas" stroke="#F2B82A" fill="url(#gImp)" strokeWidth={2} name="Impressões"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Indicadores de Força de Marca (orgânico)</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={orgPorMes}>
                  <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>num(v)}/>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}} formatter={num}/>
                  <Legend wrapperStyle={{fontSize:11,color:'var(--text-faint)'}}/>
                  <Line type="monotone" dataKey="buscas_marca" stroke="#1A4060" strokeWidth={2} dot={{fill:'#1A4060',r:3}} name="Buscas Marca"/>
                  <Line type="monotone" dataKey="alcance_nao_seg" stroke="#F2B82A" strokeWidth={2} dot={{fill:'#F2B82A',r:3}} name="Alcance Não-Seg."/>
                  <Line type="monotone" dataKey="salvamentos" stroke="#C6552A" strokeWidth={2} dot={{fill:'#C6552A',r:3}} name="Salvamentos"/>
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Leads e Investimento Meta — Mensal</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={metaPorMes}>
                <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="l" tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="r" orientation="right" tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>brl(v,0)}/>
                <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}/>
                <Legend wrapperStyle={{fontSize:11,color:'var(--text-faint)'}}/>
                <Bar yAxisId="l" dataKey="leads" fill="#C6552A" name="Leads" radius={[3,3,0,0]}/>
                <Bar yAxisId="r" dataKey="investimento" fill="#F2B82A" name="Investimento (R$)" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {/* Modal lançar orgânico */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Lançar Dados Orgânicos">
        <div className="flex flex-col gap-3 max-h-[65vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
            <Select label="Canal" value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))}>
              {['misto','organico','offline'].map(c=><option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Seguidores</div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Instagram" type="number" value={form.seguidores_instagram} onChange={e=>setForm(f=>({...f,seguidores_instagram:e.target.value}))}/>
              <Input label="Facebook" type="number" value={form.seguidores_facebook} onChange={e=>setForm(f=>({...f,seguidores_facebook:e.target.value}))}/>
              <Input label="YouTube" type="number" value={form.inscritos_youtube} onChange={e=>setForm(f=>({...f,inscritos_youtube:e.target.value}))}/>
            </div>
          </div>
          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Força de Marca</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Buscas de Marca (Google)" type="number" value={form.buscas_marca} onChange={e=>setForm(f=>({...f,buscas_marca:e.target.value}))}/>
              <Input label="Alcance Não-Seguidores" type="number" value={form.alcance_nao_seguidores} onChange={e=>setForm(f=>({...f,alcance_nao_seguidores:e.target.value}))}/>
              <Input label="Salvamentos" type="number" value={form.salvamentos} onChange={e=>setForm(f=>({...f,salvamentos:e.target.value}))}/>
              <Input label="Sessões Perfil IG" type="number" value={form.sessoes_perfil_ig} onChange={e=>setForm(f=>({...f,sessoes_perfil_ig:e.target.value}))}/>
              <Input label="Sessões Site" type="number" value={form.sessoes_site} onChange={e=>setForm(f=>({...f,sessoes_site:e.target.value}))}/>
              <Input label="Público Offline" type="number" value={form.evento_publico} onChange={e=>setForm(f=>({...f,evento_publico:e.target.value}))}/>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}>Salvar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
