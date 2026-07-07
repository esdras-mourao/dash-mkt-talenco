import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageHeader, Btn, Modal, Input, Select, Badge, StatCard } from '../components/UI'

export default function Usuarios() {
  const [users, setUsers] = useState([])
  const [modal, setModal] = useState(false)
  const [modalEdit, setModalEdit] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'assistente' })
  const [formEdit, setFormEdit] = useState({ name: '', role: 'assistente' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data || [])
  }

  useEffect(() => { load() }, [])

  async function createUser() {
    setSaving(true)
    setError('')
    // Cria usuário via Supabase Auth Admin (requer service role — orientação abaixo)
    // Por ora, cria o profile manualmente após o usuário se registrar
    // Alternativa: usar supabase.auth.signUp e depois criar profile
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { name: form.name } }
    })
    if (err) { setError(err.message); setSaving(false); return }
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        name: form.name,
        role: form.role,
      })
    }
    await load()
    setModal(false)
    setForm({ name: '', email: '', password: '', role: 'assistente' })
    setSaving(false)
  }

  async function updateUser() {
    setSaving(true)
    await supabase.from('profiles').update({ name: formEdit.name, role: formEdit.role }).eq('id', editing.id)
    await load()
    setModalEdit(false)
    setSaving(false)
  }

  function openEdit(u) {
    setEditing(u)
    setFormEdit({ name: u.name, role: u.role })
    setModalEdit(true)
  }

  const admins = users.filter(u => u.role === 'admin').length
  const assistentes = users.filter(u => u.role === 'assistente').length

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <PageHeader title="Gestão de Usuários" sub="Controle de acesso ao dashboard">
        <Btn onClick={() => setModal(true)}>+ Novo Usuário</Btn>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total de Usuários" value={users.length} accent="var(--accent)" />
        <StatCard label="Administradores" value={admins} accent="#C6552A" sub="Acesso total" />
        <StatCard label="Assistentes" value={assistentes} accent="#1A4060" sub="Acesso limitado" />
      </div>

      {/* Níveis de acesso — legenda */}
      <Card className="mb-6">
        <div className="font-display text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Níveis de Acesso</div>
        <div className="grid grid-cols-2 gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div>
            <div className="font-semibold mb-1" style={{ color: '#F2B82A' }}>👑 Administrador</div>
            <ul className="space-y-0.5" style={{ color: 'var(--text-faint)' }}>
              <li>✓ Acesso total a todos os módulos</li>
              <li>✓ Gerenciar usuários</li>
              <li>✓ Configurar empreendimentos</li>
              <li>✓ Registrar vendas e gastos</li>
              <li>✓ Editar orçamento anual</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-1" style={{ color: '#1A4060' }}>👤 Assistente</div>
            <ul className="space-y-0.5" style={{ color: 'var(--text-faint)' }}>
              <li>✓ Visualizar todos os módulos</li>
              <li>✓ Inserir campanhas e KPIs</li>
              <li>✓ Inserir eventos e ativações</li>
              <li>✓ Movimentar brindes</li>
              <li>✗ Sem acesso a vendas, gastos, orçamento</li>
              <li>✗ Sem acesso à gestão de usuários</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Lista de usuários */}
      <Card>
        <div className="flex flex-col gap-2">
          {users.length === 0 && (
            <div className="text-center py-8 text-sm italic" style={{ color: 'var(--text-faint)' }}>
              Nenhum usuário cadastrado
            </div>
          )}
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: u.role === 'admin' ? '#F2B82A22' : '#1A406022', color: u.role === 'admin' ? '#F2B82A' : '#60a5fa' }}>
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{u.name}</div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>{u.id.slice(0, 8)}...</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge color={u.role === 'admin' ? 'yellow' : 'blue'}>{u.role}</Badge>
                <Btn variant="ghost" onClick={() => openEdit(u)}>Editar</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal Novo Usuário */}
      <Modal open={modal} onClose={() => setModal(false)} title="Novo Usuário">
        <div className="flex flex-col gap-3">
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome completo" />
          <Input label="E-mail" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@talenco.com.br" />
          <Input label="Senha inicial" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          <Select label="Nível de acesso" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="assistente">Assistente</option>
            <option value="admin">Administrador</option>
          </Select>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="p-3 rounded-lg text-xs" style={{ background: 'var(--bg-input)', color: 'var(--text-faint)' }}>
            O usuário receberá um e-mail de confirmação do Supabase. Peça para confirmar antes de usar.
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={createUser} disabled={saving}>{saving ? 'Criando...' : 'Criar Usuário'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal open={modalEdit} onClose={() => setModalEdit(false)} title="Editar Usuário">
        <div className="flex flex-col gap-3">
          <Input label="Nome" value={formEdit.name} onChange={e => setFormEdit(f => ({ ...f, name: e.target.value }))} />
          <Select label="Nível de acesso" value={formEdit.role} onChange={e => setFormEdit(f => ({ ...f, role: e.target.value }))}>
            <option value="assistente">Assistente</option>
            <option value="admin">Administrador</option>
          </Select>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModalEdit(false)}>Cancelar</Btn>
            <Btn onClick={updateUser} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
