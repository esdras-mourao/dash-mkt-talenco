import { useEffect, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../lib/supabase'
import { num, brl, MESES } from '../lib/fmt'
import { Card, PageHeader, StatCard, Btn, Modal, Input, Select, DateFilter, ExportBtn, Badge } from '../components/UI'

const CANAIS = ['misto','organico','pago','offline']
const ORIGENS = ['instagram','facebook','youtube','site','google','tiktok','evento','indicacao']

export default function Audiencia() {
  const [dados, setDados] = useState([])
  const [ano, setAno] = useState(new Date().getFullYear())
  const [modal, setModal] = useState(false)
  const [filtroDE, setFiltroDE] = useState('')
  const [filtroATE, setFiltroATE] = useState('')
  const [ultimos, setUltimos] = useState({})
  const [form, setForm] = useState({
    data:'', canal:'misto',
    seguidores_instagram:0, seguidores_facebook:0, inscritos_youtube:0,
    visitas_site:0, sessoes_site:0, sessoes_perfil_ig:0,
    alcance_organico:0, alcance_pago:0, alcance_nao_seguidores:0,
    impressoes_organicas:0, impressoes_pagas:0,
    cliques_total:0, salvamentos:0, buscas_marca:0,
    cpl_medio:0, cpa_medio:0,
    alcance_pago_meta:0, alcance_pago_google:0,
    evento_nome:'', evento_publico:0,
  })

  async function load() {
    const { data } = await supabase.from('audiencia').select('*').eq('ano', ano).order('mes')
    const rows = data || []
    setDados(rows)
    if (rows.length) setUltimos(rows[rows.length - 1])
  }
  useEffect(() => { load() }, [ano])

  async function save() {
    const p = {
      data: form.data,
      canal: form.canal,
      seguidores_instagram: Number(form.seguidores_instagram||0),
      seguidores_facebook: Number(form.seguidores_facebook||0),
      inscritos_youtube: Number(form.inscritos_youtube||0),
      visitas_site: Number(form.visitas_site||0),
      sessoes_site: Number(form.sessoes_site||0),
      sessoes_perfil_ig: Number(form.sessoes_perfil_ig||0),
      alcance_organico: Number(form.alcance_organico||0),
      alcance_pago_meta: Number(form.alcance_pago_meta||0),
      alcance_pago_google: Number(form.alcance_pago_google||0),
      alcance_nao_seguidores: Number(form.alcance_nao_seguidores||0),
      impressoes_organicas: Number(form.impressoes_organicas||0),
      impressoes_pagas: Number(form.impressoes_pagas||0),
      cliques_total: Number(form.cliques_total||0),
      salvamentos: Number(form.salvamentos||0),
      buscas_marca: Number(form.buscas_marca||0),
      cpl_medio: Number(form.cpl_medio||0),
      cpa_medio: Number(form.cpa_medio||0),
      evento_nome: form.evento_nome||null,
      evento_publico: Number(form.evento_publico||0),
    }
    await supabase.from('audiencia').insert(p)
    await load(); setModal(false)
  }

  // Build monthly chart data
  const chartData = Array.from({length:12},(_,i)=>{
    const m = i+1
    const rows = dados.filter(r=>r.mes===m)
    const sum = (k) => rows.reduce((s,r)=>s+Number(r[k]||0),0)
    return {
      mes: MESES[i],
      alcance_total: sum('alcance_organico')+(sum('alcance_pago_meta')||0)+(sum('alcance_pago_google')||0),
      impressoes_total: sum('impressoes_organicas')+sum('impressoes_pagas'),
      cliques: sum('cliques_total'),
      sessoes_site: sum('sessoes_site'),
      sessoes_ig: sum('sessoes_perfil_ig'),
      seguidores: sum('seguidores_instagram'),
      salvamentos: sum('salvamentos'),
      buscas_marca: sum('buscas_marca'),
      alcance_nao_seg: sum('alcance_nao_seguidores'),
      cpl: rows.length ? rows.reduce((s,r)=>s+Number(r.cpl_medio||0),0)/rows.length : 0,
      cpa: rows.length ? rows.reduce((s,r)=>s+Number(r.cpa_medio||0),0)/rows.length : 0,
    }
  })

  const filtrados = dados.filter(r=>
    (!filtroDE || r.data>=filtroDE) && (!filtroATE || r.data<=filtroATE)
  )

  // Funil numbers (latest or period sum)
  const funilData = [
    { label:'Alcance Total', val: chartData.reduce((s,r)=>s+r.alcance_total,0), color:'#1A4060' },
    { label:'Impressões',    val: chartData.reduce((s,r)=>s+r.impressoes_total,0), color:'#2563eb' },
    { label:'Cliques',       val: chartData.reduce((s,r)=>s+r.cliques,0), color:'#F2B82A' },
    { label:'Sessões Site',  val: chartData.reduce((s,r)=>s+r.sessoes_site,0), color:'#D4956A' },
    { label:'Sessões Perfil IG', val: chartData.reduce((s,r)=>s+r.sessoes_ig,0), color:'#C6552A' },
    { label:'Seguidores',    val: Number(ultimos.seguidores_instagram||0), color:'#4a7c59' },
  ]
  const maxFunil = funilData[0]?.val || 1

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Audiência & Branding" sub="Funil de awareness, alcance e impacto de marca">
        <div className="flex gap-2 items-center flex-wrap no-print">
          <DateFilter from={filtroDE} to={filtroATE} onFrom={setFiltroDE} onTo={setFiltroATE} onClear={()=>{setFiltroDE('');setFiltroATE('')}}/>
          <Select value={ano} onChange={e=>setAno(Number(e.target.value))}>
            {[2024,2025,2026].map(a=><option key={a} value={a}>{a}</option>)}
          </Select>
          <Btn onClick={()=>setModal(true)}>+ Lançar Mês</Btn>
          <ExportBtn/>
        </div>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Seguidores Instagram" value={num(ultimos.seguidores_instagram||0)} sub="atual" accent="#C6552A"/>
        <StatCard label="Alcance Não-Seguidores" value={num(ultimos.alcance_nao_seguidores||0)} sub="último mês" accent="#F2B82A"/>
        <StatCard label="Buscas de Marca" value={num(ultimos.buscas_marca||0)} sub="Google Search" accent="#1A4060"/>
        <StatCard label="Salvamentos" value={num(ultimos.salvamentos||0)} sub="intenção de lembrança" accent="#D4956A"/>
      </div>

      {/* FUNIL DE BRANDING */}
      <Card className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{color:'var(--text-faint)'}}>
          Funil de Branding & Awareness — {ano}
        </div>
        <div className="flex flex-col gap-2">
          {funilData.map(({label,val,color},i)=>{
            const w = maxFunil>0 ? Math.max((val/maxFunil)*100,val>0?1:0) : 0
            const pct = i>0 && funilData[i-1].val>0 ? ((val/funilData[i-1].val)*100).toFixed(1) : null
            return (
              <div key={label} className="flex items-center gap-4">
                <div className="w-36 text-right text-xs font-semibold" style={{color:'var(--text-muted)'}}>{label}</div>
                <div className="flex-1 h-8 rounded-lg overflow-hidden" style={{background:'var(--bg-input)'}}>
                  <div className="h-full rounded-lg flex items-center px-3 transition-all"
                    style={{width:`${w}%`,background:color,minWidth:val>0?'80px':'0'}}>
                    <span className="text-xs font-bold text-white whitespace-nowrap">{num(val)}</span>
                  </div>
                </div>
                {pct && <div className="text-xs w-14 text-right" style={{color:'var(--text-faint)'}}>→ {pct}%</div>}
              </div>
            )
          })}
        </div>
        <div className="flex gap-6 mt-4 pt-3 border-t flex-wrap text-xs" style={{borderColor:'var(--border)',color:'var(--text-faint)'}}>
          <span>📱 Orgânico</span>
          <span>💰 Pago</span>
          <span>As taxas de conversão entre etapas são exibidas à direita de cada barra</span>
        </div>
      </Card>

      {/* 3 GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Alcance + Impressões */}
        <Card>
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Alcance e Impressões Mensais</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
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
              <Area type="monotone" dataKey="alcance_total" stroke="#1A4060" fill="url(#gAlc)" strokeWidth={2} name="Alcance"/>
              <Area type="monotone" dataKey="impressoes_total" stroke="#F2B82A" fill="url(#gImp)" strokeWidth={2} name="Impressões"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Brand Awareness: Buscas Marca + Alcance Não-Seg + Salvamentos */}
        <Card>
          <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Indicadores de Força de Marca</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>num(v)}/>
              <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}} formatter={num}/>
              <Legend wrapperStyle={{fontSize:11,color:'var(--text-faint)'}}/>
              <Line type="monotone" dataKey="buscas_marca" stroke="#1A4060" strokeWidth={2} dot={{fill:'#1A4060',r:3}} name="Buscas de Marca"/>
              <Line type="monotone" dataKey="alcance_nao_seg" stroke="#F2B82A" strokeWidth={2} dot={{fill:'#F2B82A',r:3}} name="Alcance Não-Seg."/>
              <Line type="monotone" dataKey="salvamentos" stroke="#C6552A" strokeWidth={2} dot={{fill:'#C6552A',r:3}} name="Salvamentos"/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* CPL vs CPA vs Awareness ao longo do tempo */}
      <Card className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>
          Awareness × Custo — CPL e CPA vs. Crescimento de Marca
        </div>
        <div className="text-xs mb-3" style={{color:'var(--text-faint)'}}>
          Hipótese: à medida que o awareness cresce (↑ buscas de marca, ↑ alcance), o CPL e CPA tendem a cair.
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis yAxisId="l" tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>brl(v,0)}/>
            <YAxis yAxisId="r" orientation="right" tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>num(v)}/>
            <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}/>
            <Legend wrapperStyle={{fontSize:11,color:'var(--text-faint)'}}/>
            <Line yAxisId="l" type="monotone" dataKey="cpl" stroke="#C6552A" strokeWidth={2} dot={{fill:'#C6552A',r:3}} name="CPL Médio (R$)"/>
            <Line yAxisId="l" type="monotone" dataKey="cpa" stroke="#D4956A" strokeWidth={2} dot={{fill:'#D4956A',r:3}} name="CPA Médio (R$)"/>
            <Line yAxisId="r" type="monotone" dataKey="buscas_marca" stroke="#1A4060" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Buscas de Marca"/>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Sessões Site + Perfil IG */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Visitas ao Site (ano)" value={num(chartData.reduce((s,r)=>s+r.sessoes_site,0))} accent="#4a7c59" sub="sessões acumuladas"/>
        <StatCard label="Sessões Perfil Instagram" value={num(chartData.reduce((s,r)=>s+r.sessoes_ig,0))} accent="#C6552A" sub="visitas ao perfil"/>
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title="Lançar Dados de Audiência">
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
            <Select label="Canal" value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))}>
              {CANAIS.map(c=><option key={c} value={c}>{c}</option>)}
            </Select>
          </div>

          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Seguidores / Base</div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Seguidores Instagram" type="number" value={form.seguidores_instagram} onChange={e=>setForm(f=>({...f,seguidores_instagram:e.target.value}))}/>
              <Input label="Seguidores Facebook" type="number" value={form.seguidores_facebook} onChange={e=>setForm(f=>({...f,seguidores_facebook:e.target.value}))}/>
              <Input label="Inscritos YouTube" type="number" value={form.inscritos_youtube} onChange={e=>setForm(f=>({...f,inscritos_youtube:e.target.value}))}/>
            </div>
          </div>

          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Alcance e Impressões</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Alcance Orgânico" type="number" value={form.alcance_organico} onChange={e=>setForm(f=>({...f,alcance_organico:e.target.value}))}/>
              <Input label="Alcance Não-Seguidores" type="number" value={form.alcance_nao_seguidores} onChange={e=>setForm(f=>({...f,alcance_nao_seguidores:e.target.value}))}/>
              <Input label="Alcance Pago Meta" type="number" value={form.alcance_pago_meta} onChange={e=>setForm(f=>({...f,alcance_pago_meta:e.target.value}))}/>
              <Input label="Alcance Pago Google" type="number" value={form.alcance_pago_google} onChange={e=>setForm(f=>({...f,alcance_pago_google:e.target.value}))}/>
              <Input label="Impressões Orgânicas" type="number" value={form.impressoes_organicas} onChange={e=>setForm(f=>({...f,impressoes_organicas:e.target.value}))}/>
              <Input label="Impressões Pagas" type="number" value={form.impressoes_pagas} onChange={e=>setForm(f=>({...f,impressoes_pagas:e.target.value}))}/>
            </div>
          </div>

          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Engajamento & Conversão</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Cliques Total" type="number" value={form.cliques_total} onChange={e=>setForm(f=>({...f,cliques_total:e.target.value}))}/>
              <Input label="Sessões no Site" type="number" value={form.sessoes_site} onChange={e=>setForm(f=>({...f,sessoes_site:e.target.value}))}/>
              <Input label="Sessões Perfil Instagram" type="number" value={form.sessoes_perfil_ig} onChange={e=>setForm(f=>({...f,sessoes_perfil_ig:e.target.value}))}/>
              <Input label="Salvamentos" type="number" value={form.salvamentos} onChange={e=>setForm(f=>({...f,salvamentos:e.target.value}))}/>
            </div>
          </div>

          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Força de Marca</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Buscas de Marca (Google)" type="number" value={form.buscas_marca} onChange={e=>setForm(f=>({...f,buscas_marca:e.target.value}))}/>
              <Input label="Visitas ao Site" type="number" value={form.visitas_site} onChange={e=>setForm(f=>({...f,visitas_site:e.target.value}))}/>
            </div>
          </div>

          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Custos Médios</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="CPL Médio (R$)" type="number" value={form.cpl_medio} onChange={e=>setForm(f=>({...f,cpl_medio:e.target.value}))}/>
              <Input label="CPA Médio (R$)" type="number" value={form.cpa_medio} onChange={e=>setForm(f=>({...f,cpa_medio:e.target.value}))}/>
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
