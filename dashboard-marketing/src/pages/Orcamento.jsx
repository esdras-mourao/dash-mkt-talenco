import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, MESES } from '../lib/fmt'
import { Card, PageHeader, Badge, Btn, Select, StatCard, DateFilter, ExportBtn } from '../components/UI'

const CATS = ['midia', 'eventos', 'ferramentas', 'outros']
const ANOS = [2024, 2025, 2026]

export default function Orcamento() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [emps, setEmps] = useState([])
  const [plan, setPlan] = useState({}) // key: `${empId}_${cat}_${mes}` → valor
  const [exec, setExec]= useState({})
  const [saving, setSaving] = useState(false)
  const [totais, setTotais] = useState({ plan: 0, exec: 0 })

  async function load() {
    const [empsR, planR, execR] = await Promise.all([
      supabase.from('empreendimentos').select('*').eq('ativo', true),
      supabase.from('orcamento_planejado').select('*').eq('ano', ano),
      supabase.from('gastos').select('valor, categoria, mes, empreendimento_id').eq('ano', ano),
    ])
    setEmps(empsR.data || [])

    const planMap = {}
    ;(planR.data || []).forEach(r => {
      const k = `${r.empreendimento_id ?? 'inst'}_${r.categoria}_${r.mes}`
      planMap[k] = r.valor_planejado
    })
    setPlan(planMap)

    const execMap = {}
    ;(execR.data || []).forEach(r => {
      const k = `${r.empreendimento_id ?? 'inst'}_${r.categoria}_${r.mes}`
      execMap[k] = (execMap[k] || 0) + Number(r.valor)
    })
    setExec(execMap)

    const totalPlan = Object.values(planMap).reduce((s, v) => s + Number(v || 0), 0)
    const totalExec = Object.values(execMap).reduce((s, v) => s + Number(v || 0), 0)
    setTotais({ plan: totalPlan, exec: totalExec })
  }

  useEffect(() => { load() }, [ano])

  async function savePlan() {
    setSaving(true)
    const rows = []
    Object.entries(plan).forEach(([k, valor]) => {
      const [empId, cat, mes] = k.split('_')
      rows.push({
        ano,
        empreendimento_id: empId === 'inst' ? null : Number(empId),
        categoria: cat,
        mes: Number(mes),
        valor_planejado: Number(valor || 0),
      })
    })
    await supabase.from('orcamento_planejado').upsert(rows, {
      onConflict: 'ano,empreendimento_id,categoria,mes',
      ignoreDuplicates: false,
    })
    setSaving(false)
  }

  function setVal(empId, cat, mes, v) {
    const k = `${empId}_${cat}_${mes}`
    setPlan(prev => ({ ...prev, [k]: v }))
  }

  const targets = [...emps.map(e => ({ id: e.id, label: e.nome })), { id: 'inst', label: 'TalenCo Institucional' }]

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <PageHeader title="Planejamento de Orçamento" sub="Distribuição mensal por empreendimento e categoria">
        <div className="flex gap-3 items-center">
          <Select value={ano} onChange={e => setAno(Number(e.target.value))}>
            {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <ExportBtn/>
          <Btn onClick={savePlan} disabled={saving}>{saving ? 'Salvando...' : 'Salvar Plano'}</Btn>
        </div>
      </PageHeader>
      <div className="flex justify-end mb-4 no-print">
        <button onClick={()=>{ const t=document.title; document.title="Orcamento — TalenCo Marketing"; window.print(); document.title=t; }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80"
          style={{background:'var(--bg-input)',color:'var(--text-primary)',border:'1px solid var(--border)'}}>
          ⬇ Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Planejado" value={brl(totais.plan)} accent="#F2B82A" />
        <StatCard label="Total Executado" value={brl(totais.exec)} accent="#C6552A" />
        <StatCard label="Saldo" value={brl(totais.plan - totais.exec)} accent={totais.plan - totais.exec >= 0 ? '#4a7c59' : '#ef4444'} />
      </div>

      {targets.map(({ id, label }) => (
        <Card key={id} className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="font-display text-base font-bold text-[#F7F3EE]">{label}</div>
            <Badge color="gray">{ano}</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left text-[#6b5d50] pb-2 pr-3 uppercase tracking-wide font-semibold">Categoria</th>
                  {MESES.map(m => (
                    <th key={m} className="text-center text-[#6b5d50] pb-2 px-1 uppercase tracking-wide font-semibold w-16">{m}</th>
                  ))}
                  <th className="text-right text-[#6b5d50] pb-2 pl-3 uppercase tracking-wide font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {CATS.map(cat => {
                  const rowTotal = MESES.reduce((s, _, i) => s + Number(plan[`${id}_${cat}_${i + 1}`] || 0), 0)
                  const rowExec = MESES.reduce((s, _, i) => s + Number(exec[`${id}_${cat}_${i + 1}`] || 0), 0)
                  return (
                    <>
                      <tr key={`${id}_${cat}_plan`}>
                        <td className="text-[#9a8b7d] capitalize pr-3 py-1 font-medium">{cat}</td>
                        {MESES.map((_, i) => {
                          const k = `${id}_${cat}_${i + 1}`
                          return (
                            <td key={i} className="px-1 py-0.5">
                              <input
                                type="number"
                                value={plan[k] || ''}
                                onChange={e => setVal(id, cat, i + 1, e.target.value)}
                                placeholder="0"
                                className="w-16 bg-[#2a2420] border border-[#3e3028] rounded px-1.5 py-1 text-center text-[#F7F3EE] focus:outline-none focus:border-talenco-yellow/50 text-xs"
                              />
                            </td>
                          )
                        })}
                        <td className="text-right text-talenco-yellow font-semibold pl-3">{brl(rowTotal)}</td>
                      </tr>
                      <tr key={`${id}_${cat}_exec`} className="border-b border-[#2e2820]">
                        <td className="text-[#4a3d33] italic pr-3 py-0.5 text-[10px]">executado</td>
                        {MESES.map((_, i) => {
                          const k = `${id}_${cat}_${i + 1}`
                          const v = exec[k] || 0
                          const p = plan[k] || 0
                          return (
                            <td key={i} className={`px-1 py-0.5 text-center text-[10px] font-medium ${v > p && p > 0 ? 'text-red-400' : 'text-[#4a3d33]'}`}>
                              {v > 0 ? brl(v) : '—'}
                            </td>
                          )
                        })}
                        <td className={`text-right text-[10px] font-semibold pl-3 ${rowExec > rowTotal && rowTotal > 0 ? 'text-red-400' : 'text-[#6b5d50]'}`}>{rowExec > 0 ? brl(rowExec) : '—'}</td>
                      </tr>
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}
