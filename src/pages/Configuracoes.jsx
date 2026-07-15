import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { Card, PageHeader, Btn, Modal, Input, Select, Badge } from '../components/UI'

const CORES = ['#F2B82A','#C6552A','#1A4060','#4a7c59','#D4956A','#9a8b7d']

export default function Configuracoes() {
  const { can, theme, toggleTheme, profile, user } = useAuth()
  const [emps, setEmps] = useState([])
  const [config, setConfig] = useState({})
  const [users, setUsers] = useState([])
  const [modalEmp, setModalEmp] = useState(false)
  const [modalUser, setModalUser] = useState(false)
  const [modalSenha, setModalSenha] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [formEmp, setFormEmp] = useState({ nome:'', codigo:'', ano_inicio:new Date().getFullYear(), vgv_total:'', cor:'#F2B82A', ativo:true })
  const [formUser, setFormUser] = useState({ name:'', email:'', password:'', role:'assistente' })
  const [formSenha, setFormSenha] = useState({ nova:'', confirma:'' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function load() {
    const [empsR, cfgR, usersR] = await Promise.all([
      supabase.from('empreendimentos').select('*').order('ano_inicio'),
      supabase.from('config_sistema').select('*'),
      supabase.from('profiles').select('*').order('created_at'),
    ])
    setEmps(empsR.data||[])
    setUsers(usersR.data||[])
    const c = {}
    ;(cfgR.data||[]).forEach(r=>{ c[r.chave]=r.valor })
    setConfig(c)
  }

  useEffect(() => { load() }, [])

  async function saveConfig(chave, valor) {
    await supabase.from('config_sistema').upsert({ chave, valor: String(valor) }, { onConflict:'chave' })
    setConfig(c=>({...c,[chave]:String(valor)}))
  }

  // Empreendimentos
  function openNewEmp() { setEditingEmp(null); setFormEmp({ nome:'', codigo:'', ano_inicio:new Date().getFullYear(), vgv_total:'', cor:'#F2B82A', ativo:true }); setModalEmp(true) }
  function openEditEmp(emp) { setEditingEmp(emp); setFormEmp({ nome:emp.nome, codigo:emp.codigo, ano_inicio:emp.ano_inicio, vgv_total:emp.vgv_total||'', cor:emp.cor||'#F2B82A', ativo:emp.ativo }); setModalEmp(true) }
  async function saveEmp() {
    setSaving(true)
    const p = { nome:formEmp.nome, codigo:formEmp.codigo.toLowerCase().replace(/\s/g,''), ano_inicio:Number(formEmp.ano_inicio), vgv_total:Number(formEmp.vgv_total||0), cor:formEmp.cor, ativo:formEmp.ativo }
    if (editingEmp) await supabase.from('empreendimentos').update(p).eq('id',editingEmp.id)
    else await supabase.from('empreendimentos').insert(p)
    await load(); setModalEmp(false); setSaving(false)
  }
  async function toggleEmp(emp) { await supabase.from('empreendimentos').update({ativo:!emp.ativo}).eq('id',emp.id); await load() }

  // Usuários
  async function createUser() {
    setSaving(true); setMsg('')
    const { data, error } = await supabase.auth.signUp({ email:formUser.email, password:formUser.password, options:{data:{name:formUser.name}} })
    if (error) { setMsg(error.message); setSaving(false); return }
    if (data?.user) await supabase.from('profiles').upsert({ id:data.user.id, name:formUser.name, role:formUser.role })
    await load(); setModalUser(false); setSaving(false)
    setFormUser({ name:'', email:'', password:'', role:'assistente' })
  }
  async function updateUser() {
    setSaving(true)
    await supabase.from('profiles').update({ name:formUser.name, role:formUser.role }).eq('id',editingUser.id)
    await load(); setModalUser(false); setSaving(false)
  }
  function openEditUser(u) { setEditingUser(u); setFormUser({ name:u.name, email:'', password:'', role:u.role }); setModalUser(true) }

  // Senha
  async function alterarSenha() {
    if (formSenha.nova !== formSenha.confirma) { setMsg('Senhas não conferem'); return }
    setSaving(true); setMsg('')
    const { error } = await supabase.auth.updateUser({ password: formSenha.nova })
    if (error) setMsg(error.message)
    else { setMsg('Senha alterada com sucesso!'); setFormSenha({nova:'',confirma:''}) }
    setSaving(false)
  }

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Configurações" sub="Empreendimentos, usuários e preferências" />

      {/* APARÊNCIA */}
      <Card className="mb-6">
        <div className="font-display text-base font-bold mb-4" style={{color:'var(--text-primary)'}}>Aparência</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium" style={{color:'var(--text-primary)'}}>{theme==='dark'?'🌙 Tema Escuro':'☀ Tema Claro'}</div>
            <div className="text-xs mt-0.5" style={{color:'var(--text-faint)'}}>Alterne entre modo escuro e claro</div>
          </div>
          <button onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-all ${theme==='light'?'bg-talenco-yellow':'bg-[#3e3028]'}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${theme==='light'?'left-7':'left-1'}`}/>
          </button>
        </div>
      </Card>

      {/* PERFIL */}
      <Card className="mb-6">
        <div className="font-display text-base font-bold mb-4" style={{color:'var(--text-primary)'}}>Meu Perfil</div>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{background:'var(--accent)22',color:'var(--accent)'}}>
            {profile?.name?.charAt(0).toUpperCase()||'U'}
          </div>
          <div>
            <div className="font-semibold" style={{color:'var(--text-primary)'}}>{profile?.name}</div>
            <div className="text-xs" style={{color:'var(--text-faint)'}}>{user?.email} · <span className="capitalize">{profile?.role}</span></div>
          </div>
        </div>
        <Btn variant="ghost" onClick={()=>{ setMsg(''); setModalSenha(true) }}>Alterar Senha</Btn>
      </Card>

      {/* SAVING */}
      {can('canManageUsers') && (
        <Card className="mb-6">
          <div className="font-display text-base font-bold mb-4" style={{color:'var(--text-primary)'}}>Saving de Marketing</div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { chave:'saving_externo_pct', label:'Saving Venda Externa (%)', desc:'Vendas via corretor parceiro' },
              { chave:'saving_interno_pct', label:'Saving Venda Interna (%)', desc:'Vendas diretas / plantonista' },
              { chave:'caixa_marketing_pct', label:'Caixa de Marketing (%)', desc:'Destinado a campanhas e ações' },
            ].map(({chave,label,desc})=>(
              <div key={chave}>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{color:'var(--text-muted)'}}>{label}</label>
                <div className="text-[10px] mb-1.5" style={{color:'var(--text-faint)'}}>{desc}</div>
                <input type="number" step="0.1" value={config[chave]||''} onChange={e=>setConfig(c=>({...c,[chave]:e.target.value}))}
                  onBlur={e=>saveConfig(chave,e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {[
              { chave:'caixa_split_produto', label:'Split Caixa → Produto (%)' },
              { chave:'caixa_split_inst',    label:'Split Caixa → Institucional (%)' },
            ].map(({chave,label})=>(
              <div key={chave}>
                <label className="text-xs font-semibold uppercase tracking-wide block mb-1" style={{color:'var(--text-muted)'}}>{label}</label>
                <input type="number" step="1" value={config[chave]||''} onChange={e=>setConfig(c=>({...c,[chave]:e.target.value}))}
                  onBlur={e=>saveConfig(chave,e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}/>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* EMPREENDIMENTOS */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-base font-bold" style={{color:'var(--text-primary)'}}>Empreendimentos</div>
          {can('canManageEmpreendimentos') && <Btn onClick={openNewEmp}>+ Novo</Btn>}
        </div>
        <div className="flex flex-col gap-2">
          {emps.map(emp=>(
            <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border"
              style={{borderColor:'var(--border)',background:'var(--bg-input)'}}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full shrink-0" style={{background:emp.cor||'#F2B82A'}}/>
                <div>
                  <div className="text-sm font-semibold" style={{color:'var(--text-primary)'}}>{emp.nome}</div>
                  <div className="text-xs" style={{color:'var(--text-faint)'}}>
                    <span className="font-mono">{emp.codigo}</span> · {emp.ano_inicio}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={emp.ativo?'green':'gray'}>{emp.ativo?'Ativo':'Inativo'}</Badge>
                {can('canManageEmpreendimentos') && (
                  <>
                    <Btn variant="ghost" onClick={()=>openEditEmp(emp)}>Editar</Btn>
                    <Btn variant="ghost" onClick={()=>toggleEmp(emp)}>{emp.ativo?'Desativar':'Ativar'}</Btn>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* USUÁRIOS */}
      {can('canManageUsers') && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="font-display text-base font-bold" style={{color:'var(--text-primary)'}}>Gestão de Usuários</div>
            <Btn onClick={()=>{ setEditingUser(null); setFormUser({name:'',email:'',password:'',role:'assistente'}); setMsg(''); setModalUser(true) }}>+ Novo Usuário</Btn>
          </div>
          <div className="mb-4 p-3 rounded-lg text-xs" style={{background:'var(--bg-input)'}}>
            <div className="grid grid-cols-2 gap-4" style={{color:'var(--text-faint)'}}>
              <div><span className="font-bold" style={{color:'var(--accent)'}}>Admin:</span> acesso total, gerencia usuários, configurações, vendas e gastos</div>
              <div><span className="font-bold" style={{color:'#60a5fa'}}>Assistente:</span> insere campanhas, eventos e brindes · não acessa vendas, gastos ou usuários</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {users.map(u=>(
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border"
                style={{borderColor:'var(--border)',background:'var(--bg-input)'}}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{background:u.role==='admin'?'#F2B82A22':'#1A406022',color:u.role==='admin'?'#F2B82A':'#60a5fa'}}>
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-sm font-semibold" style={{color:'var(--text-primary)'}}>{u.name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={u.role==='admin'?'yellow':'blue'}>{u.role}</Badge>
                  <Btn variant="ghost" onClick={()=>openEditUser(u)}>Editar</Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Empreendimento */}
      <Modal open={modalEmp} onClose={()=>setModalEmp(false)} title={editingEmp?'Editar Empreendimento':'Novo Empreendimento'}>
        <div className="flex flex-col gap-3">
          <Input label="Nome" value={formEmp.nome} onChange={e=>setFormEmp(f=>({...f,nome:e.target.value}))} placeholder="Ex: Residencial Marino"/>
          <Input label="Código (slug)" value={formEmp.codigo} onChange={e=>setFormEmp(f=>({...f,codigo:e.target.value}))} placeholder="Ex: marino"/>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ano de Início" type="number" value={formEmp.ano_inicio} onChange={e=>setFormEmp(f=>({...f,ano_inicio:e.target.value}))}/>
            <Input label="VGV Total (R$)" type="number" value={formEmp.vgv_total} onChange={e=>setFormEmp(f=>({...f,vgv_total:e.target.value}))}/>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{color:'var(--text-muted)'}}>Cor</label>
            <div className="flex gap-2 flex-wrap">
              {CORES.map(c=>(
                <button key={c} onClick={()=>setFormEmp(f=>({...f,cor:c}))}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${formEmp.cor===c?'border-white scale-110':'border-transparent'}`}
                  style={{background:c}}/>
              ))}
              <input type="color" value={formEmp.cor} onChange={e=>setFormEmp(f=>({...f,cor:e.target.value}))} className="w-8 h-8 rounded-full cursor-pointer border-0"/>
            </div>
          </div>
          <Select label="Status" value={formEmp.ativo?'true':'false'} onChange={e=>setFormEmp(f=>({...f,ativo:e.target.value==='true'}))}>
            <option value="true">Ativo</option><option value="false">Inativo</option>
          </Select>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModalEmp(false)}>Cancelar</Btn>
            <Btn onClick={saveEmp} disabled={saving}>{saving?'Salvando...':editingEmp?'Salvar':'Criar'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Usuário */}
      <Modal open={modalUser} onClose={()=>setModalUser(false)} title={editingUser?'Editar Usuário':'Novo Usuário'}>
        <div className="flex flex-col gap-3">
          <Input label="Nome" value={formUser.name} onChange={e=>setFormUser(f=>({...f,name:e.target.value}))} placeholder="Nome completo"/>
          {!editingUser && <>
            <Input label="E-mail" type="email" value={formUser.email} onChange={e=>setFormUser(f=>({...f,email:e.target.value}))} placeholder="email@talenco.com.br"/>
            <Input label="Senha inicial" type="password" value={formUser.password} onChange={e=>setFormUser(f=>({...f,password:e.target.value}))} placeholder="Mínimo 6 caracteres"/>
          </>}
          <Select label="Nível de acesso" value={formUser.role} onChange={e=>setFormUser(f=>({...f,role:e.target.value}))}>
            <option value="assistente">Assistente</option>
            <option value="admin">Administrador</option>
          </Select>
          {msg && <p className="text-xs text-red-400">{msg}</p>}
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModalUser(false)}>Cancelar</Btn>
            <Btn onClick={editingUser?updateUser:createUser} disabled={saving}>{saving?'Salvando...':editingUser?'Salvar':'Criar'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Senha */}
      <Modal open={modalSenha} onClose={()=>setModalSenha(false)} title="Alterar Senha">
        <div className="flex flex-col gap-3">
          <Input label="Nova senha" type="password" value={formSenha.nova} onChange={e=>setFormSenha(f=>({...f,nova:e.target.value}))} placeholder="Mínimo 6 caracteres"/>
          <Input label="Confirmar senha" type="password" value={formSenha.confirma} onChange={e=>setFormSenha(f=>({...f,confirma:e.target.value}))} placeholder="Repita a nova senha"/>
          {msg && <p className={`text-xs ${msg.includes('sucesso')?'text-green-400':'text-red-400'}`}>{msg}</p>}
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModalSenha(false)}>Cancelar</Btn>
            <Btn onClick={alterarSenha} disabled={saving}>{saving?'Salvando...':'Alterar Senha'}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
