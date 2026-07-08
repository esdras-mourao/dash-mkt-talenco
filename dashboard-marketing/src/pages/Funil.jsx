import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num, pct, MESES } from '../lib/fmt'
import { Card, PageHeader, StatCard, Btn, Modal, Input, Select, DateFilter, ExportBtn, Badge } from '../components/UI'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../lib/AuthContext'

const CANAIS = ['pago','organico','offline','direto']
const ORIGENS = ['meta','google','organico_ig','organico_fb','youtube','indicacao','evento','direto','outro']
const ETAPAS_PIPEDRIVE = ['lead','contato_realizado','qualificado','agendamento','visita','proposta','ganho','perdido']
const ETAPA_LABEL = {
  lead:'Lead', contato_realizado:'Contato Realizado', qualificado:'Qualificado',
  agendamento:'Agendamento', visita:'Visita', proposta:'Proposta', ganho:'Ganho ✓', perdido:'Perdido ✗'
}
const ETAPA_COLOR = {
  lead:'#1A4060', contato_realizado:'#2563eb', qualificado:'#F2B82A',
  agendamento:'#D4956A', visita:'#C6552A', proposta:'#9a8b7d', ganho:'#4a7c59', perdido:'#ef4444'
}

export default function Funil() {
  const { can } = useAuth()
  const [tab, setTab] = useState('funil') // funil | safra | pipedrive
  const [entradas, setEntradas] = useState([])
  const [safra, setSafra] = useState([])
  const [emps, setEmps] = useState([])
  const [modalFunil, setModalFunil] = useState(false)
  const [modalPipedrive, setModalPipedrive] = useState(false)
  const [filtro, setFiltro] = useState({ de:'', ate:'', emp:'', canal:'' })
  const [form, setForm] = useState({
    data:'', empreendimento_id:'', canal:'pago', origem:'meta',
    alcance:0, impressoes:0, cliques:0,
    mqls:0, sqls:0, agendamentos:0, visitas:0,
    propostas:0, vendas:0, vendas_personalizacao:0, investimento:0
  })
  const [formPipedrive, setFormPipedrive] = useState({
    data_snapshot:'', empreendimento_id:'', estagio:'lead',
    quantidade:0, valor_total:0, origem:''
  })

  async function load() {
    const [eR, sR, empsR] = await Promise.all([
      supabase.from('funil_entradas').select('*, empreendimentos(nome,codigo)').order('data',{ascending:false}),
      supabase.from('pipedrive_safra').select('*, empreendimentos(nome)').order('data_snapshot',{ascending:false}),
      supabase.from('empreendimentos').select('*').eq('ativo',true),
    ])
    setEntradas(eR.data||[])
    setSafra(sR.data||[])
    setEmps(empsR.data||[])
  }
  useEffect(()=>{ load() },[])

  async function saveFunil() {
    await supabase.from('funil_entradas').insert({
      data:form.data, empreendimento_id:form.empreendimento_id?Number(form.empreendimento_id):null,
      canal:form.canal, origem:form.origem,
      alcance:Number(form.alcance||0), impressoes:Number(form.impressoes||0),
      cliques:Number(form.cliques||0), mqls:Number(form.mqls||0),
      sqls:Number(form.sqls||0), agendamentos:Number(form.agendamentos||0),
      visitas:Number(form.visitas||0), propostas:Number(form.propostas||0),
      vendas:Number(form.vendas||0), vendas_personalizacao:Number(form.vendas_personalizacao||0),
      investimento:Number(form.investimento||0)
    })
    await load(); setModalFunil(false)
  }

  async function savePipedrive() {
    await supabase.from('pipedrive_safra').insert({
      data_snapshot:formPipedrive.data_snapshot,
      empreendimento_id:formPipedrive.empreendimento_id?Number(formPipedrive.empreendimento_id):null,
      estagio:formPipedrive.estagio,
      quantidade:Number(formPipedrive.quantidade||0),
      valor_total:Number(formPipedrive.valor_total||0),
      origem:formPipedrive.origem||null
    })
    await load(); setModalPipedrive(false)
  }

  // Filter entradas
  const filtered = entradas.filter(e=>
    (!filtro.de || e.data>=filtro.de) &&
    (!filtro.ate || e.data<=filtro.ate) &&
    (!filtro.emp || String(e.empreendimento_id)===filtro.emp) &&
    (!filtro.canal || e.canal===filtro.canal)
  )

  // Aggregate funnel
  const agg = (k) => filtered.reduce((s,r)=>s+Number(r[k]||0),0)
  const totais = {
    alcance: agg('alcance'), impressoes: agg('impressoes'), cliques: agg('cliques'),
    mqls: agg('mqls'), sqls: agg('sqls'), agendamentos: agg('agendamentos'),
    visitas: agg('visitas'), propostas: agg('propostas'),
    vendas: agg('vendas'), up: agg('vendas_personalizacao'),
    investimento: agg('investimento')
  }

  const funilStages = [
    { label:'Alcance',           val:totais.alcance,     color:'#1A4060', icon:'👁' },
    { label:'Impressões',        val:totais.impressoes,  color:'#2563eb', icon:'📺' },
    { label:'Cliques',           val:totais.cliques,     color:'#F2B82A', icon:'👆' },
    { label:'MQLs',              val:totais.mqls,        color:'#D4956A', icon:'🎯' },
    { label:'SQLs',              val:totais.sqls,        color:'#C6552A', icon:'⭐' },
    { label:'Agendamentos',      val:totais.agendamentos,color:'#9a8b7d', icon:'📅' },
    { label:'Visitas',           val:totais.visitas,     color:'#6b5d50', icon:'🏠' },
    { label:'Propostas',         val:totais.propostas,   color:'#4a3d33', icon:'📄' },
    { label:'Vendas',            val:totais.vendas,      color:'#4a7c59', icon:'✅' },
    { label:'Personalização',    val:totais.up,          color:'#22c55e', icon:'🎁' },
  ]
  const maxVal = funilStages[0]?.val || 1

  // Monthly chart
  const meses_uq = [...new Set(filtered.map(e=>e.data?.slice(0,7)))].sort()
  const monthlyChart = meses_uq.map(m=>({
    mes: MESES[Number(m.slice(5,7))-1],
    leads: filtered.filter(e=>e.data?.startsWith(m)).reduce((s,r)=>s+r.mqls,0),
    visitas: filtered.filter(e=>e.data?.startsWith(m)).reduce((s,r)=>s+r.visitas,0),
    vendas: filtered.filter(e=>e.data?.startsWith(m)).reduce((s,r)=>s+r.vendas,0),
    cpl: filtered.filter(e=>e.data?.startsWith(m)).reduce((s,r)=>s+(r.investimento&&r.mqls?r.investimento/r.mqls:0),0),
  }))

  // Pipedrive safra por mês/etapa
  const pipeMeses = [...new Set(safra.map(s=>s.data_snapshot?.slice(0,7)))].sort()
  const pipeChart = pipeMeses.slice(-6).map(m=>({
    mes: MESES[Number(m.slice(5,7))-1]+'/'+m.slice(2,4),
    ...ETAPAS_PIPEDRIVE.reduce((acc,e)=>({
      ...acc,
      [e]: safra.filter(s=>s.data_snapshot?.startsWith(m)&&s.estagio===e).reduce((s,r)=>s+r.quantidade,0)
    }),{})
  }))

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Funil de Marketing & Vendas" sub="Visão completa do pipeline: awareness até personalização">
        <div className="flex gap-2 no-print">
          {can('canAddCampanhas') && <Btn onClick={()=>setModalFunil(true)}>+ Lançar Funil</Btn>}
          {can('canAddCampanhas') && <Btn variant="ghost" onClick={()=>setModalPipedrive(true)}>+ Snapshot Pipedrive</Btn>}
          <ExportBtn/>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b no-print" style={{borderColor:'var(--border)'}}>
        {[{k:'funil',l:'Funil Completo'},{k:'safra',l:'Safra Mensal'},{k:'pipedrive',l:'Pipedrive Safra'}].map(({k,l})=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-all capitalize`}
            style={{color:tab===k?'var(--accent)':'var(--text-faint)',borderColor:tab===k?'var(--accent)':'transparent'}}>
            {l}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap no-print">
        <Select value={filtro.emp} onChange={e=>setFiltro(f=>({...f,emp:e.target.value}))}>
          <option value="">Todos empreendimentos</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
        </Select>
        <Select value={filtro.canal} onChange={e=>setFiltro(f=>({...f,canal:e.target.value}))}>
          <option value="">Todos os canais</option>
          {CANAIS.map(c=><option key={c} value={c}>{c}</option>)}
        </Select>
        <DateFilter from={filtro.de} to={filtro.ate} onFrom={v=>setFiltro(f=>({...f,de:v}))} onTo={v=>setFiltro(f=>({...f,ate:v}))} onClear={()=>setFiltro(f=>({...f,de:'',ate:''}))}/>
      </div>

      {/* FUNIL COMPLETO */}
      {tab==='funil' && (
        <>
          {/* KPIs topo */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <StatCard label="Investimento" value={brl(totais.investimento)} accent="var(--accent)"/>
            <StatCard label="MQLs" value={num(totais.mqls)} sub={totais.cliques>0?`${pct(totais.mqls/totais.cliques)} dos cliques`:''} accent="#D4956A"/>
            <StatCard label="SQLs" value={num(totais.sqls)} sub={totais.mqls>0?`${pct(totais.sqls/totais.mqls)} dos MQLs`:''} accent="#C6552A"/>
            <StatCard label="Vendas" value={num(totais.vendas)} sub={totais.propostas>0?`${pct(totais.vendas/totais.propostas)} das propostas`:''} accent="#4a7c59"/>
            <StatCard label="CPL" value={brl(totais.mqls>0?totais.investimento/totais.mqls:0,2)} sub={`CPA: ${brl(totais.vendas>0?totais.investimento/totais.vendas:0,2)}`} accent="#1A4060"/>
          </div>

          {/* Funil visual */}
          <Card className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-6" style={{color:'var(--text-faint)'}}>
              Pipeline Completo — Awareness → Venda → Personalização
            </div>
            <div className="flex flex-col gap-2.5">
              {funilStages.map(({label,val,color,icon},i)=>{
                const w = maxVal>0 ? Math.max((val/maxVal)*100,val>0?1:0) : 0
                const prev = i>0 ? funilStages[i-1].val : null
                const conv = prev && prev>0 ? ((val/prev)*100).toFixed(1) : null
                return (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-32 text-right text-xs font-semibold flex items-center justify-end gap-1" style={{color:'var(--text-muted)'}}>
                      <span>{icon}</span><span>{label}</span>
                    </div>
                    <div className="flex-1 h-9 rounded-xl overflow-hidden" style={{background:'var(--bg-input)'}}>
                      <div className="h-full rounded-xl flex items-center px-3 transition-all"
                        style={{width:`${w}%`,background:color,minWidth:val>0?'80px':'0'}}>
                        <span className="text-xs font-bold text-white whitespace-nowrap">{num(val)}</span>
                      </div>
                    </div>
                    <div className="w-20 text-xs text-right" style={{color:'var(--text-faint)'}}>
                      {conv ? <span className={Number(conv)>=50?'text-green-400':Number(conv)>=20?'text-yellow-400':'text-red-400'}>{conv}%</span> : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-3 border-t text-xs" style={{borderColor:'var(--border)',color:'var(--text-faint)'}}>
              As % à direita representam a taxa de conversão de cada etapa para a seguinte
            </div>
          </Card>

          {/* Split pago vs orgânico */}
          <div className="grid grid-cols-3 gap-4">
            {['pago','organico','offline'].map(canal=>{
              const rows = filtered.filter(e=>e.canal===canal)
              const leads = rows.reduce((s,r)=>s+r.mqls,0)
              const vendas = rows.reduce((s,r)=>s+r.vendas,0)
              const inv = rows.reduce((s,r)=>s+Number(r.investimento||0),0)
              return (
                <Card key={canal}>
                  <div className="text-xs font-semibold uppercase mb-3 capitalize" style={{color:'var(--text-faint)'}}>{canal}</div>
                  <div className="text-2xl font-bold font-display mb-1" style={{color:'var(--accent)'}}>{num(leads)}</div>
                  <div className="text-xs mb-2" style={{color:'var(--text-faint)'}}>MQLs</div>
                  <div className="flex justify-between text-xs" style={{color:'var(--text-muted)'}}>
                    <span>Vendas: <b>{num(vendas)}</b></span>
                    {inv>0 && <span>CPL: <b>{brl(leads>0?inv/leads:0,2)}</b></span>}
                  </div>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {/* SAFRA MENSAL */}
      {tab==='safra' && (
        <>
          <Card className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Evolução Mensal — MQLs, Visitas e Vendas</div>
            {monthlyChart.length===0
              ? <div className="text-center py-12 text-sm italic" style={{color:'var(--text-faint)'}}>Lance dados de funil para ver a safra</div>
              : <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyChart}>
                    <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="l" tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="r" orientation="right" tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>brl(v,0)}/>
                    <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}/>
                    <Legend wrapperStyle={{fontSize:11,color:'var(--text-faint)'}}/>
                    <Bar yAxisId="l" dataKey="leads" fill="#D4956A" name="MQLs" radius={[3,3,0,0]}/>
                    <Bar yAxisId="l" dataKey="visitas" fill="#C6552A" name="Visitas" radius={[3,3,0,0]}/>
                    <Bar yAxisId="l" dataKey="vendas" fill="#4a7c59" name="Vendas" radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
            }
          </Card>
          <Card>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>CPL ao Longo do Tempo</div>
            {monthlyChart.length===0
              ? <div className="text-center py-8 text-sm italic" style={{color:'var(--text-faint)'}}>Sem dados</div>
              : <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={monthlyChart}>
                    <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>brl(v,0)}/>
                    <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}} formatter={v=>[brl(v,2),'CPL']}/>
                    <Line type="monotone" dataKey="cpl" stroke="#F2B82A" strokeWidth={2} dot={{fill:'#F2B82A',r:3}} name="CPL Médio"/>
                  </LineChart>
                </ResponsiveContainer>
            }
          </Card>
        </>
      )}

      {/* PIPEDRIVE SAFRA */}
      {tab==='pipedrive' && (
        <>
          <Card className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>
              Safra Pipedrive — Negócios por Etapa ao Longo do Tempo
            </div>
            <div className="text-xs mb-3" style={{color:'var(--text-faint)'}}>
              Etapas: Lead → Contato Realizado → Qualificado → Agendamento → Visita → Proposta → Ganho
            </div>
            {pipeChart.length===0
              ? <div className="text-center py-12 text-sm italic" style={{color:'var(--text-faint)'}}>Lance snapshots do Pipedrive para ver a safra</div>
              : <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={pipeChart}>
                    <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}/>
                    <Legend wrapperStyle={{fontSize:10,color:'var(--text-faint)'}}/>
                    {ETAPAS_PIPEDRIVE.filter(e=>e!=='perdido').map(e=>(
                      <Bar key={e} dataKey={e} fill={ETAPA_COLOR[e]} name={ETAPA_LABEL[e]} stackId="a" radius={e==='ganho'?[3,3,0,0]:[0,0,0,0]}/>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
            }
          </Card>

          {/* Snapshot atual */}
          <Card>
            <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Último Snapshot por Etapa</div>
            <div className="grid grid-cols-4 gap-3">
              {ETAPAS_PIPEDRIVE.map(etapa=>{
                const rows = safra.filter(s=>s.estagio===etapa)
                const qtd = rows.reduce((s,r)=>s+r.quantidade,0)
                const val = rows.reduce((s,r)=>s+Number(r.valor_total||0),0)
                return (
                  <div key={etapa} className="p-3 rounded-xl border text-center" style={{background:'var(--bg-input)',borderColor:ETAPA_COLOR[etapa]+'44'}}>
                    <div className="text-xs font-semibold mb-1" style={{color:ETAPA_COLOR[etapa]}}>{ETAPA_LABEL[etapa]}</div>
                    <div className="text-2xl font-bold font-display" style={{color:'var(--text-primary)'}}>{qtd}</div>
                    {val>0 && <div className="text-xs mt-0.5" style={{color:'var(--text-faint)'}}>{brl(val)}</div>}
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}

      {/* Modal Funil */}
      <Modal open={modalFunil} onClose={()=>setModalFunil(false)} title="Lançar Dados do Funil">
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data" type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
            <Select label="Empreendimento" value={form.empreendimento_id} onChange={e=>setForm(f=>({...f,empreendimento_id:e.target.value}))}>
              <option value="">Institucional</option>
              {emps.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Canal" value={form.canal} onChange={e=>setForm(f=>({...f,canal:e.target.value}))}>
              {CANAIS.map(c=><option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Origem" value={form.origem} onChange={e=>setForm(f=>({...f,origem:e.target.value}))}>
              {ORIGENS.map(o=><option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Topo de Funil (Awareness)</div>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Alcance" type="number" value={form.alcance} onChange={e=>setForm(f=>({...f,alcance:e.target.value}))}/>
              <Input label="Impressões" type="number" value={form.impressoes} onChange={e=>setForm(f=>({...f,impressoes:e.target.value}))}/>
              <Input label="Cliques" type="number" value={form.cliques} onChange={e=>setForm(f=>({...f,cliques:e.target.value}))}/>
            </div>
          </div>
          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Leads e Qualificação</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="MQLs (Leads Qualif. Mkt)" type="number" value={form.mqls} onChange={e=>setForm(f=>({...f,mqls:e.target.value}))}/>
              <Input label="SQLs (Leads Qualif. Vendas)" type="number" value={form.sqls} onChange={e=>setForm(f=>({...f,sqls:e.target.value}))}/>
            </div>
          </div>
          <div className="border-t pt-2" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase mb-2" style={{color:'var(--text-faint)'}}>Pipeline de Vendas</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Agendamentos" type="number" value={form.agendamentos} onChange={e=>setForm(f=>({...f,agendamentos:e.target.value}))}/>
              <Input label="Visitas Presenciais" type="number" value={form.visitas} onChange={e=>setForm(f=>({...f,visitas:e.target.value}))}/>
              <Input label="Propostas" type="number" value={form.propostas} onChange={e=>setForm(f=>({...f,propostas:e.target.value}))}/>
              <Input label="Vendas" type="number" value={form.vendas} onChange={e=>setForm(f=>({...f,vendas:e.target.value}))}/>
              <Input label="Personalização (Up-sell)" type="number" value={form.vendas_personalizacao} onChange={e=>setForm(f=>({...f,vendas_personalizacao:e.target.value}))}/>
              <Input label="Investimento (R$)" type="number" value={form.investimento} onChange={e=>setForm(f=>({...f,investimento:e.target.value}))}/>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModalFunil(false)}>Cancelar</Btn>
            <Btn onClick={saveFunil}>Salvar</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Pipedrive Snapshot */}
      <Modal open={modalPipedrive} onClose={()=>setModalPipedrive(false)} title="Snapshot Pipedrive">
        <div className="text-xs mb-3" style={{color:'var(--text-faint)'}}>
          Lance os números atuais de cada etapa do Pipedrive para construir a safra ao longo do tempo.
        </div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data do Snapshot" type="date" value={formPipedrive.data_snapshot} onChange={e=>setFormPipedrive(f=>({...f,data_snapshot:e.target.value}))}/>
            <Select label="Empreendimento" value={formPipedrive.empreendimento_id} onChange={e=>setFormPipedrive(f=>({...f,empreendimento_id:e.target.value}))}>
              <option value="">Todos</option>
              {emps.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Etapa" value={formPipedrive.estagio} onChange={e=>setFormPipedrive(f=>({...f,estagio:e.target.value}))}>
              {ETAPAS_PIPEDRIVE.map(e=><option key={e} value={e}>{ETAPA_LABEL[e]}</option>)}
            </Select>
            <Select label="Origem" value={formPipedrive.origem} onChange={e=>setFormPipedrive(f=>({...f,origem:e.target.value}))}>
              <option value="">Todas</option>
              {ORIGENS.map(o=><option key={o} value={o}>{o}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quantidade de Negócios" type="number" value={formPipedrive.quantidade} onChange={e=>setFormPipedrive(f=>({...f,quantidade:e.target.value}))}/>
            <Input label="Valor Total (R$)" type="number" value={formPipedrive.valor_total} onChange={e=>setFormPipedrive(f=>({...f,valor_total:e.target.value}))}/>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModalPipedrive(false)}>Cancelar</Btn>
            <Btn onClick={savePipedrive}>Salvar Snapshot</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
