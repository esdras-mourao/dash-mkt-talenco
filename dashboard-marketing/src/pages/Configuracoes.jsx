import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { Card, PageHeader, Btn, Modal, Input, Select, Badge } from '../components/UI'

const CORES = [
  { label: 'Amarelo TalenCo', value: '#F2B82A' },
  { label: 'Terracota',       value: '#C6552A' },
  { label: 'Oceano',          value: '#1A4060' },
  { label: 'Verde',           value: '#4a7c59' },
  { label: 'Cobre',           value: '#D4956A' },
]

export default function Configuracoes() {
  const { can, theme, toggleTheme } = useAuth()
  const [emps, setEmps] = useState([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ nome: '', codigo: '', ano_inicio: new Date().getFullYear(), vgv_total: '', cor: '#F2B82A', ativo: true })
  const [saving, setSaving] = useState(false)

  async function load() {
    const { data } = await supabase.from('empreendimentos').select('*').order('ano_inicio')
    setEmps(data || [])
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setEditing(null)
    setForm({ nome: '', codigo: '', ano_inicio: new Date().getFullYear(), vgv_total: '', cor: '#F2B82A', ativo: true })
    setModal(true)
  }

  function openEdit(emp) {
    setEditing(emp)
    setForm({ nome: emp.nome, codigo: emp.codigo, ano_inicio: emp.ano_inicio, vgv_total: emp.vgv_total || '', cor: emp.cor || '#F2B82A', ativo: emp.ativo })
    setModal(true)
  }

  async function save() {
    setSaving(true)
    const payload = { nome: form.nome, codigo: form.codigo.toLowerCase().replace(/\s/g,''), ano_inicio: Number(form.ano_inicio), vgv_total: Number(form.vgv_total || 0), cor: form.cor, ativo: form.ativo }
    if (editing) {
      await supabase.from('empreendimentos').update(payload).eq('id', editing.id)
    } else {
      await supabase.from('empreendimentos').insert(payload)
    }
    await load()
    setModal(false)
    setSaving(false)
  }

  async function toggleAtivo(emp) {
    await supabase.from('empreendimentos').update({ ativo: !emp.ativo }).eq('id', emp.id)
    await load()
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
      <PageHeader title="Configurações" sub="Empreendimentos e preferências do sistema" />

      {/* Tema */}
      <Card className="mb-6">
        <div className="font-display text-base font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Aparência</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {theme === 'dark' ? '🌙 Tema Escuro' : '☀ Tema Claro'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
              Alterne entre o modo escuro e claro
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-all ${theme === 'light' ? 'bg-talenco-yellow' : 'bg-[#3e3028]'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${theme === 'light' ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </Card>

      {/* Empreendimentos */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>Empreendimentos</div>
          {can('canManageEmpreendimentos') && (
            <Btn onClick={openNew}>+ Novo Empreendimento</Btn>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {emps.map(emp => (
            <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shrink-0" style={{ background: emp.cor || '#F2B82A' }} />
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.nome}</div>
                  <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    código: <span className="font-mono">{emp.codigo}</span> · início: {emp.ano_inicio}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={emp.ativo ? 'green' : 'gray'}>{emp.ativo ? 'Ativo' : 'Inativo'}</Badge>
                {can('canManageEmpreendimentos') && (
                  <>
                    <Btn variant="ghost" onClick={() => openEdit(emp)}>Editar</Btn>
                    <Btn variant="ghost" onClick={() => toggleAtivo(emp)}>
                      {emp.ativo ? 'Desativar' : 'Ativar'}
                    </Btn>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Empreendimento' : 'Novo Empreendimento'}>
        <div className="flex flex-col gap-3">
          <Input label="Nome" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Residencial Marino" />
          <Input label="Código (slug)" value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Ex: marino" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ano de Início" type="number" value={form.ano_inicio} onChange={e => setForm(f => ({ ...f, ano_inicio: e.target.value }))} />
            <Input label="VGV Total (R$)" type="number" value={form.vgv_total} onChange={e => setForm(f => ({ ...f, vgv_total: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(c => (
                <button key={c.value} onClick={() => setForm(f => ({ ...f, cor: c.value }))}
                  title={c.label}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${form.cor === c.value ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ background: c.value }} />
              ))}
              <input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                className="w-8 h-8 rounded-full cursor-pointer border-0 bg-transparent" title="Cor personalizada" />
            </div>
          </div>
          <Select label="Status" value={form.ativo ? 'true' : 'false'} onChange={e => setForm(f => ({ ...f, ativo: e.target.value === 'true' }))}>
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </Select>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
