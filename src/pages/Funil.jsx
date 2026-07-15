import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num, pct, MESES } from '../lib/fmt'
import { Card, PageHeader, StatCard, Btn, Modal, Input, Select, DateFilter, ExportBtn, RefreshBtn } from '../components/UI'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../lib/AuthContext'
import { syncPipedrive } from '../lib/sync'

const ETAPAS_PIPEDRIVE = ['prospects','lead','contato_realizado','qualificado','agendamento','visita_agendada','visita_realizada','visita','proposta','ganho','perdido']
const ETAPA_LABEL = {
  prospects:'Prospects', lead:'Lead', contato_realizado:'Contato Realizado',
  qualificado:'Qualificado', agendamento:'Agendamento', visita_agendada:'Visita Agendada',
  visita_realizada:'Visita Realizada', visita:'Visita', proposta:'Proposta',
  ganho:'Ganho ✓', perdido:'Perdido ✗'
}
const ETAPA_COLOR = {
  prospects:'#2563eb', lead:'#1A4060', contato_realizado:'#3b82f6',
  qualificado:'#F2B82A', agendamento:'#D4956A', visita_agendada:'#f97316',
  visita_realizada:'#ea580c', visita:'#C6552A', proposta:'#9a8b7d',
  ganho:'#4a7c59', perdido:'#ef4444'
}

export default function Funil() {
  const { can } = useAuth()
  const [safra, setSafra] = useState([])
  const [emps, setEmps] = useState([])
  const [filtro, setFiltro] = useState({ de:'', ate:'', emp:'' })
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [sR, empsR] = await Promise.all([
      supabase.from('pipedrive_safra').select('*, empreendimentos(nome)').order('data_snapshot',{ascending:false}),
      supabase.from('empreendimentos').select('*').eq('ativo',true),
    ])
    setSafra(sR.data||[])
    setEmps(empsR.data||[])
    setLoading(false)
  }

  // Auto-sync no carregamento
  useEffect(()=>{
    async function init() {
      setSyncing(true)
      try { await syncPipedrive() } catch(e) {}
      setSyncing(false)
      load()
    }
    init()
  },[])

  async function handleSync() {
    setSyncing(true); setSyncMsg('')
    try {
      const r = await syncPipedrive()
      setSyncMsg(r.ok ? `✓ ${r.estagios?.length||0} etapas sincronizadas` : '✗ '+r.erro)
      load()
    } catch(e) { setSyncMsg('✗ '+e.message) }
    setSyncing(false)
    setTimeout(()=>setSyncMsg(''),6000)
  }

  // Filtrar safra
  const filtrados = safra.filter(s=>
    (!filtro.de || s.data_snapshot>=filtro.de) &&
    (!filtro.ate || s.data_snapshot<=filtro.ate) &&
    (!filtro.emp || String(s.empreendimento_id)===filtro.emp)
  )

  // Último snapshot por etapa (mais recente)
  const ultimoSnap = ETAPAS_PIPEDRIVE.reduce((acc, etapa)=>{
    const rows = filtrados.filter(s=>s.estagio===etapa)
    if (!rows.length) return acc
    const ultimo = rows.sort((a,b)=>b.data_snapshot.localeCompare(a.data_snapshot))[0]
    acc[etapa] = ultimo
    return acc
  }, {})

  // Funil visual baseado no último snapshot
  const funilStages = [
    { key:'prospects',        label:'Prospects',        icon:'👁' },
    { key:'lead',             label:'Lead',             icon:'🎯' },
    { key:'contato_realizado',label:'Contato Realizado',icon:'📞' },
    { key:'qualificado',      label:'Qualificado',      icon:'⭐' },
    { key:'agendamento',      label:'Agendamento',      icon:'📅' },
    { key:'visita_agendada',  label:'Visita Agendada',  icon:'🗓' },
    { key:'visita_realizada', label:'Visita Realizada', icon:'🏠' },
    { key:'proposta',         label:'Proposta',         icon:'📄' },
    { key:'ganho',            label:'Ganho',            icon:'✅' },
  ].map(s=>({ ...s, val: ultimoSnap[s.key]?.quantidade||0, color: ETAPA_COLOR[s.key] }))

  const maxVal = Math.max(...funilStages.map(s=>s.val), 1)

  // Histórico mensal (últimos 6 meses)
  const snapsMeses = [...new Set(filtrados.map(s=>s.data_snapshot?.slice(0,7)))].sort().slice(-6)
  const pipeChart = snapsMeses.map(m=>({
    mes: MESES[Number(m.slice(5,7))-1]+'/'+m.slice(2,4),
    ...ETAPAS_PIPEDRIVE.reduce((acc,e)=>({
      ...acc,
      [e]: filtrados.filter(s=>s.data_snapshot?.startsWith(m)&&s.estagio===e)
                    .reduce((s,r)=>s+r.quantidade,0)
    }),{})
  }))

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Funil de Marketing & Vendas" sub="Pipeline Pipedrive em tempo real">
        <div className="flex gap-2 no-print">
          <RefreshBtn onRefresh={handleSync} loading={syncing} label="Sync Pipedrive"/>
          <ExportBtn/>
        </div>
      </PageHeader>

      {syncMsg && (
        <div className="mb-3 text-xs px-3 py-2 rounded-lg no-print" style={{background:'var(--bg-input)',color:syncMsg.startsWith('✓')?'#4ade80':'#f87171'}}>
          {syncMsg}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap no-print">
        <Select value={filtro.emp} onChange={e=>setFiltro(f=>({...f,emp:e.target.value}))}>
          <option value="">Todos empreendimentos</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
        </Select>
        <DateFilter from={filtro.de} to={filtro.ate} onFrom={v=>setFiltro(f=>({...f,de:v}))} onTo={v=>setFiltro(f=>({...f,ate:v}))} onClear={()=>setFiltro(f=>({...f,de:'',ate:''}))}/>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm" style={{color:'var(--text-faint)'}}>
          {syncing ? 'Sincronizando Pipedrive...' : 'Carregando...'}
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {[
              { label:'Leads',         key:'lead',      accent:'#1A4060' },
              { label:'Qualificados',  key:'qualificado',accent:'#F2B82A' },
              { label:'Visitas',       key:'visita_realizada', accent:'#C6552A' },
              { label:'Propostas',     key:'proposta',  accent:'#D4956A' },
              { label:'Ganhos',        key:'ganho',     accent:'#4a7c59' },
            ].map(({label,key,accent})=>(
              <StatCard key={key} label={label} value={num(ultimoSnap[key]?.quantidade||0)} accent={accent}
                sub={ultimoSnap[key]?.valor_total>0?brl(ultimoSnap[key].valor_total):''}/>
            ))}
          </div>

          {/* Funil visual */}
          <Card className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-widest mb-5" style={{color:'var(--text-faint)'}}>
              Pipeline Completo — Último Snapshot
            </div>
            {funilStages.every(s=>s.val===0) ? (
              <div className="text-center py-12 text-sm italic" style={{color:'var(--text-faint)'}}>
                Clique em "Sync Pipedrive" para carregar os dados do pipeline
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {funilStages.map(({key,label,icon,val,color},i)=>{
                  const w = Math.max((val/maxVal)*100, val>0?1:0)
                  const prev = i>0 ? funilStages[i-1].val : null
                  const conv = prev&&prev>0 ? ((val/prev)*100).toFixed(1) : null
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <div className="w-36 text-right text-xs font-semibold flex items-center justify-end gap-1.5" style={{color:'var(--text-muted)'}}>
                        <span>{icon}</span><span>{label}</span>
                      </div>
                      <div className="flex-1 h-9 rounded-xl overflow-hidden" style={{background:'var(--bg-input)'}}>
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
            )}
          </Card>

          {/* Histórico */}
          {pipeChart.length>0 && (
            <Card>
              <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Evolução do Pipeline — Últimos 6 meses</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipeChart}>
                  <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-faint)',fontSize:9}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:11}}/>
                  <Legend wrapperStyle={{fontSize:10,color:'var(--text-faint)'}}/>
                  {['lead','qualificado','visita_realizada','proposta','ganho'].map(e=>(
                    <Bar key={e} dataKey={e} fill={ETAPA_COLOR[e]} name={ETAPA_LABEL[e]} stackId="a" radius={e==='ganho'?[3,3,0,0]:[0,0,0,0]}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
