import { DateFilter } from '../components/DateFilter'
import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../lib/supabase'
import { brl, MESES, COR_EMP } from '../lib/fmt'
import { Card, PageHeader, StatCard, Badge, Modal, Input, Select, Btn } from '../components/UI'

const ANO = new Date().getFullYear()

export default function Caixa() {
  const [dados, setDados] = useState([])
  const [emps, setEmps] = useState([])
  const [modalVenda, setModalVenda] = useState(false)
  const [form, setForm] = useState({ empreendimento_id: '', data_venda: '', valor_vgv: '', unidade: '', comprador: '' })
  const [saving, setSaving] = useState(false)
  const [totais, setTotais] = useState({ vgv: 0, caixa: 0, produto: 0, institucional: 0 })

  async function load() {
    const [caixaR, empsR] = await Promise.all([
      supabase.from('vw_caixa_marketing').select('*').eq('ano', ANO).order('mes'),
      supabase.from('empreendimentos').select('*').eq('ativo', true),
    ])
    setEmps(empsR.data || [])

    // organizar por mês
    const byMes = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1
      const rows = (caixaR.data || []).filter(r => r.mes === m)
      const obj = { mes: MESES[i] }
      rows.forEach(r => {
        obj[r.codigo] = Number(r.caixa_produto)
        obj[`${r.codigo}_inst`] = Number(r.caixa_institucional)
      })
      return obj
    })
    setDados(byMes)

    const all = caixaR.data || []
    setTotais({
      vgv: all.reduce((s, r) => s + Number(r.vgv_vendido), 0),
      caixa: all.reduce((s, r) => s + Number(r.caixa_total), 0),
      produto: all.reduce((s, r) => s + Number(r.caixa_produto), 0),
      institucional: all.reduce((s, r) => s + Number(r.caixa_institucional), 0),
    })
  }

  useEffect(() => { load() }, [])

  async function salvarVenda() {
    setSaving(true)
    await supabase.from('vendas').insert({
      empreendimento_id: Number(form.empreendimento_id),
      data_venda: form.data_venda,
      valor_vgv: Number(form.valor_vgv),
      unidade: form.unidade,
      comprador: form.comprador,
    })
    await load()
    setModalVenda(false)
    setForm({ empreendimento_id: '', data_venda: '', valor_vgv: '', unidade: '', comprador: '' })
    setSaving(false)
  }

  const empAtivos = emps.filter(e => e.ano_inicio <= ANO)

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <PageHeader title="Caixa de Marketing" sub="1% do VGV vendido · Split 70% produto / 30% institucional">
        <Btn onClick={() => setModalVenda(true)}>+ Registrar Venda</Btn>
      </PageHeader>
      <div className="flex justify-end mb-4 no-print">
        <button onClick={()=>{ const t=document.title; document.title="Caixa — TalenCo Marketing"; window.print(); document.title=t; }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80"
          style={{background:'var(--bg-input)',color:'var(--text-primary)',border:'1px solid var(--border)'}}>
          ⬇ Exportar PDF
        </button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="VGV Vendido" value={brl(totais.vgv)} sub={`${ANO} acumulado`} accent="#F2B82A" />
        <StatCard label="Caixa Total" value={brl(totais.caixa)} sub="1% do VGV" accent="#C6552A" />
        <StatCard label="Caixa Produto" value={brl(totais.produto)} sub="70% → empreendimentos" accent="#D4956A" />
        <StatCard label="Caixa Institucional" value={brl(totais.institucional)} sub="30% → TalenCo" accent="#1A4060" />
      </div>

      {/* Regra visual */}
      <Card className="mb-6">
        <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-3">Como funciona</div>
        <div className="flex flex-wrap gap-6 text-sm text-[#9a8b7d]">
          <div>Venda registrada → <span className="text-talenco-yellow font-semibold">1% do VGV</span> vai para o caixa</div>
          <div>→ <span className="text-[#D4956A] font-semibold">70%</span> destinado ao empreendimento vendido</div>
          <div>→ <span className="text-[#1A4060] font-semibold" style={{ color: '#60a5fa' }}>30%</span> destinado à TalenCo institucional</div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          {empAtivos.map(e => (
            <div key={e.id} className="flex items-center gap-2 text-xs bg-[#2a2420] rounded-full px-3 py-1">
              <div className="w-2 h-2 rounded-full" style={{ background: COR_EMP[e.codigo] || '#9a8b7d' }} />
              <span className="text-[#F7F3EE]">{e.nome}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs bg-[#2a2420] rounded-full px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[#F7F3EE]">TalenCo Institucional</span>
          </div>
        </div>
      </Card>

      {/* Gráfico mensal */}
      <Card className="mb-6">
        <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-4">Caixa de Produto por Empreendimento — Mensal</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dados}>
            <XAxis dataKey="mes" tick={{ fill: '#6b5d50', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: '#1e1a16', border: '1px solid #2e2820', borderRadius: 8, fontSize: 12 }}
              formatter={v => brl(v)}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9a8b7d' }} />
            {empAtivos.map(e => (
              <Bar key={e.codigo} dataKey={e.codigo} fill={COR_EMP[e.codigo] || '#9a8b7d'} name={e.nome} stackId="a" radius={[0,0,0,0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Modal Venda */}
      <Modal open={modalVenda} onClose={() => setModalVenda(false)} title="Registrar Venda">
        <div className="flex flex-col gap-4">
          <Select label="Empreendimento" value={form.empreendimento_id} onChange={e => setForm(f => ({ ...f, empreendimento_id: e.target.value }))}>
            <option value="">Selecione</option>
            {empAtivos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Select>
          <Input label="Data da Venda" type="date" value={form.data_venda} onChange={e => setForm(f => ({ ...f, data_venda: e.target.value }))} />
          <Input label="Valor VGV (R$)" type="number" placeholder="0" value={form.valor_vgv} onChange={e => setForm(f => ({ ...f, valor_vgv: e.target.value }))} />
          <Input label="Unidade" placeholder="Ex: 104A" value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))} />
          <Input label="Comprador" placeholder="Nome do comprador" value={form.comprador} onChange={e => setForm(f => ({ ...f, comprador: e.target.value }))} />
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModalVenda(false)}>Cancelar</Btn>
            <Btn onClick={salvarVenda} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
