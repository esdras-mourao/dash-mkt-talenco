import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/fmt'
import { Card, PageHeader, Badge, Btn, Modal, Input, Select, StatCard } from '../components/UI'
import { useAuth } from '../lib/AuthContext'

const TIPOS = ['evento','ativacao','stand','visita_obra','lançamento']
const STATUS_COLOR = { planejado:'yellow', realizado:'green', cancelado:'red' }

export default function Eventos() {
  const { can } = useAuth()
  const [eventos, setEventos] = useState([])
  const [emps, setEmps] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nome:'', tipo:'evento', empreendimento_id:'', data_inicio:'', data_fim:'', local:'', publico_estimado:'', orcamento_planejado:'', custo_real:'', status:'planejado', responsavel:'', obe:'', resultado:'' })

  async function load() {
    const [evR, empsR] = await Promise.all([
      supabase.from('eventos').select('*, empreendimentos(nome)').order('data_inicio',{ascending:false}),
      supabase.from('empreendimentos').select('*').eq('ativo',true),
    ])
    setEventos(evR.data||[])
    setEmps(empsR.data||[])
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({ nome:'', tipo:'evento', empreendimento_id:'', data_inicio:'', data_fim:'', local:'', publico_estimado:'', orcamento_planejado:'', custo_real:'', status:'planejado', responsavel:'', obe:'', resultado:'' })
    setModal(true)
  }

  function openEdit(ev) {
    setEditing(ev)
    setForm({ nome:ev.nome, tipo:ev.tipo, empreendimento_id:ev.empreendimento_id||'', data_inicio:ev.data_inicio, data_fim:ev.data_fim||'', local:ev.local||'', publico_estimado:ev.publico_estimado||'', orcamento_planejado:ev.orcamento_planejado||'', custo_real:ev.custo_real||'', status:ev.status, responsavel:ev.responsavel||'', obe:ev.obe||'', resultado:ev.resultado||'' })
    setModal(true)
  }

  async function save() {
    const p = { nome:form.nome, tipo:form.tipo, empreendimento_id:form.empreendimento_id?Number(form.empreendimento_id):null, data_inicio:form.data_inicio, data_fim:form.data_fim||null, local:form.local||null, publico_estimado:Number(form.publico_estimado||0), orcamento_planejado:Number(form.orcamento_planejado||0), custo_real:Number(form.custo_real||0)||null, status:form.status, responsavel:form.responsavel||null, obe:form.obe||null, resultado:form.resultado||null }
    if (editing) await supabase.from('eventos').update(p).eq('id',editing.id)
    else await supabase.from('eventos').insert(p)
    await load(); setModal(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir este evento?')) return
    await supabase.from('eventos').delete().eq('id',id)
    await load()
  }

  async function updateStatus(id, status) {
    await supabase.from('eventos').update({status}).eq('id',id); await load()
  }

  const totalOrc = eventos.reduce((s,e)=>s+Number(e.orcamento_planejado||0),0)
  const totalReal = eventos.reduce((s,e)=>s+Number(e.custo_real||0),0)
  const totalPublico = eventos.reduce((s,e)=>s+Number(e.publico_real||e.publico_estimado||0),0)

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Eventos & Ativações" sub="Planejamento e controle de ações offline">
        {can('canAddEventos') && <Btn onClick={openNew}>+ Novo Evento</Btn>}
      </PageHeader>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Eventos no Ano" value={eventos.length} accent="var(--accent)"/>
        <StatCard label="Orçamento Planejado" value={brl(totalOrc)} accent="#C6552A"/>
        <StatCard label="Custo Real" value={brl(totalReal)} accent={totalReal>totalOrc?'#ef4444':'#4a7c59'}
          sub={totalOrc>0?`${((totalReal/totalOrc)*100).toFixed(0)}% do orçado`:''}/>
      </div>
      <div className="flex flex-col gap-3">
        {eventos.length===0 && <Card><div className="text-center py-8 italic text-sm" style={{color:'var(--text-faint)'}}>Nenhum evento cadastrado</div></Card>}
        {eventos.map(ev=>(
          <Card key={ev.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <div className="font-display text-base font-bold" style={{color:'var(--text-primary)'}}>{ev.nome}</div>
                  <Badge color={STATUS_COLOR[ev.status]}>{ev.status}</Badge>
                  <Badge color="gray">{ev.tipo}</Badge>
                </div>
                <div className="text-xs flex flex-wrap gap-4 mb-2" style={{color:'var(--text-faint)'}}>
                  <span>{ev.empreendimentos?.nome||'Institucional'}</span>
                  {ev.local && <span>📍 {ev.local}</span>}
                  <span>📅 {ev.data_inicio}</span>
                  {ev.responsavel && <span>👤 {ev.responsavel}</span>}
                  {ev.orcamento_planejado>0 && <span>💰 Orçado: {brl(ev.orcamento_planejado,2)}</span>}
                  {ev.custo_real>0 && <span>💸 Real: <span style={{color:ev.custo_real>ev.orcamento_planejado?'#ef4444':'#4ade80'}}>{brl(ev.custo_real,2)}</span></span>}
                  {ev.publico_estimado>0 && <span>👥 {num(ev.publico_estimado)} esperados</span>}
                </div>
                {ev.obe && (
                  <div className="text-xs p-2 rounded border-l-2 border-talenco-yellow" style={{background:'var(--bg-input)',color:'var(--text-muted)'}}>
                    <span className="font-semibold" style={{color:'var(--accent)'}}>OBE:</span> {ev.obe}
                  </div>
                )}
                {ev.resultado && (
                  <div className="text-xs mt-1 p-2 rounded border-l-2 border-green-500" style={{background:'var(--bg-input)',color:'var(--text-muted)'}}>
                    <span className="font-semibold text-green-400">Resultado:</span> {ev.resultado}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                {ev.status==='planejado' && can('canAddEventos') && (
                  <Btn variant="ghost" onClick={()=>updateStatus(ev.id,'realizado')}>Marcar Realizado</Btn>
                )}
                {can('canManageUsers') && (
                  <>
                    <Btn variant="ghost" onClick={()=>openEdit(ev)}>Editar</Btn>
                    <Btn variant="danger" onClick={()=>excluir(ev.id)}>Excluir</Btn>
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Editar Evento':'Novo Evento'}>
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Nome" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))}/>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Tipo" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
              {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </Select>
            <Select label="Empreendimento" value={form.empreendimento_id} onChange={e=>setForm(f=>({...f,empreendimento_id:e.target.value}))}>
              <option value="">Institucional</option>
              {emps.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data Início" type="date" value={form.data_inicio} onChange={e=>setForm(f=>({...f,data_inicio:e.target.value}))}/>
            <Input label="Data Fim" type="date" value={form.data_fim} onChange={e=>setForm(f=>({...f,data_fim:e.target.value}))}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Local" value={form.local} onChange={e=>setForm(f=>({...f,local:e.target.value}))}/>
            <Input label="Responsável" value={form.responsavel} onChange={e=>setForm(f=>({...f,responsavel:e.target.value}))}/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Público Estimado" type="number" value={form.publico_estimado} onChange={e=>setForm(f=>({...f,publico_estimado:e.target.value}))}/>
            <Input label="Orçamento (R$)" type="number" value={form.orcamento_planejado} onChange={e=>setForm(f=>({...f,orcamento_planejado:e.target.value}))}/>
          </div>
          <Input label="Custo Real (R$)" type="number" value={form.custo_real} onChange={e=>setForm(f=>({...f,custo_real:e.target.value}))}/>
          <Select label="Status" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
            <option value="planejado">Planejado</option>
            <option value="realizado">Realizado</option>
            <option value="cancelado">Cancelado</option>
          </Select>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{color:'var(--text-muted)'}}>OBE (Objetivo, Briefing, Execução)</label>
            <textarea value={form.obe} onChange={e=>setForm(f=>({...f,obe:e.target.value}))} rows={3} placeholder="Descreva o objetivo, briefing e execução do evento..."
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{color:'var(--text-muted)'}}>Resultado</label>
            <textarea value={form.resultado} onChange={e=>setForm(f=>({...f,resultado:e.target.value}))} rows={2} placeholder="Resultado e aprendizados..."
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}>{editing?'Salvar':'Criar'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
