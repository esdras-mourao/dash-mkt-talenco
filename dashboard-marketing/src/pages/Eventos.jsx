import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/fmt'
import { Card, PageHeader, Badge, Btn, Modal, Input, Select, StatCard } from '../components/UI'

const TIPOS = ['evento','ativacao','stand','visita_obra']
const STATUS_COLOR = { planejado: 'yellow', realizado: 'green', cancelado: 'red' }

export default function Eventos() {
  const [eventos, setEventos] = useState([])
  const [emps, setEmps] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', tipo: 'evento', empreendimento_id: '', data_inicio: '', data_fim: '', local: '', publico_estimado: '', orcamento_planejado: '', status: 'planejado' })

  async function load() {
    const [evR, empsR] = await Promise.all([
      supabase.from('eventos').select('*, empreendimentos(nome)').order('data_inicio', { ascending: false }),
      supabase.from('empreendimentos').select('*').eq('ativo', true),
    ])
    setEventos(evR.data || [])
    setEmps(empsR.data || [])
  }

  useEffect(() => { load() }, [])

  async function save() {
    await supabase.from('eventos').insert({
      ...form,
      empreendimento_id: form.empreendimento_id ? Number(form.empreendimento_id) : null,
      publico_estimado: Number(form.publico_estimado || 0),
      orcamento_planejado: Number(form.orcamento_planejado || 0),
    })
    await load()
    setModal(false)
  }

  async function updateStatus(id, status) {
    await supabase.from('eventos').update({ status }).eq('id', id)
    await load()
  }

  const totalOrc = eventos.reduce((s, e) => s + Number(e.orcamento_planejado || 0), 0)
  const totalPublico = eventos.reduce((s, e) => s + Number(e.publico_real || e.publico_estimado || 0), 0)

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <PageHeader title="Eventos & Ativações" sub="Planejamento e controle de ações offline">
        <Btn onClick={() => setModal(true)}>+ Novo Evento</Btn>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Eventos no Ano" value={eventos.length} accent="#F2B82A" />
        <StatCard label="Orçamento Total" value={brl(totalOrc)} accent="#C6552A" />
        <StatCard label="Público Alcançado" value={num(totalPublico)} sub="estimado + real" accent="#1A4060" />
      </div>

      <div className="flex flex-col gap-3">
        {eventos.length === 0 && (
          <Card><div className="text-center text-[#4a3d33] py-8 italic text-sm">Nenhum evento cadastrado</div></Card>
        )}
        {eventos.map(ev => (
          <Card key={ev.id} className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <div className="font-display text-base font-bold text-[#F7F3EE]">{ev.nome}</div>
                <Badge color={STATUS_COLOR[ev.status]}>{ev.status}</Badge>
                <Badge color="gray">{ev.tipo}</Badge>
              </div>
              <div className="text-xs text-[#6b5d50] flex flex-wrap gap-4">
                <span>{ev.empreendimentos?.nome || 'Institucional'}</span>
                {ev.local && <span>📍 {ev.local}</span>}
                <span>📅 {ev.data_inicio}</span>
                {ev.orcamento_planejado > 0 && <span>💰 {brl(ev.orcamento_planejado, 2)}</span>}
                {ev.publico_estimado > 0 && <span>👥 {num(ev.publico_estimado)} esperados</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {ev.status === 'planejado' && (
                <Btn variant="ghost" onClick={() => updateStatus(ev.id, 'realizado')}>Marcar Realizado</Btn>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Novo Evento">
        <div className="flex flex-col gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="Empreendimento" value={form.empreendimento_id} onChange={e => setForm(f => ({ ...f, empreendimento_id: e.target.value }))}>
              <option value="">Institucional</option>
              {emps.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data Início" type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
            <Input label="Data Fim" type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))} />
          </div>
          <Input label="Local" value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Público Estimado" type="number" value={form.publico_estimado} onChange={e => setForm(f => ({ ...f, publico_estimado: e.target.value }))} />
            <Input label="Orçamento (R$)" type="number" value={form.orcamento_planejado} onChange={e => setForm(f => ({ ...f, orcamento_planejado: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}>Criar Evento</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
