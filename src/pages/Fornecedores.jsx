import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageHeader, Badge, Btn, Modal, Input, Select, StatCard } from '../components/UI'
import { useAuth } from '../lib/AuthContext'

const TIPOS = ['grafica','brinde','agencia','midia','servico','outro']
const TIPO_LABEL = { grafica:'Gráfica', brinde:'Brinde', agencia:'Agência', midia:'Mídia', servico:'Serviço', outro:'Outro' }
const TIPO_ICON = { grafica:'🖨', brinde:'🎁', agencia:'📣', midia:'📱', servico:'🔧', outro:'📦' }

export default function Fornecedores() {
  const { can } = useAuth()
  const [fornecedores, setFornecedores] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState('true')
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nome:'', tipo:'grafica', cnpj:'', contato:'', telefone:'', email:'', site:'', observacoes:'', ativo:true })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('fornecedores').select('*').order('nome')
    setFornecedores(data||[])
  }
  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({ nome:'', tipo:'grafica', cnpj:'', contato:'', telefone:'', email:'', site:'', observacoes:'', ativo:true })
    setModal(true)
  }
  function openEdit(f) {
    setEditing(f)
    setForm({ nome:f.nome, tipo:f.tipo, cnpj:f.cnpj||'', contato:f.contato||'', telefone:f.telefone||'', email:f.email||'', site:f.site||'', observacoes:f.observacoes||'', ativo:f.ativo })
    setModal(true)
  }

  async function save() {
    setSaving(true)
    const p = { nome:form.nome, tipo:form.tipo, cnpj:form.cnpj||null, contato:form.contato||null, telefone:form.telefone||null, email:form.email||null, site:form.site||null, observacoes:form.observacoes||null, ativo:form.ativo }
    if (editing) await supabase.from('fornecedores').update(p).eq('id',editing.id)
    else await supabase.from('fornecedores').insert(p)
    await load(); setModal(false); setSaving(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir fornecedor?')) return
    await supabase.from('fornecedores').delete().eq('id',id); await load()
  }

  async function toggleAtivo(f) {
    await supabase.from('fornecedores').update({ativo:!f.ativo}).eq('id',f.id); await load()
  }

  const filtered = fornecedores.filter(f=>
    (!filtroTipo || f.tipo===filtroTipo) &&
    (filtroAtivo==='' || String(f.ativo)===filtroAtivo)
  )

  const porTipo = TIPOS.reduce((acc,t)=>({...acc,[t]:fornecedores.filter(f=>f.tipo===t&&f.ativo).length}),{})

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Fornecedores" sub="Gráficas, brindes, agências e serviços de marketing">
        {can('canManageUsers') && <Btn onClick={openNew}>+ Novo Fornecedor</Btn>}
      </PageHeader>

      {/* Cards por tipo */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {TIPOS.map(t=>(
          <button key={t} onClick={()=>setFiltroTipo(filtroTipo===t?'':t)}
            className="rounded-xl p-3 border text-center transition-all hover:opacity-80"
            style={{
              background: filtroTipo===t ? 'var(--accent)18' : 'var(--bg-card)',
              borderColor: filtroTipo===t ? 'var(--accent)' : 'var(--border)',
            }}>
            <div className="text-xl mb-1">{TIPO_ICON[t]}</div>
            <div className="text-xs font-semibold" style={{color:'var(--text-primary)'}}>{TIPO_LABEL[t]}</div>
            <div className="text-lg font-bold mt-0.5" style={{color:'var(--accent)'}}>{porTipo[t]||0}</div>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap no-print">
        <Select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
        </Select>
        <Select value={filtroAtivo} onChange={e=>setFiltroAtivo(e.target.value)}>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
          <option value="">Todos</option>
        </Select>
        <div className="text-xs self-center" style={{color:'var(--text-faint)'}}>{filtered.length} fornecedor(es)</div>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.length===0 && (
          <Card className="lg:col-span-2">
            <div className="text-center py-8 italic text-sm" style={{color:'var(--text-faint)'}}>Nenhum fornecedor cadastrado</div>
          </Card>
        )}
        {filtered.map(f=>(
          <Card key={f.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <div className="text-2xl shrink-0">{TIPO_ICON[f.tipo]}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm" style={{color:'var(--text-primary)'}}>{f.nome}</span>
                    <Badge color={f.ativo?'green':'gray'}>{TIPO_LABEL[f.tipo]}</Badge>
                  </div>
                  <div className="text-xs space-y-0.5" style={{color:'var(--text-faint)'}}>
                    {f.cnpj && <div>CNPJ: {f.cnpj}</div>}
                    {f.contato && <div>👤 {f.contato}</div>}
                    {f.telefone && <div>📞 <a href={`tel:${f.telefone}`} style={{color:'var(--accent)'}}>{f.telefone}</a></div>}
                    {f.email && <div>✉ <a href={`mailto:${f.email}`} style={{color:'var(--accent)'}}>{f.email}</a></div>}
                    {f.site && <div>🌐 <a href={f.site} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>{f.site}</a></div>}
                    {f.observacoes && <div className="mt-1 pt-1 border-t italic" style={{borderColor:'var(--border)'}}>{f.observacoes}</div>}
                  </div>
                </div>
              </div>
              {can('canManageUsers') && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Btn variant="ghost" onClick={()=>openEdit(f)}>Editar</Btn>
                  <button onClick={()=>toggleAtivo(f)} className="text-xs hover:opacity-70 text-center" style={{color:'var(--text-faint)'}}>
                    {f.ativo?'Desativar':'Ativar'}
                  </button>
                  <button onClick={()=>excluir(f.id)} className="text-xs text-red-400 hover:opacity-70 text-center">Excluir</button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal */}
      <Modal open={modal} onClose={()=>setModal(false)} title={editing?'Editar Fornecedor':'Novo Fornecedor'}>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Nome" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome da empresa"/>
            <Select label="Tipo" value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))}>
              {TIPOS.map(t=><option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="CNPJ" value={form.cnpj} onChange={e=>setForm(f=>({...f,cnpj:e.target.value}))} placeholder="00.000.000/0000-00"/>
            <Input label="Contato" value={form.contato} onChange={e=>setForm(f=>({...f,contato:e.target.value}))} placeholder="Nome do responsável"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefone" value={form.telefone} onChange={e=>setForm(f=>({...f,telefone:e.target.value}))} placeholder="(13) 99999-9999"/>
            <Input label="E-mail" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="contato@empresa.com"/>
          </div>
          <Input label="Site" value={form.site} onChange={e=>setForm(f=>({...f,site:e.target.value}))} placeholder="https://"/>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{color:'var(--text-muted)'}}>Observações</label>
            <textarea value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))} rows={2}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
          </div>
          <Select label="Status" value={form.ativo?'true':'false'} onChange={e=>setForm(f=>({...f,ativo:e.target.value==='true'}))}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </Select>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving?'Salvando...':editing?'Salvar':'Criar'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
