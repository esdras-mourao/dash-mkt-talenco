import { useEffect, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../lib/supabase'
import { brl, num, MESES, COR_EMP } from '../lib/fmt'
import { StatCard, Card, PageHeader, Badge, RefreshBtn } from '../components/UI'
import { syncAll } from '../lib/sync'

const ANO = new Date().getFullYear()

export default function Overview() {
  const [stats, setStats] = useState({ vgv: 0, caixa: 0, leads: 0, gasto: 0 })
  const [caixaMensal, setCaixaMensal] = useState([])
  const [gastoPorCat, setGastoPorCat] = useState([])
  const [audiencia, setAudiencia] = useState([])
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  useEffect(() => {
    async function load() {
      const [vendasR, gastosR, kpisR, audienciaR, brindesR] = await Promise.all([
        supabase.from('vendas').select('valor_vgv, mes').eq('ano', ANO),
        supabase.from('gastos').select('valor, categoria, mes').eq('ano', ANO),
        supabase.from('kpis_campanha').select('leads, investimento, data'),
        supabase.from('audiencia').select('*').eq('ano', ANO).order('mes'),
        supabase.from('vw_estoque_brindes').select('*').eq('alerta_reposicao', true),
      ])

      const vgv = (vendasR.data || []).reduce((s, r) => s + Number(r.valor_vgv), 0)
      const gasto = (gastosR.data || []).reduce((s, r) => s + Number(r.valor), 0)
      const leads = (kpisR.data || []).reduce((s, r) => s + Number(r.leads), 0)
      setStats({ vgv, caixa: vgv * 0.01, leads, gasto })

      // caixa mensal por mês
      const byMes = Array.from({ length: 12 }, (_, i) => {
        const m = i + 1
        const vgvM = (vendasR.data || []).filter(r => r.mes === m).reduce((s, r) => s + Number(r.valor_vgv), 0)
        const gastoM = (gastosR.data || []).filter(r => r.mes === m).reduce((s, r) => s + Number(r.valor), 0)
        return { mes: MESES[i], caixa: vgvM * 0.01, gasto: gastoM }
      })
      setCaixaMensal(byMes)

      // gasto por categoria
      const cats = {}
      ;(gastosR.data || []).forEach(r => {
        cats[r.categoria] = (cats[r.categoria] || 0) + Number(r.valor)
      })
      setGastoPorCat(Object.entries(cats).map(([name, value]) => ({ name, value })))

      // audiência
      setAudiencia((audienciaR.data || []).map(r => ({
        mes: MESES[r.mes - 1],
        instagram: r.seguidores_instagram,
        facebook: r.seguidores_facebook,
        site: r.visitas_site,
        pago: (r.alcance_pago_meta || 0) + (r.alcance_pago_google || 0),
      })))

      setAlertas(brindesR.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const COLORS = ['#F2B82A','#C6552A','#1A4060','#D4956A','#4a7c59','#9a8b7d']

  async function handleSyncAll() {
    setSyncing(true); setSyncMsg('')
    try {
      const r = await syncAll()
      const metaOk = r.meta?.ok
      const pipeOk = r.pipedrive?.ok
      setSyncMsg(`Meta: ${metaOk?'✓':'✗'} ${r.meta?.campanhas||r.meta?.erro||''} | Pipedrive: ${pipeOk?'✓':'✗'} ${r.pipedrive?.estagios?.length||r.pipedrive?.erro||''}`)
      await load()
    } catch(e) { setSyncMsg('✗ ' + e.message) }
    setSyncing(false)
    setTimeout(()=>setSyncMsg(''),8000)
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-[#6b5d50]">Carregando...</div>

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <PageHeader title="Visão Geral" sub={`Marketing TalenCo · ${ANO}`}>
        <div className="flex gap-2 items-center no-print">
          <RefreshBtn onRefresh={handleSyncAll} loading={syncing} label="Sync Meta + Pipedrive"/>
          <Badge color="yellow">{ANO}</Badge>
        </div>
      </PageHeader>
      {syncMsg && (
        <div className="mb-4 text-xs px-3 py-2 rounded-lg no-print" style={{background:'var(--bg-input)',color:'var(--text-muted)'}}>
          {syncMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="VGV Vendido" value={brl(stats.vgv)} sub={`${ANO} acumulado`} accent="#F2B82A" />
        <StatCard label="Caixa Marketing" value={brl(stats.caixa)} sub="1% do VGV" accent="#C6552A" />
        <StatCard label="Gasto Real" value={brl(stats.gasto)} sub="Todas categorias" accent="#D4956A" />
        <StatCard label="Leads Gerados" value={num(stats.leads)} sub="Campanhas digitais" accent="#1A4060" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Caixa vs Gasto */}
        <Card className="lg:col-span-2">
          <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-4">Caixa Gerado vs Gasto por Mês</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={caixaMensal}>
              <defs>
                <linearGradient id="caixaG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F2B82A" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F2B82A" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gastoG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C6552A" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#C6552A" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fill: '#6b5d50', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: '#1e1a16', border: '1px solid #2e2820', borderRadius: 8, fontSize: 12 }}
                formatter={v => brl(v)}
              />
              <Area type="monotone" dataKey="caixa" stroke="#F2B82A" fill="url(#caixaG)" strokeWidth={2} name="Caixa" />
              <Area type="monotone" dataKey="gasto" stroke="#C6552A" fill="url(#gastoG)" strokeWidth={2} name="Gasto" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Gasto por categoria */}
        <Card>
          <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-4">Gasto por Categoria</div>
          {gastoPorCat.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-[#4a3d33] text-sm">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={gastoPorCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} strokeWidth={0}>
                  {gastoPorCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e1a16', border: '1px solid #2e2820', borderRadius: 8, fontSize: 12 }} formatter={v => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex flex-col gap-1 mt-2">
            {gastoPorCat.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[#9a8b7d] capitalize">{c.name}</span>
                </div>
                <span className="text-[#F7F3EE] font-medium">{brl(c.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Audiência */}
      {audiencia.length > 0 && (
        <Card className="mb-8">
          <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-4">Audiência Acumulada — Orgânico vs Pago</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={audiencia}>
              <XAxis dataKey="mes" tick={{ fill: '#6b5d50', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => num(v)} />
              <Tooltip contentStyle={{ background: '#1e1a16', border: '1px solid #2e2820', borderRadius: 8, fontSize: 12 }} formatter={num} />
              <Bar dataKey="instagram" fill="#C6552A" name="Instagram" radius={[3,3,0,0]} />
              <Bar dataKey="site" fill="#1A4060" name="Site" radius={[3,3,0,0]} />
              <Bar dataKey="pago" fill="#F2B82A" name="Alcance Pago" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Alertas de Estoque */}
      {alertas.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest">Alertas de Estoque — Brindes</div>
            <Badge color="red">{alertas.length} itens</Badge>
          </div>
          <div className="flex flex-col gap-2">
            {alertas.map(b => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b border-[#2e2820] pb-2">
                <span className="text-[#F7F3EE]">{b.item}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#6b5d50]">Estoque: <span className="text-red-400 font-semibold">{b.quantidade_atual}</span></span>
                  <span className="text-xs text-[#6b5d50]">Mínimo: {b.quantidade_minima}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
