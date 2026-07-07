import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl } from '../lib/fmt'
import { Card, PageHeader, Badge, Btn, Modal, Input, Select, StatCard } from '../components/UI'

const CATS = ['midia', 'eventos', 'ferramentas', 'outros']

export default function Gastos() {
  const [gastos, setGastos] = useState([])
  const [emps, setEmps] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ data: '', empreendimento_id: '', categoria: 'midia', subcategoria: '', descricao: '', fornecedor: '', valor: '' })
  const [filtro, setFiltro] = useState({ cat: '', emp: '' })

  async function load() {
    const [gastosR, empsR] = await Promise.all([
      supabase.from('gastos').select('*, empreendimentos(nome)').order('data', { ascending: false }).limit(200),
      supabase.from('empreendimentos').select('*').eq('ativo', true),
    ])
    setGastos(gastosR.data || [])
    setEmps(empsR.data || [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    await supabase.from('gastos').insert({
      data: form.data,
      empreendimento_id: form.empreendimento_id ? Number(form.empreendimento_id) : null,
      categoria: form.categoria,
      subcategoria: form.subcategoria || null,
      descricao: form.descricao,
      fornecedor: form.fornecedor || null,
      valor: Number(form.valor),
    })
    await load()
    setModal(false)
    setForm({ data: '', empreendimento_id: '', categoria: 'midia', subcategoria: '', descricao: '', fornecedor: '', valor: '' })
  }

  const filtered = gastos.filter(g =>
    (!filtro.cat || g.categoria === filtro.cat) &&
    (!filtro.emp || String(g.empreendimento_id) === filtro.emp)
  )
  const total = filtered.reduce((s, g) => s + Number(g.valor), 0)

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <PageHeader title="Gastos de Marketing" sub="Registro de todas as despesas">
        <Btn onClick={() => setModal(true)}>+ Novo Gasto</Btn>
      </PageHeader>

      <div className="flex gap-3 mb-6">
        <Select value={filtro.cat} onChange={e => setFiltro(f => ({ ...f, cat: e.target.value }))}>
          <option value="">Todas as categorias</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={filtro.emp} onChange={e => setFiltro(f => ({ ...f, emp: e.target.value }))}>
          <option value="">Todos empreendimentos</option>
          <option value="">Institucional</option>
          {emps.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
        </Select>
        <StatCard label="Total filtrado" value={brl(total)} className="flex-1" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2e2820]">
                {['Data','Descrição','Empreendimento','Categoria','Fornecedor','Valor'].map(h => (
                  <th key={h} className="text-left text-xs text-[#6b5d50] uppercase tracking-wide font-semibold pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-[#4a3d33] py-8 text-sm italic">Nenhum gasto registrado</td></tr>
              )}
              {filtered.map(g => (
                <tr key={g.id} className="border-b border-[#2e2820] hover:bg-white/2">
                  <td className="py-2.5 pr-4 text-[#9a8b7d] text-xs">{g.data}</td>
                  <td className="py-2.5 pr-4 text-[#F7F3EE]">{g.descricao}</td>
                  <td className="py-2.5 pr-4 text-[#9a8b7d] text-xs">{g.empreendimentos?.nome || 'Institucional'}</td>
                  <td className="py-2.5 pr-4"><Badge color="gray">{g.categoria}</Badge></td>
                  <td className="py-2.5 pr-4 text-[#9a8b7d] text-xs">{g.fornecedor || '—'}</td>
                  <td className="py-2.5 text-talenco-yellow font-semibold">{brl(g.valor, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Registrar Gasto">
        <div className="flex flex-col gap-3">
          <Input label="Data" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          <Select label="Empreendimento" value={form.empreendimento_id} onChange={e => setForm(f => ({ ...f, empreendimento_id: e.target.value }))}>
            <option value="">Institucional TalenCo</option>
            {emps.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Select>
          <Select label="Categoria" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
            {CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Subcategoria" placeholder="Ex: Meta Ads, Gráfica..." value={form.subcategoria} onChange={e => setForm(f => ({ ...f, subcategoria: e.target.value }))} />
          <Input label="Descrição" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
          <Input label="Fornecedor" value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))} />
          <Input label="Valor (R$)" type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}>Registrar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
