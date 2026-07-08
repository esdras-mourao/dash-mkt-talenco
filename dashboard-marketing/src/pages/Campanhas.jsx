import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num, pct, MESES } from '../lib/fmt'
import { Card, PageHeader, Badge, Btn, Modal, Input, Select, StatCard, EmptyState } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { useAuth } from '../lib/AuthContext'

const PLATAFORMAS = ['meta','google','youtube','tiktok','organico','offline']
const STATUS_COLOR = { ativa:'green', pausada:'yellow', encerrada:'gray' }
const ETAPAS = ['see','think','do','care']

export default function Campanhas() {
  const { can } = useAuth()
  const [campanhas, setCampanhas] = useState([])
  const [emps, setEmps] = useState([])
  const [selected, setSelected] = useState(null)
  const [kpis, setKpis] = useState([])
  const [tab, setTab] = useState('planejamento') // planejamento | kpis | safra
  const [modalCamp, setModalCamp] = useState(false)
  const [modalKpi, setModalKpi] = useState(false)
  const [form, setForm] = useState({
    nome:'', empreendimento_id:'', plataforma:'meta', status:'ativa',
    data_inicio:'', data_fim_planejada:'', investimento_planejado:'',
    meta_campaign_id:'', trilha:'', funil_etapa:'think',
    objetivo_smart:'', meta_leads:'', meta_cpl:'',
    meta_impressoes:'', meta_investimento:'', observacoes:''
  })
  const [kpiForm, setKpiForm] = useState({
    data:'', investimento:'', impressoes:'', alcance:'', cliques:'',
    leads:'', leads_qualificados:'', visitas_stand:'', reservas:'', vendas:''
  })
  const [safraData, setSafraData] = useState([])

  async function load() {
    const [campR, empsR] = await Promise.all([
      supabase.from('campanhas').select('*, empreendimentos(nome,codigo)').order('data_inicio',{ascending:false}),
      supabase.from('empreendimentos').select('*').eq('ativo',true),
    ])
    setCampanhas(campR.data||[])
    setEmps(empsR.data||[])
    if ((campR.data||[]).length && !selected) setSelected((campR.data||[])[0])
  }

  async function loadKpis(campId) {
    const { data } = await supabase.from('kpis_campanha').select('*').eq('campanha_id',campId).order('data')
    setKpis(data||[])
    // safra: agrupa por semana
    const safra = (data||[]).map((r,i) => ({
      periodo: `S${i+1}`,
      leads: r.leads,
      investimento: Number(r.investimento),
      cpl: r.leads>0 ? Number(r.investimento)/r.leads : 0,
      reservas: r.reservas,
    }))
    setSafraData(safra)
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadKpis(selected.id) }, [selected])

  async function saveCamp() {
    const payload = {
      nome: form.nome,
      empreendimento_id: form.empreendimento_id ? Number(form.empreendimento_id) : null,
      plataforma: form.plataforma,
      status: form.status,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim_planejada || null,
      data_fim_planejada: form.data_fim_planejada || null,
      investimento_planejado: Number(form.investimento_planejado||0),
      meta_campaign_id: form.meta_campaign_id || null,
      trilha: form.trilha || null,
      funil_etapa: form.funil_etapa || null,
      objetivo_smart: form.objetivo_smart || null,
      meta_leads: Number(form.meta_leads||0),
      meta_cpl: Number(form.meta_cpl||0),
      meta_impressoes: Number(form.meta_impressoes||0),
      meta_investimento: Number(form.meta_investimento||0),
      observacoes: form.observacoes || null,
    }
    await supabase.from('campanhas').insert(payload)
    await load(); setModalCamp(false)
  }

  async function deleteCamp(id) {
    if (!confirm('Excluir campanha e todos os KPIs?')) return
    await supabase.from('kpis_campanha').delete().eq('campanha_id',id)
    await supabase.from('campanhas').delete().eq('id',id)
    setSelected(null); await load()
  }

  async function saveKpi() {
    await supabase.from('kpis_campanha').insert({
      campanha_id: selected.id,
      data: kpiForm.data,
      investimento: Number(kpiForm.investimento||0),
      impressoes: Number(kpiForm.impressoes||0),
      alcance: Number(kpiForm.alcance||0),
      cliques: Number(kpiForm.cliques||0),
      leads: Number(kpiForm.leads||0),
      leads_qualificados: Number(kpiForm.leads_qualificados||0),
      visitas_stand: Number(kpiForm.visitas_stand||0),
      reservas: Number(kpiForm.reservas||0),
      vendas: Number(kpiForm.vendas||0),
    })
    await loadKpis(selected.id); setModalKpi(false)
    setKpiForm({data:'',investimento:'',impressoes:'',alcance:'',cliques:'',leads:'',leads_qualificados:'',visitas_stand:'',reservas:'',vendas:''})
  }

  // Totais KPIs
  const totInvest = kpis.reduce((s,r)=>s+Number(r.investimento),0)
  const totLeads = kpis.reduce((s,r)=>s+r.leads,0)
  const totReservas = kpis.reduce((s,r)=>s+r.reservas,0)
  const totImp = kpis.reduce((s,r)=>s+r.impressoes,0)
  const cpl = totLeads>0 ? totInvest/totLeads : 0
  const txConv = totLeads>0 ? totReservas/totLeads : 0

  // Atingimento de metas
  const pctLeads = selected?.meta_leads>0 ? Math.min(totLeads/selected.meta_leads*100,100) : 0
  const pctInvest = selected?.meta_investimento>0 ? Math.min(totInvest/selected.meta_investimento*100,100) : 0

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Lista */}
      <div className="w-64 shrink-0 border-r overflow-y-auto p-4 flex flex-col gap-2"
        style={{borderColor:'var(--border)',background:'var(--sidebar-bg)'}}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--text-faint)'}}>Campanhas</span>
          {can('canAddCampanhas') && (
            <button onClick={()=>setModalCamp(true)} className="text-talenco-yellow text-lg leading-none hover:opacity-70">+</button>
          )}
        </div>
        {campanhas.map(c => (
          <button key={c.id} onClick={()=>setSelected(c)}
            className={`text-left p-3 rounded-lg border transition-all ${selected?.id===c.id?'border-talenco-yellow/30':'hover:opacity-80'}`}
            style={{
              background: selected?.id===c.id ? 'var(--accent)1a' : 'var(--bg-card)',
              borderColor: selected?.id===c.id ? 'var(--accent)' : 'var(--border)'
            }}>
            <div className="flex items-center gap-2 mb-1">
              {c.trilha && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{background:'var(--accent)',color:'var(--bg-base)'}}>T{c.trilha}</span>}
              <span className="text-xs font-semibold truncate" style={{color:'var(--text-primary)'}}>{c.nome}</span>
            </div>
            <div className="text-[10px] capitalize" style={{color:'var(--text-faint)'}}>{c.plataforma} · {c.empreendimentos?.nome||'Institucional'}</div>
            <div className="mt-1"><Badge color={STATUS_COLOR[c.status]}>{c.status}</Badge></div>
          </button>
        ))}
      </div>

      {/* Detalhe */}
      <div className="flex-1 overflow-y-auto p-8">
        {!selected ? <EmptyState icon="◉" title="Selecione uma campanha" sub="ou crie uma nova" /> : (
          <>
            <PageHeader title={selected.nome}
              sub={`${selected.plataforma} · ${selected.empreendimentos?.nome||'Institucional'} ${selected.meta_campaign_id ? '· ID Meta: '+selected.meta_campaign_id : ''}`}>
              <div className="flex gap-2">
                {can('canAddCampanhas') && <Btn onClick={()=>setModalKpi(true)}>+ KPIs</Btn>}
                {can('canManageUsers') && <Btn variant="danger" onClick={()=>deleteCamp(selected.id)}>Excluir</Btn>}
              </div>
            </PageHeader>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b" style={{borderColor:'var(--border)'}}>
              {['planejamento','kpis','safra'].map(t=>(
                <button key={t} onClick={()=>setTab(t)}
                  className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 -mb-px transition-all ${tab===t?'border-talenco-yellow text-talenco-yellow':'border-transparent'}`}
                  style={{color: tab===t ? 'var(--accent)' : 'var(--text-faint)'}}>
                  {t==='planejamento'?'Planejamento':t==='kpis'?'KPIs & Funil':'Visão Safra'}
                </button>
              ))}
            </div>

            {/* PLANEJAMENTO */}
            {tab==='planejamento' && (
              <div className="space-y-4">
                {selected.objetivo_smart && (
                  <Card>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{color:'var(--text-faint)'}}>Objetivo SMART</div>
                    <p className="text-sm" style={{color:'var(--text-primary)'}}>{selected.objetivo_smart}</p>
                  </Card>
                )}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Investimento Meta" value={brl(selected.meta_investimento)} accent="var(--accent)" />
                  <StatCard label="Leads Meta" value={num(selected.meta_leads)} accent="#C6552A" />
                  <StatCard label="CPL Meta" value={brl(selected.meta_cpl,2)} accent="#1A4060" />
                  <StatCard label="Impressões Meta" value={num(selected.meta_impressoes)} accent="#D4956A" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{color:'var(--text-faint)'}}>Atingimento de Metas</div>
                    <div className="space-y-3">
                      {[
                        {label:'Leads', atual:totLeads, meta:selected.meta_leads, pct:pctLeads},
                        {label:'Investimento', atual:brl(totInvest), meta:brl(selected.meta_investimento||0), pct:pctInvest},
                      ].map(({label,atual,meta,pct:p})=>(
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1" style={{color:'var(--text-muted)'}}>
                            <span>{label}</span><span>{p.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 rounded-full overflow-hidden" style={{background:'var(--bg-input)'}}>
                            <div className="h-full rounded-full transition-all" style={{width:`${p}%`, background: p>=100?'#4ade80':'var(--accent)'}} />
                          </div>
                          <div className="flex justify-between text-[10px] mt-0.5" style={{color:'var(--text-faint)'}}>
                            <span>Atual: {atual}</span><span>Meta: {meta}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{color:'var(--text-faint)'}}>Configuração</div>
                    <div className="space-y-1.5 text-xs" style={{color:'var(--text-muted)'}}>
                      <div className="flex justify-between"><span>Funil</span><span className="uppercase font-semibold">{selected.funil_etapa||'—'}</span></div>
                      <div className="flex justify-between"><span>Trilha</span><span className="font-semibold">{selected.trilha?`Trilha ${selected.trilha}`:'—'}</span></div>
                      <div className="flex justify-between"><span>Início</span><span>{selected.data_inicio?.slice(0,10)||'—'}</span></div>
                      <div className="flex justify-between"><span>Fim Planejado</span><span>{selected.data_fim_planejada||'—'}</span></div>
                      {selected.meta_campaign_id && <div className="flex justify-between"><span>ID Meta</span><span className="font-mono">{selected.meta_campaign_id}</span></div>}
                    </div>
                    {selected.observacoes && <p className="text-xs mt-3 pt-3 border-t" style={{color:'var(--text-faint)',borderColor:'var(--border)'}}>{selected.observacoes}</p>}
                  </Card>
                </div>
              </div>
            )}

            {/* KPIs */}
            {tab==='kpis' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <StatCard label="Investimento Real" value={brl(totInvest)} accent="var(--accent)" />
                  <StatCard label="Impressões" value={num(totImp)} accent="#1A4060" />
                  <StatCard label="Leads" value={num(totLeads)} sub={`CPL ${brl(cpl,2)}`} accent="#C6552A" />
                  <StatCard label="Reservas" value={num(totReservas)} sub={`Conv. ${pct(txConv)}`} accent="#D4956A" />
                </div>
                {kpis.length>0 && (
                  <Card>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Funil de Marketing e Vendas</div>
                    <div className="flex flex-col gap-1.5">
                      {[
                        {label:'Impressões', val:totImp, color:'#1A4060'},
                        {label:'Cliques', val:kpis.reduce((s,r)=>s+r.cliques,0), color:'#F2B82A'},
                        {label:'Leads', val:totLeads, color:'#C6552A'},
                        {label:'Leads Qualificados', val:kpis.reduce((s,r)=>s+r.leads_qualificados,0), color:'#D4956A'},
                        {label:'Visitas ao Stand', val:kpis.reduce((s,r)=>s+r.visitas_stand,0), color:'#9a8b7d'},
                        {label:'Reservas', val:totReservas, color:'#4a7c59'},
                        {label:'Vendas', val:kpis.reduce((s,r)=>s+r.vendas,0), color:'#F7F3EE'},
                      ].map(({label,val,color})=>{
                        const w=Math.max((val/(totImp||1))*100,val>0?2:0)
                        return (
                          <div key={label} className="flex items-center gap-3 text-xs">
                            <div className="w-28 text-right shrink-0" style={{color:'var(--text-faint)'}}>{label}</div>
                            <div className="flex-1 h-5 rounded-full overflow-hidden" style={{background:'var(--bg-input)'}}>
                              <div className="h-full rounded-full flex items-center px-2" style={{width:`${w}%`,background:color,minWidth:val>0?'40px':'0'}}>
                                <span className="text-[10px] font-bold text-[#130f0c] whitespace-nowrap">{num(val)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* SAFRA */}
            {tab==='safra' && (
              <div className="space-y-4">
                <Card>
                  <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Visão Safra — Investimento × Leads × CPL</div>
                  {safraData.length===0 ? <EmptyState icon="📊" title="Sem dados de KPI" sub="Lance KPIs para ver a visão safra" /> : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={safraData}>
                        <XAxis dataKey="periodo" tick={{fill:'var(--text-faint)',fontSize:11}} axisLine={false} tickLine={false}/>
                        <YAxis yAxisId="l" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false}/>
                        <YAxis yAxisId="r" orientation="right" tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>brl(v)}/>
                        <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}}/>
                        <Legend wrapperStyle={{fontSize:12,color:'var(--text-faint)'}}/>
                        <Bar yAxisId="l" dataKey="leads" fill="#C6552A" name="Leads" radius={[3,3,0,0]}/>
                        <Bar yAxisId="r" dataKey="investimento" fill="#F2B82A" name="Investimento" radius={[3,3,0,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                {safraData.length>0 && (
                  <Card>
                    <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Evolução do CPL</div>
                    <ResponsiveContainer width="100%" height={160}>
                      <LineChart data={safraData}>
                        <XAxis dataKey="periodo" tick={{fill:'var(--text-faint)',fontSize:11}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>brl(v,0)}/>
                        <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} formatter={v=>[brl(v,2),'CPL']}/>
                        <Line type="monotone" dataKey="cpl" stroke="#D4956A" strokeWidth={2} dot={{fill:'#D4956A'}} name="CPL"/>
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Nova Campanha */}
      <Modal open={modalCamp} onClose={()=>setModalCamp(false)} title="Nova Campanha">
        <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Nome da Campanha" value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Empreendimento" value={form.empreendimento_id} onChange={e=>setForm(f=>({...f,empreendimento_id:e.target.value}))}>
              <option value="">Institucional</option>
              {emps.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
            </Select>
            <Select label="Plataforma" value={form.plataforma} onChange={e=>setForm(f=>({...f,plataforma:e.target.value}))}>
              {PLATAFORMAS.map(p=><option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Trilha" value={form.trilha} onChange={e=>setForm(f=>({...f,trilha:e.target.value}))}>
              <option value="">Sem trilha</option>
              <option value="A">Trilha A — Investidor SCP</option>
              <option value="B">Trilha B — Cliente Final</option>
              <option value="C">Trilha C — Corretor Parceiro</option>
            </Select>
            <Select label="Etapa do Funil" value={form.funil_etapa} onChange={e=>setForm(f=>({...f,funil_etapa:e.target.value}))}>
              {ETAPAS.map(e=><option key={e} value={e}>{e.toUpperCase()}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Data Início" type="date" value={form.data_inicio} onChange={e=>setForm(f=>({...f,data_inicio:e.target.value}))}/>
            <Input label="Data Fim Planejada" type="date" value={form.data_fim_planejada} onChange={e=>setForm(f=>({...f,data_fim_planejada:e.target.value}))}/>
          </div>
          <div className="border-t pt-3 mt-1" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{color:'var(--text-faint)'}}>Objetivo SMART</div>
            <textarea value={form.objetivo_smart} onChange={e=>setForm(f=>({...f,objetivo_smart:e.target.value}))}
              placeholder="Gerar X leads qualificados a CPL ≤ R$Y entre DD/MM e DD/MM..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
              style={{background:'var(--bg-input)',borderColor:'var(--border-input)',color:'var(--text-primary)'}}
              rows={3}/>
          </div>
          <div className="border-t pt-3" style={{borderColor:'var(--border)'}}>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{color:'var(--text-faint)'}}>Metas / KPIs Planejados</div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Investimento Planejado (R$)" type="number" value={form.meta_investimento} onChange={e=>setForm(f=>({...f,meta_investimento:e.target.value,investimento_planejado:e.target.value}))}/>
              <Input label="Leads Meta" type="number" value={form.meta_leads} onChange={e=>setForm(f=>({...f,meta_leads:e.target.value}))}/>
              <Input label="CPL Meta (R$)" type="number" value={form.meta_cpl} onChange={e=>setForm(f=>({...f,meta_cpl:e.target.value}))}/>
              <Input label="Impressões Meta" type="number" value={form.meta_impressoes} onChange={e=>setForm(f=>({...f,meta_impressoes:e.target.value}))}/>
            </div>
          </div>
          <Input label="ID Campanha Meta Ads (opcional)" placeholder="ex: 120232329340420571" value={form.meta_campaign_id} onChange={e=>setForm(f=>({...f,meta_campaign_id:e.target.value}))}/>
          <Input label="Observações" value={form.observacoes} onChange={e=>setForm(f=>({...f,observacoes:e.target.value}))}/>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={()=>setModalCamp(false)}>Cancelar</Btn>
            <Btn onClick={saveCamp}>Criar Campanha</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal KPI */}
      <Modal open={modalKpi} onClose={()=>setModalKpi(false)} title="Lançar KPIs">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={kpiForm.data} onChange={e=>setKpiForm(f=>({...f,data:e.target.value}))}/>
          <Input label="Investimento (R$)" type="number" value={kpiForm.investimento} onChange={e=>setKpiForm(f=>({...f,investimento:e.target.value}))}/>
          <Input label="Impressões" type="number" value={kpiForm.impressoes} onChange={e=>setKpiForm(f=>({...f,impressoes:e.target.value}))}/>
          <Input label="Alcance" type="number" value={kpiForm.alcance} onChange={e=>setKpiForm(f=>({...f,alcance:e.target.value}))}/>
          <Input label="Cliques" type="number" value={kpiForm.cliques} onChange={e=>setKpiForm(f=>({...f,cliques:e.target.value}))}/>
          <Input label="Leads" type="number" value={kpiForm.leads} onChange={e=>setKpiForm(f=>({...f,leads:e.target.value}))}/>
          <Input label="Leads Qualificados" type="number" value={kpiForm.leads_qualificados} onChange={e=>setKpiForm(f=>({...f,leads_qualificados:e.target.value}))}/>
          <Input label="Visitas ao Stand" type="number" value={kpiForm.visitas_stand} onChange={e=>setKpiForm(f=>({...f,visitas_stand:e.target.value}))}/>
          <Input label="Reservas" type="number" value={kpiForm.reservas} onChange={e=>setKpiForm(f=>({...f,reservas:e.target.value}))}/>
          <Input label="Vendas" type="number" value={kpiForm.vendas} onChange={e=>setKpiForm(f=>({...f,vendas:e.target.value}))}/>
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Btn variant="ghost" onClick={()=>setModalKpi(false)}>Cancelar</Btn>
          <Btn onClick={saveKpi}>Salvar KPIs</Btn>
        </div>
      </Modal>
    </div>
  )
}
