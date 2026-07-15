import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import { brl, num, MESES } from '../lib/fmt'
import { StatCard, Card, PageHeader, Badge, RefreshBtn, Select, DateFilter } from '../components/UI'
import { syncAll } from '../lib/sync'

export default function Overview() {
  const ano = new Date().getFullYear()
  const [stats, setStats] = useState({ vgv:0, caixa:0, leads:0, gasto:0 })
  const [caixaMensal, setCaixaMensal] = useState([])
  const [gastoPorCat, setGastoPorCat] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [filtroDE, setFiltroDE] = useState('')
  const [filtroATE, setFiltroATE] = useState('')

  async function load() {
    setLoading(true)
    let vendasQ = supabase.from('vendas').select('valor_vgv, mes, data_venda').eq('ano', ano)
    let gastosQ = supabase.from('gastos').select('valor, categoria, mes, data').eq('ano', ano)
    let kpisQ   = supabase.from('kpis_campanha').select('leads, investimento, data')

    if (filtroDE) {
      vendasQ = vendasQ.gte('data_venda', filtroDE)
      gastosQ = gastosQ.gte('data', filtroDE)
      kpisQ   = kpisQ.gte('data', filtroDE)
    }
    if (filtroATE) {
      vendasQ = vendasQ.lte('data_venda', filtroATE)
      gastosQ = gastosQ.lte('data', filtroATE)
      kpisQ   = kpisQ.lte('data', filtroATE)
    }

    const [vendasR, gastosR, kpisR, brindesR] = await Promise.all([
      vendasQ, gastosQ, kpisQ,
      supabase.from('vw_estoque_brindes').select('*').eq('alerta_reposicao', true),
    ])

    const vgv   = (vendasR.data||[]).reduce((s,r)=>s+Number(r.valor_vgv),0)
    const gasto = (gastosR.data||[]).reduce((s,r)=>s+Number(r.valor),0)
    const leads = (kpisR.data||[]).reduce((s,r)=>s+Number(r.leads||0),0)
    setStats({ vgv, caixa: vgv*0.01, leads, gasto })

    const byMes = Array.from({length:12},(_,i)=>{
      const m = i+1
      const vgvM  = (vendasR.data||[]).filter(r=>r.mes===m).reduce((s,r)=>s+Number(r.valor_vgv),0)
      const gastoM= (gastosR.data||[]).filter(r=>r.mes===m).reduce((s,r)=>s+Number(r.valor),0)
      return { mes:MESES[i], caixa:vgvM*0.01, gasto:gastoM }
    })
    setCaixaMensal(byMes)

    const cats = {}
    ;(gastosR.data||[]).forEach(r=>{ cats[r.categoria]=(cats[r.categoria]||0)+Number(r.valor) })
    setGastoPorCat(Object.entries(cats).map(([name,value])=>({name,value})))

    setAlertas(brindesR.data||[])
    setLoading(false)
  }

  // Sync automático no carregamento
  useEffect(() => {
    async function init() {
      try {
        setSyncing(true)
        await syncAll()
      } catch(e) { /* silencioso no auto-sync */ }
      setSyncing(false)
      load()
    }
    init()
  }, [])

  useEffect(() => { if (!loading) load() }, [filtroDE, filtroATE])

  async function handleSyncAll() {
    setSyncing(true); setSyncMsg('')
    try {
      const r = await syncAll()
      setSyncMsg(`Meta: ${r.meta?.ok?'✓':('✗ '+r.meta?.erro)} | Pipedrive: ${r.pipedrive?.ok?'✓':('✗ '+r.pipedrive?.erro)}`)
      load()
    } catch(e) { setSyncMsg('✗ '+e.message) }
    setSyncing(false)
    setTimeout(()=>setSyncMsg(''),8000)
  }

  const COLORS = ['#F2B82A','#C6552A','#1A4060','#D4956A','#4a7c59','#9a8b7d']

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Visão Geral" sub={`Marketing TalenCo · ${ano}`}>
        <div className="flex gap-2 items-center flex-wrap no-print">
          <DateFilter from={filtroDE} to={filtroATE} onFrom={setFiltroDE} onTo={setFiltroATE} onClear={()=>{setFiltroDE('');setFiltroATE('')}}/>
          <RefreshBtn onRefresh={handleSyncAll} loading={syncing} label="Sync Meta + Pipedrive"/>
          <Badge color="yellow">{ano}</Badge>
        </div>
      </PageHeader>

      {syncMsg && (
        <div className="mb-4 text-xs px-3 py-2 rounded-lg no-print" style={{background:'var(--bg-input)',color:'var(--text-muted)'}}>
          {syncMsg}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-sm" style={{color:'var(--text-faint)'}}>
          {syncing ? 'Sincronizando Meta + Pipedrive...' : 'Carregando...'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="VGV Vendido" value={brl(stats.vgv)} sub={`${ano} acumulado`} accent="var(--accent)"/>
            <StatCard label="Caixa Marketing" value={brl(stats.caixa)} sub="1% do VGV" accent="#C6552A"/>
            <StatCard label="Gasto Real" value={brl(stats.gasto)} sub="Todas categorias" accent="#D4956A"/>
            <StatCard label="Leads Gerados" value={num(stats.leads)} sub="Campanhas digitais" accent="#1A4060"/>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <Card className="lg:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Caixa Gerado vs Gasto por Mês</div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={caixaMensal}>
                  <defs>
                    <linearGradient id="caixaG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F2B82A" stopOpacity={0.3}/><stop offset="95%" stopColor="#F2B82A" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gastoG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C6552A" stopOpacity={0.3}/><stop offset="95%" stopColor="#C6552A" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:11}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
                  <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} formatter={v=>brl(v)}/>
                  <Area type="monotone" dataKey="caixa" stroke="#F2B82A" fill="url(#caixaG)" strokeWidth={2} name="Caixa"/>
                  <Area type="monotone" dataKey="gasto" stroke="#C6552A" fill="url(#gastoG)" strokeWidth={2} name="Gasto"/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Gasto por Categoria</div>
              {gastoPorCat.length===0
                ? <div className="flex items-center justify-center h-40 text-sm" style={{color:'var(--text-faint)'}}>Sem dados</div>
                : <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={gastoPorCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} strokeWidth={0}>
                          {gastoPorCat.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} formatter={v=>brl(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1 mt-2">
                      {gastoPorCat.map((c,i)=>(
                        <div key={c.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{background:COLORS[i%COLORS.length]}}/>
                            <span className="capitalize" style={{color:'var(--text-muted)'}}>{c.name}</span>
                          </div>
                          <span className="font-medium" style={{color:'var(--text-primary)'}}>{brl(c.value)}</span>
                        </div>
                      ))}
                    </div>
                  </>
              }
            </Card>
          </div>

          {alertas.length>0 && (
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--text-faint)'}}>Alertas de Estoque — Brindes</div>
                <Badge color="red">{alertas.length} itens</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {alertas.map(b=>(
                  <div key={b.id} className="flex items-center justify-between text-sm border-b pb-2" style={{borderColor:'var(--border)'}}>
                    <span style={{color:'var(--text-primary)'}}>{b.item}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs" style={{color:'var(--text-faint)'}}>Estoque: <span className="text-red-400 font-semibold">{b.quantidade_atual}</span></span>
                      <span className="text-xs" style={{color:'var(--text-faint)'}}>Mínimo: {b.quantidade_minima}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
