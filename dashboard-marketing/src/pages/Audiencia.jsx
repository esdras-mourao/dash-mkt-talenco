import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { supabase } from '../lib/supabase'
import { num, MESES } from '../lib/fmt'
import { Card, PageHeader, StatCard, Btn, Modal, Input, Select } from '../components/UI'

export default function Audiencia() {
  const [dados, setDados] = useState([])
  const [modal, setModal] = useState(false)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [form, setForm] = useState({ data: '', seguidores_instagram: '', seguidores_facebook: '', inscritos_youtube: '', visitas_site: '', alcance_pago_meta: '', alcance_pago_google: '', evento_nome: '', evento_publico: '' })
  const [ultimos, setUltimos] = useState({})

  async function load() {
    const { data } = await supabase.from('audiencia').select('*').eq('ano', ano).order('mes')
    const rows = (data || []).map(r => ({
      mes: MESES[r.mes - 1],
      instagram: r.seguidores_instagram,
      facebook: r.seguidores_facebook,
      youtube: r.inscritos_youtube,
      site: r.visitas_site,
      pagoPaago: (r.alcance_pago_meta || 0) + (r.alcance_pago_google || 0),
      offline: r.evento_publico || 0,
    }))
    setDados(rows)
    if (data?.length) {
      const last = data[data.length - 1]
      setUltimos(last)
    }
  }

  useEffect(() => { load() }, [ano])

  async function save() {
    await supabase.from('audiencia').insert({
      data: form.data,
      seguidores_instagram: Number(form.seguidores_instagram || 0),
      seguidores_facebook: Number(form.seguidores_facebook || 0),
      inscritos_youtube: Number(form.inscritos_youtube || 0),
      visitas_site: Number(form.visitas_site || 0),
      alcance_pago_meta: Number(form.alcance_pago_meta || 0),
      alcance_pago_google: Number(form.alcance_pago_google || 0),
      evento_nome: form.evento_nome || null,
      evento_publico: Number(form.evento_publico || 0),
    })
    await load()
    setModal(false)
  }

  const totalPago = dados.reduce((s, r) => s + r.pagoPaago, 0)
  const totalOffline = dados.reduce((s, r) => s + r.offline, 0)

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <PageHeader title="Audiência & Branding" sub="Tamanho da audiência — orgânico, pago e offline">
        <div className="flex gap-3">
          <Select value={ano} onChange={e => setAno(Number(e.target.value))}>
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
          <Btn onClick={() => setModal(true)}>+ Lançar Mês</Btn>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Instagram" value={num(ultimos.seguidores_instagram)} sub="seguidores" accent="#C6552A" />
        <StatCard label="Facebook" value={num(ultimos.seguidores_facebook)} sub="seguidores" accent="#1A4060" />
        <StatCard label="YouTube" value={num(ultimos.inscritos_youtube)} sub="inscritos" accent="#F2B82A" />
        <StatCard label="Site" value={num(ultimos.visitas_site)} sub="visitas/mês" accent="#D4956A" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Alcance Pago (ano)" value={num(totalPago)} sub="Meta Ads + Google" accent="#4a7c59" />
        <StatCard label="Público Offline (ano)" value={num(totalOffline)} sub="Eventos e ativações" accent="#9a8b7d" />
      </div>

      <Card className="mb-6">
        <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-4">Evolução da Audiência Orgânica</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={dados}>
            <defs>
              {[['ig','#C6552A'],['fb','#1A4060'],['yt','#F2B82A'],['site','#D4956A']].map(([k, c]) => (
                <linearGradient key={k} id={`g_${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={c} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={c} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="mes" tick={{ fill: '#6b5d50', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b5d50', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => num(v)} />
            <Tooltip contentStyle={{ background: '#1e1a16', border: '1px solid #2e2820', borderRadius: 8, fontSize: 12 }} formatter={num} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#9a8b7d' }} />
            <Area type="monotone" dataKey="instagram" stroke="#C6552A" fill="url(#g_ig)" strokeWidth={2} name="Instagram" />
            <Area type="monotone" dataKey="facebook" stroke="#1A4060" fill="url(#g_fb)" strokeWidth={2} name="Facebook" />
            <Area type="monotone" dataKey="youtube" stroke="#F2B82A" fill="url(#g_yt)" strokeWidth={2} name="YouTube" />
            <Area type="monotone" dataKey="site" stroke="#D4956A" fill="url(#g_site)" strokeWidth={2} name="Site" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Lançar Audiência do Mês">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Data" type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
          <div />
          <Input label="Seguidores Instagram" type="number" value={form.seguidores_instagram} onChange={e => setForm(f => ({ ...f, seguidores_instagram: e.target.value }))} />
          <Input label="Seguidores Facebook" type="number" value={form.seguidores_facebook} onChange={e => setForm(f => ({ ...f, seguidores_facebook: e.target.value }))} />
          <Input label="Inscritos YouTube" type="number" value={form.inscritos_youtube} onChange={e => setForm(f => ({ ...f, inscritos_youtube: e.target.value }))} />
          <Input label="Visitas Site" type="number" value={form.visitas_site} onChange={e => setForm(f => ({ ...f, visitas_site: e.target.value }))} />
          <Input label="Alcance Pago Meta" type="number" value={form.alcance_pago_meta} onChange={e => setForm(f => ({ ...f, alcance_pago_meta: e.target.value }))} />
          <Input label="Alcance Pago Google" type="number" value={form.alcance_pago_google} onChange={e => setForm(f => ({ ...f, alcance_pago_google: e.target.value }))} />
          <Input label="Evento (nome)" value={form.evento_nome} onChange={e => setForm(f => ({ ...f, evento_nome: e.target.value }))} />
          <Input label="Público Offline" type="number" value={form.evento_publico} onChange={e => setForm(f => ({ ...f, evento_publico: e.target.value }))} />
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <Btn variant="ghost" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn onClick={save}>Salvar</Btn>
        </div>
      </Modal>
    </div>
  )
}
