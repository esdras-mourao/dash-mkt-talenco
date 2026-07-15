import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, MESES } from '../lib/fmt'
import { Card, PageHeader, StatCard, Select, Badge, DateFilter, ExportBtn } from '../components/UI'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts'

export default function Balanco() {
  const [ano, setAno] = useState(new Date().getFullYear())
  const [dados, setDados] = useState([])
  const [config, setConfig] = useState({ saving_externo_pct:2.0, saving_interno_pct:1.5, caixa_marketing_pct:1.0 })
  const [totais, setTotais] = useState({ vgv:0, saving:0, caixa:0, custos:0, resultado:0 })

  async function load() {
    const [bR, cR] = await Promise.all([
      supabase.from('vw_balanco_mensal').select('*').eq('ano', ano),
      supabase.from('config_sistema').select('*'),
    ])
    const cfg = {}
    ;(cR.data||[]).forEach(r => { cfg[r.chave] = parseFloat(r.valor) })
    setConfig({ ...config, ...cfg })

    // Agrupar por mês (soma de todos empreendimentos)
    const byMes = Array.from({length:12},(_,i)=>{
      const m = i+1
      const rows = (bR.data||[]).filter(r=>r.mes===m)
      const vgv = rows.reduce((s,r)=>s+Number(r.vgv_total||0),0)
      const vgv_ext = rows.reduce((s,r)=>s+Number(r.vgv_externo||0),0)
      const vgv_int = rows.reduce((s,r)=>s+Number(r.vgv_interno||0),0)
      const saving = vgv_ext*(cfg.saving_externo_pct||2)/100 + vgv_int*(cfg.saving_interno_pct||1.5)/100
      const caixa = vgv*(cfg.caixa_marketing_pct||1)/100
      const custos = rows.reduce((s,r)=>s+Number(r.total_custos||0),0)
      const midia = rows.reduce((s,r)=>s+Number(r.custo_midia||0),0)
      const eventos = rows.reduce((s,r)=>s+Number(r.custo_eventos||0),0)
      const ferramentas = rows.reduce((s,r)=>s+Number(r.custo_ferramentas||0),0)
      const pessoas = rows.reduce((s,r)=>s+Number(r.custo_pessoas||0),0)
      return { mes:MESES[i], vgv, saving, caixa, custos, midia, eventos, ferramentas, pessoas, resultado: saving-custos }
    })
    setDados(byMes)
    setTotais({
      vgv: byMes.reduce((s,r)=>s+r.vgv,0),
      saving: byMes.reduce((s,r)=>s+r.saving,0),
      caixa: byMes.reduce((s,r)=>s+r.caixa,0),
      custos: byMes.reduce((s,r)=>s+r.custos,0),
      resultado: byMes.reduce((s,r)=>s+r.resultado,0),
    })
  }

  useEffect(() => { load() }, [ano])

  return (
    <div className="flex-1 p-8 overflow-y-auto" style={{background:'var(--bg-base)'}}>
      <PageHeader title="Balanço de Marketing" sub="Receitas, saving, caixa e custos por mês">
        <div className="flex gap-2 items-center no-print">
          <Select value={ano} onChange={e=>setAno(Number(e.target.value))}>
          {[2024,2025,2026].map(a=><option key={a} value={a}>{a}</option>)}
          </Select>
          <ExportBtn/>
        </div>
      </PageHeader>
      <div className="flex justify-end mb-4 no-print">
        <button onClick={()=>{ const t=document.title; document.title="Balanco — TalenCo Marketing"; window.print(); document.title=t; }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80"
          style={{background:'var(--bg-input)',color:'var(--text-primary)',border:'1px solid var(--border)'}}>
          ⬇ Exportar PDF
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="VGV Total" value={brl(totais.vgv)} sub="Vendas com corretor" accent="var(--accent)"/>
        <StatCard label="Saving Total" value={brl(totais.saving)} sub={`Ext ${config.saving_externo_pct}% · Int ${config.saving_interno_pct}%`} accent="#C6552A"/>
        <StatCard label="Caixa Marketing" value={brl(totais.caixa)} sub={`${config.caixa_marketing_pct}% do VGV`} accent="#D4956A"/>
        <StatCard label="Custos Totais" value={brl(totais.custos)} accent="#6b5d50"/>
        <StatCard label="Resultado" value={brl(totais.resultado)} accent={totais.resultado>=0?'#4a7c59':'#ef4444'}
          sub={totais.resultado>=0?'Saving > Custos':'Custos > Saving'}/>
      </div>

      {/* Gráfico principal */}
      <Card className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Saving vs Custos por Mês</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={dados}>
            <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
            <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} formatter={v=>brl(v,2)}/>
            <Legend wrapperStyle={{fontSize:12,color:'var(--text-faint)'}}/>
            <Bar dataKey="saving" fill="#C6552A" name="Saving (2%)" radius={[3,3,0,0]}/>
            <Bar dataKey="caixa" fill="#F2B82A" name="Caixa Marketing (1%)" radius={[3,3,0,0]}/>
            <Bar dataKey="custos" fill="#1A4060" name="Custos" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Resultado líquido */}
      <Card className="mb-6">
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Resultado Mensal (Saving − Custos)</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={dados}>
            <XAxis dataKey="mes" tick={{fill:'var(--text-faint)',fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'var(--text-faint)',fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`}/>
            <Tooltip contentStyle={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:8,fontSize:12}} formatter={v=>[brl(v,2),'Resultado']}/>
            <Line type="monotone" dataKey="resultado" stroke="#4a7c59" strokeWidth={2} dot={{fill:'#4a7c59'}} name="Resultado"/>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabela detalhada */}
      <Card>
        <div className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--text-faint)'}}>Detalhamento Mensal</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b" style={{borderColor:'var(--border)'}}>
                {['Mês','VGV','Saving','Caixa Mkt','Mídia','Eventos','Ferramentas','Pessoas','Total Custos','Resultado'].map(h=>(
                  <th key={h} className="text-right pb-2 px-2 font-semibold first:text-left" style={{color:'var(--text-faint)'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.map((r,i)=>(
                <tr key={i} className="border-b" style={{borderColor:'var(--border)'}}>
                  <td className="py-2 px-2 font-semibold" style={{color:'var(--text-primary)'}}>{r.mes}</td>
                  <td className="py-2 px-2 text-right" style={{color:'var(--text-muted)'}}>{r.vgv>0?brl(r.vgv):'—'}</td>
                  <td className="py-2 px-2 text-right text-[#C6552A] font-semibold">{r.saving>0?brl(r.saving):'—'}</td>
                  <td className="py-2 px-2 text-right" style={{color:'var(--accent)'}}>{r.caixa>0?brl(r.caixa):'—'}</td>
                  <td className="py-2 px-2 text-right" style={{color:'var(--text-muted)'}}>{r.midia>0?brl(r.midia):'—'}</td>
                  <td className="py-2 px-2 text-right" style={{color:'var(--text-muted)'}}>{r.eventos>0?brl(r.eventos):'—'}</td>
                  <td className="py-2 px-2 text-right" style={{color:'var(--text-muted)'}}>{r.ferramentas>0?brl(r.ferramentas):'—'}</td>
                  <td className="py-2 px-2 text-right" style={{color:'var(--text-muted)'}}>{r.pessoas>0?brl(r.pessoas):'—'}</td>
                  <td className="py-2 px-2 text-right font-semibold" style={{color:'#1A4060'}}>{r.custos>0?brl(r.custos):'—'}</td>
                  <td className="py-2 px-2 text-right font-bold" style={{color:r.resultado>=0?'#4a7c59':'#ef4444'}}>{r.saving>0||r.custos>0?brl(r.resultado):'—'}</td>
                </tr>
              ))}
              <tr style={{background:'var(--bg-input)'}}>
                <td className="py-2 px-2 font-bold" style={{color:'var(--text-primary)'}}>TOTAL</td>
                <td className="py-2 px-2 text-right font-bold" style={{color:'var(--text-primary)'}}>{brl(totais.vgv)}</td>
                <td className="py-2 px-2 text-right font-bold text-[#C6552A]">{brl(totais.saving)}</td>
                <td className="py-2 px-2 text-right font-bold" style={{color:'var(--accent)'}}>{brl(totais.caixa)}</td>
                <td colSpan={4} />
                <td className="py-2 px-2 text-right font-bold" style={{color:'#1A4060'}}>{brl(totais.custos)}</td>
                <td className="py-2 px-2 text-right font-bold" style={{color:totais.resultado>=0?'#4a7c59':'#ef4444'}}>{brl(totais.resultado)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
