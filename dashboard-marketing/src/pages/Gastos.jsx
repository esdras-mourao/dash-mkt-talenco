import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl } from '../lib/fmt'
import { Card, PageHeader, Badge, Btn, Modal, Input, Select, StatCard } from '../components/UI'
import { useAuth } from '../lib/AuthContext'

const CATS = ['midia','eventos','ferramentas','pessoas','outros']

export default function Gastos() {
  const { can } = useAuth()
  const [gastos, setGastos] = useState([])
  const [emps, setEmps] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ data:'', empreendimento_id:'', categoria:'midia', subcategoria:'', descricao:'', fornecedor:'', valor:'' })
  const [filtro, setFiltro] = useState({ cat:'', emp:'' })

  async function load() {
    const [gastosR, empsR] = await Promise.all([
      supabase.from('gastos').select('*, empreendimentos(nome)').order('data',{ascending:false}).limit(300),
      supabase.from('empreendimentos').select('*').eq('ativo',true),
    ])
    setGastos(gastosR.data||[])
    setEmps(empsR.data||[])
  }

  useEffect(() => { load() }, [])

  function openNew() { setEditing(null); setForm({ data:'', empreendimento_id:'', categoria:'midia', subcategoria:'', descricao:'', fornecedor:'', valor:'' }); setModal(true) }
  function openEdit(g) { setEditing(g); setForm({ data:g.data, empreendimento_id:g.empreendimento_id||'', categoria:g.categoria, subcategoria:g.subcategoria||'', descricao:g.descricao, fornecedor:g.fornecedor||'', valor:g.valor }); setModal(true) }

  async function save() {
    const p = { data:form.data, empreendimento_id:form.empreendimento_id?Number(form.empreendimento_id):null, categoria:form.categoria, subcategoria:form.subcategoria||null, descricao:form.descricao, fornecedor:form.fornecedor||null, valor:Number(form.valor) }
    if (editing) await supabase.from('gastos').update(p).eq('id',editing.id)
    else await supabase.from('gastos').insert(p)
    await load(); setModal(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir este lançamento?')) return
    await supabase.from('gastos').delete().eq('id',id); await load()
  }

  const filtered = gastos.filter(g=>(!filtro.cat||g.categoria===filtro.cat)&&(!filtro.emp||String(g.empreendimento_id)===filtro.emp))
  const total = filtered.reduce((s,g)=>s+Number(g.valor),0)

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Gastos de Marketing" sub="Registro de todas as despesas">
        {can('canAddGastos') && <Btn onClick={openNew}>+ Novo Gasto</Btn>}
      </PageHeader>
      <div className="flex gap-3 mb-6 flex-wrap">
        <Select value={filtro.cat} onChange={e=>setFiltro(f=>({...f,cat:e.target.value}))}>
          <option value="">Todas as categorias</option>
          {CATS.map(c=><option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={filtro.emp} onChange={e=>setFiltro(f=>({...f,emp:e.target.value}))}>
          <option value="">Todos empreendimentos</option>
          <option value="null">Institucional</option>
          {emps.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
        </Select>
        <div className="border rounded-lg px-3 py-2 text-sm font-semibold" style={{borderColor:'var(--border)',color:'var(--accent)',background:'var(--bg-card)'}}>
          Total: {brl(total,2)}
        </div>
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{borderColor:'var(--border)'}}>
                {['Data','Descrição','Empreendimento','Categoria','Fornecedor','Valor',''].map(h=>(
                  <th key={h} className="text-left text-xs font-semibold pb-2 pr-4" style={{color:'var(--text-faint)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0 && (
                <tr><td colSpan={7} className="text-center py-8 text-sm italic" style={{color:'var(--text-faint)'}}>Nenhum gasto registrado</td></tr>
              )}
              {filtered.map(g=>(
                <tr key={g.id} className="border-b hover:opacity-80" style={{borderColor:'var(--border)'}}>
                  <td className="py-2.5 pr-4 text-xs" style={{color:'var(--text-faint)'}}>{g.data}</td>
                  <td className="py-2.5 pr-4" style={{color:'var(--text-primary)'}}>{g.descricao}</td>
                  <td className="py-2.5 pr-4 text-xs" style={{color:'var(--text-faint)'}}>{g.empreendimentos?.nome||'Institucional'}</td>
                  <td className="py-2.5 pr-4"><Badge color="gray">{g.categoria}</Badge></td>
                  <td className="py-2.5 pr-4 text-xs" style={{color:'var(--text-faint)'}}>{g.fornecedor||'—'}</td>
                  <td className="py-2.5 pr-4 font-semibold" style={{color:'var(--accent)'}}>{brl(g.valor,2)}</td>
                  <td className="py-2.5">
                    {can('canManageUsers') && (
                      <div className="flex gap-2">
                        <button onClick={()=>openEdit(g)} className="text-xs hover:opacity-70" style={{color:'var(--text-faint)'}}>✎</button>
                        <button onClick={()=>excluir(g.id)} className="text-xs text-red-400 hover:opacity-70">✕</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Editar Gasto':'Novo Gasto'}>
        <div className="flex flex-col gap-3">
          <Input label="Data" type="date" value={form.data} onChange={e=>setForm(f=>({...f,data:e.target.value}))}/>
          <Select label="Empreendimento" value={form.empreendimento_id} onChange={e=>setForm(f=>({...f,empreendimento_id:e.target.value}))}>
            <option value="">Institucional TalenCo</option>
            {emps.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
          </Select>
          <Select label="Categoria" value={form.categoria} onChange={e=>setForm(f=>({...f,categoria:e.target.value}))}>
            {CATS.map(c=><option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Subcategoria" placeholder="Ex: Meta Ads, Gráfica..." value={form.subcategoria} onChange={e=>setForm(f=>({...f,subcategoria:e.target.value}))}/>
          <Input label="Descrição" value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))}/>
          <Input label="Fornecedor" value={form.fornecedor} onChange={e=>setForm(f=>({...f,fornecedor:e.target.value}))}/>
          <Input label="Valor (R$)" type="number" value={form.valor} onChange={e=>setForm(f=>({...f,valor:e.target.value}))}/>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={save}>{editing?'Salvar':'Registrar'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
