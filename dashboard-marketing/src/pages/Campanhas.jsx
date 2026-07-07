import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num, pct } from '../lib/fmt'
import { Card, PageHeader, Badge, Btn, Modal, Input, Select, StatCard, EmptyState } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const PLATAFORMAS = ['meta','google','youtube','tiktok','organico']
const STATUS_COLOR = { ativa: 'green', pausada: 'yellow', encerrada: 'gray' }

export default function Campanhas() {
  const [campanhas, setCampanhas] = useState([])
  const [emps, setEmps] = useState([])
  const [selected, setSelected] = useState(null)
  const [kpis, setKpis] = useState([])
  const [modalCamp, setModalCamp] = useState(false)
  const [modalKpi, setModalKpi] = useState(false)
  const [form, setForm] = useState({ nome: '', empreendimento_id: '', plataforma: 'meta', data_inicio: '', investimento_planejado: '' })
  const [kpiForm, setKpiForm] = useState({ data: '', investimento: '', impressoes: '', alcance: '', cliques: '', leads: '', leads_qualificados: '', visitas_stand: '', reservas: '', vendas: '' })
  const [totais, setTotais] = useState({ invest: 0, impressoes: 0, leads: 0, reservas: 0 })

  async function load() {
    const [campR, empsR] = await Promise.all([
      supabase.from('campanhas').select('*, empreendimentos(nome, codigo)').order('data_inicio', { ascending: false }),
      supabase.from('empreendimentos').select('*').eq('ativo', true),
    ])
    setCampanhas(campR.data || [])
    setEmps(empsR.data || [])
    if (campR.data?.length && !selected) setSelected(campR.data[0])
  }

  async function loadKpis(campId) {
    const { data } = await supabase.from('kpis_campanha').select('*').eq('campanha_id', campId).order('data')
    setKpis(data || [])
    const tot = (data || []).reduce((s, r) => ({
      invest: s.invest + Number(r.investimento),
      impressoes: s.impressoes + r.impressoes,
      leads: s.leads + r.leads,
      reservas: s.reservas + r.reservas,
    }), { invest: 0, impressoes: 0, leads: 0, reservas: 0 })
    setTotais(tot)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadKpis(selected.id) }, [selected])

  async function saveCamp() {
    await supabase.from('campanhas').insert({ ...form, empreendimento_id: Number(form.empreendimento_id), investimento_planejado: Number(form.investimento_planejado) })
    await load()
    setModalCamp(false)
  }

  async function saveKpi() {
    await supabase.from('kpis_campanha').insert({
      campanha_id: selected.id,
      data: kpiForm.data,
      investimento: Number(kpiForm.investimento || 0),
      impressoes: Number(kpiForm.impressoes || 0),
      alcance: Number(kpiForm.alcance || 0),
      cliques: Number(kpiForm.cliques || 0),
      leads: Number(kpiForm.leads || 0),
      leads_qualificados: Number(kpiForm.leads_qualificados || 0),
      visitas_stand: Number(kpiForm.visitas_stand || 0),
      reservas: Number(kpiForm.reservas || 0),
      vendas: Number(kpiForm.vendas || 0),
    })
    await loadKpis(selected.id)
    setModalKpi(false)
    setKpiForm({ data: '', investimento: '', impressoes: '', alcance: '', cliques: '', leads: '', leads_qualificados: '', visitas_stand: '', reservas: '', vendas: '' })
  }

  const cpl = totais.leads > 0 ? totais.invest / totais.leads : 0
  const txConv = totais.leads > 0 ? totais.reservas / totais.leads : 0

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Lista lateral */}
      <div className="w-64 shrink-0 border-r border-[#2e2820] overflow-y-auto p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#6b5d50] uppercase tracking-widest">Campanhas</span>
          <button onClick={() => setModalCamp(true)} className="text-talenco-yellow text-lg leading-none hover:opacity-70">+</button>
        </div>
        {campanhas.length === 0 && <div className="text-xs text-[#4a3d33] italic">Nenhuma campanha</div>}
        {campanhas.map(c => (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            className={`text-left p-3 rounded-lg border transition-all ${selected?.id === c.id ? 'bg-talenco-yellow/10 border-talenco-yellow/30' : 'bg-[#1e1a16] border-[#2e2820] hover:border-[#3e3028]'}`}
          >
            <div className="text-xs font-semibold text-[#F7F3EE] truncate">{c.nome}</div>
            <div className="text-[10px] text-[#6b5d50] mt-0.5 capitalize">{c.plataforma} · {c.empreendimentos?.nome}</div>
            <div className="mt-1"><Badge color={STATUS_COLOR[c.status]}>{c.status}</Badge></div>
          </button>
        ))}
      </div>

      {/* Detalhe */}
      <div className="flex-1 p-8 overflow-y-auto">
        {!selected ? (
          <EmptyState icon="◉" title="Selecione uma campanha" sub="ou crie uma nova" />
        ) : (
          <>
            <PageHeader title={selected.nome} sub={`${selected.plataforma} · ${selected.empreendimentos?.nome || 'Institucional'}`}>
              <Btn onClick={() => setModalKpi(true)}>+ Lançar KPIs</Btn>
            </PageHeader>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard label="Investimento" value={brl(totais.invest)} accent="#F2B82A" />
              <StatCard label="Impressões" value={num(totais.impressoes)} accent="#1A4060" />
              <StatCard label="Leads" value={num(totais.leads)} sub={`CPL ${brl(cpl, 2)}`} accent="#C6552A" />
              <StatCard label="Reservas" value={num(totais.reservas)} sub={`Conv. ${pct(txConv)}`} accent="#D4956A" />
            </div>

            {/* Funil visual */}
            {kpis.length > 0 && (
              <Card className="mb-6">
                <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-4">Funil de Marketing e Vendas</div>
                <div className="flex flex-col gap-1">
                  {[
                    { label: 'Impressões', val: totais.impressoes, color: '#1A4060' },
                    { label: 'Cliques', val: kpis.reduce((s, r) => s + r.cliques, 0), color: '#F2B82A' },
                    { label: 'Leads', val: totais.leads, color: '#C6552A' },
                    { label: 'Leads Qualificados', val: kpis.reduce((s, r) => s + r.leads_qualificados, 0), color: '#D4956A' },
                    { label: 'Visitas ao Stand', val: kpis.reduce((s, r) => s + r.visitas_stand, 0), color: '#9a8b7d' },
                    { label: 'Reservas', val: totais.reservas, color: '#4a7c59' },
                    { label: 'Vendas', val: kpis.reduce((s, r) => s + r.vendas, 0), color: '#F7F3EE' },
                  ].map(({ label, val, color }, i, arr) => {
                    const max = arr[0].val || 1
                    const w = Math.max((val / max) * 100, 2)
                    return (
                      <div key={label} className="flex items-center gap-3 text-xs">
                        <div className="w-28 text-right text-[#9a8b7d] shrink-0">{label}</div>
                        <div className="flex-1 bg-[#2a2420] rounded-full h-5 overflow-hidden">
                          <div className="h-full rounded-full flex items-center px-2" style={{ width: `${w}%`, background: color }}>
                            <span className="text-[10px] font-bold text-[#130f0c] whitespace-nowrap">{num(val)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {/* Gráfico de leads por período */}
            {kpis.length > 0 && (
              <Card>
                <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-4">Investimento × Leads por Período</div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={kpis}>
                    <XAxis dataKey="data" tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="l" tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => brl(v)} />
                    <Tooltip contentStyle={{ background: '#1e1a16', border: '1px solid #2e2820', borderRadius: 8, fontSize: 12 }} />
                    <Bar yAxisId="l" dataKey="leads" fill="#C6552A" name="Leads" radius={[3,3,0,0]} />
                    <Bar yAxisId="r" dataKey="investimento" fill="#F2B82A" name="Investimento" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Modal Campanha */}
      <Modal open={modalCamp} onClose={() => setModalCamp(false)} title="Nova Campanha">
        <div className="flex flex-col gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          <Select label="Empreendimento" value={form.empreendimento_id} onChange={e => setForm(f => ({ ...f, empreendimento_id: e.target.value }))}>
            <option value="">Institucional</option>
            {emps.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Select>
          <Select label="Plataforma" value={form.plataforma} onChange={e => setForm(f => ({ ...f, plataforma: e.target.value }))}>
            {PLATAFORMAS.map(p => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Input label="Data Início" type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
          <Input label="Investimento Planejado (R$)" type="number" value={form.investimento_planejado} onChange={e => setForm(f => ({ ...f, investimento_planejado: e.target.value }))} />
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModalCamp(false)}>Cancelar</Btn>
            <Btn onClick={saveCamp}>Criar Campanha</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal KPI */}
      <Modal open={modalKpi} onClose={() => setModalKpi(false)} title="Lançar KPIs">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={kpiForm.data} onChange={e => setKpiForm(f => ({ ...f, data: e.target.value }))} />
          <Input label="Investimento (R$)" type="number" value={kpiForm.investimento} onChange={e => setKpiForm(f => ({ ...f, investimento: e.target.value }))} />
          <Input label="Impressões" type="number" value={kpiForm.impressoes} onChange={e => setKpiForm(f => ({ ...f, impressoes: e.target.value }))} />
          <Input label="Alcance" type="number" value={kpiForm.alcance} onChange={e => setKpiForm(f => ({ ...f, alcance: e.target.value }))} />
          <Input label="Cliques" type="number" value={kpiForm.cliques} onChange={e => setKpiForm(f => ({ ...f, cliques: e.target.value }))} />
          <Input label="Leads" type="number" value={kpiForm.leads} onChange={e => setKpiForm(f => ({ ...f, leads: e.target.value }))} />
          <Input label="Leads Qualificados" type="number" value={kpiForm.leads_qualificados} onChange={e => setKpiForm(f => ({ ...f, leads_qualificados: e.target.value }))} />
          <Input label="Visitas ao Stand" type="number" value={kpiForm.visitas_stand} onChange={e => setKpiForm(f => ({ ...f, visitas_stand: e.target.value }))} />
          <Input label="Reservas" type="number" value={kpiForm.reservas} onChange={e => setKpiForm(f => ({ ...f, reservas: e.target.value }))} />
          <Input label="Vendas" type="number" value={kpiForm.vendas} onChange={e => setKpiForm(f => ({ ...f, vendas: e.target.value }))} />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Btn variant="ghost" onClick={() => setModalKpi(false)}>Cancelar</Btn>
          <Btn onClick={saveKpi}>Salvar KPIs</Btn>
        </div>
      </Modal>
    </div>
  )
}
