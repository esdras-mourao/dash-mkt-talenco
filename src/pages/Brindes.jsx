import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { brl, num } from '../lib/fmt'
import { Card, PageHeader, Badge, Btn, Modal, Input, StatCard } from '../components/UI'

export default function Brindes() {
  const [itens, setItens] = useState([])
  const [selected, setSelected] = useState(null)
  const [movs, setMovs] = useState([])
  const [modalItem, setModalItem] = useState(false)
  const [modalMov, setModalMov] = useState(false)
  const [formItem, setFormItem] = useState({ item: '', descricao: '', custo_unitario: '', quantidade_atual: '', quantidade_minima: '5' })
  const [formMov, setFormMov] = useState({ tipo: 'saida', quantidade: '', data: '', evento: '', motivo: '' })

  async function load() {
    const { data } = await supabase.from('vw_estoque_brindes').select('*').order('item')
    setItens(data || [])
  }

  async function loadMovs(id) {
    const { data } = await supabase.from('brindes_movimentacao').select('*').eq('brinde_id', id).order('data', { ascending: false })
    setMovs(data || [])
  }

  useEffect(() => { load() }, [])
  useEffect(() => { if (selected) loadMovs(selected.id) }, [selected])

  async function saveItem() {
    await supabase.from('brindes').insert({
      item: formItem.item,
      descricao: formItem.descricao || null,
      custo_unitario: Number(formItem.custo_unitario),
      quantidade_atual: Number(formItem.quantidade_atual || 0),
      quantidade_minima: Number(formItem.quantidade_minima || 5),
    })
    await load()
    setModalItem(false)
    setFormItem({ item: '', descricao: '', custo_unitario: '', quantidade_atual: '', quantidade_minima: '5' })
  }

  async function saveMov() {
    await supabase.from('brindes_movimentacao').insert({
      brinde_id: selected.id,
      tipo: formMov.tipo,
      quantidade: Number(formMov.quantidade),
      data: formMov.data,
      evento: formMov.evento || null,
      motivo: formMov.motivo || null,
    })
    await load()
    await loadMovs(selected.id)
    setModalMov(false)
    setFormMov({ tipo: 'saida', quantidade: '', data: '', evento: '', motivo: '' })
  }

  const alertas = itens.filter(i => i.alerta_reposicao)
  const valorTotal = itens.reduce((s, i) => s + (i.quantidade_atual * i.custo_unitario), 0)

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Lista */}
      <div className="w-72 shrink-0 border-r border-[#2e2820] overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#6b5d50] uppercase tracking-widest">Inventário</span>
          <button onClick={() => setModalItem(true)} className="text-talenco-yellow text-lg leading-none hover:opacity-70">+</button>
        </div>
        {alertas.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 mb-3 text-xs text-red-400">
            ⚠ {alertas.length} item(s) abaixo do mínimo
          </div>
        )}
        <div className="flex flex-col gap-2">
          {itens.map(it => (
            <button
              key={it.id}
              onClick={() => setSelected(it)}
              className={`text-left p-3 rounded-lg border transition-all ${selected?.id === it.id ? 'bg-talenco-yellow/10 border-talenco-yellow/30' : 'bg-[#1e1a16] border-[#2e2820] hover:border-[#3e3028]'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#F7F3EE]">{it.item}</span>
                {it.alerta_reposicao && <Badge color="red">Repor</Badge>}
              </div>
              <div className="text-xs text-[#6b5d50] mt-0.5">
                Estoque: <span className={it.alerta_reposicao ? 'text-red-400 font-bold' : 'text-talenco-yellow font-semibold'}>{it.quantidade_atual}</span>
                {' · '}{brl(it.custo_unitario, 2)}/un
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detalhe */}
      <div className="flex-1 p-8 overflow-y-auto">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="text-4xl">◇</div>
            <div className="text-[#6b5d50]">Selecione um item</div>
            <div className="text-[#9a8b7d] text-sm">ou adicione novo inventário</div>
            <div className="text-xs text-[#4a3d33] mt-4">Valor total do estoque: <span className="text-talenco-yellow font-bold">{brl(valorTotal, 2)}</span></div>
          </div>
        ) : (
          <>
            <PageHeader title={selected.item} sub={selected.descricao || ''}>
              <Btn onClick={() => setModalMov(true)}>+ Movimentação</Btn>
            </PageHeader>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatCard label="Estoque Atual" value={num(selected.quantidade_atual)} sub={`Mínimo: ${selected.quantidade_minima}`} accent={selected.alerta_reposicao ? '#ef4444' : '#4a7c59'} />
              <StatCard label="Custo Unitário" value={brl(selected.custo_unitario, 2)} accent="#F2B82A" />
              <StatCard label="Valor em Estoque" value={brl(selected.quantidade_atual * selected.custo_unitario, 2)} accent="#D4956A" />
            </div>
            <Card>
              <div className="text-xs font-semibold text-[#9a8b7d] uppercase tracking-widest mb-4">Histórico de Movimentações</div>
              <div className="flex flex-col gap-2">
                {movs.length === 0 && <div className="text-sm text-[#4a3d33] italic">Nenhuma movimentação</div>}
                {movs.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-sm border-b border-[#2e2820] pb-2">
                    <div className="flex items-center gap-3">
                      <Badge color={m.tipo === 'entrada' ? 'green' : 'red'}>{m.tipo}</Badge>
                      <span className="text-[#F7F3EE] font-semibold">{m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} un</span>
                      {m.evento && <span className="text-[#6b5d50] text-xs">{m.evento}</span>}
                    </div>
                    <span className="text-xs text-[#6b5d50]">{m.data}</span>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Modal Item */}
      <Modal open={modalItem} onClose={() => setModalItem(false)} title="Novo Item de Estoque">
        <div className="flex flex-col gap-3">
          <Input label="Nome do Item" value={formItem.item} onChange={e => setFormItem(f => ({ ...f, item: e.target.value }))} />
          <Input label="Descrição" value={formItem.descricao} onChange={e => setFormItem(f => ({ ...f, descricao: e.target.value }))} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Custo Unit. (R$)" type="number" value={formItem.custo_unitario} onChange={e => setFormItem(f => ({ ...f, custo_unitario: e.target.value }))} />
            <Input label="Qtd. Inicial" type="number" value={formItem.quantidade_atual} onChange={e => setFormItem(f => ({ ...f, quantidade_atual: e.target.value }))} />
            <Input label="Qtd. Mínima" type="number" value={formItem.quantidade_minima} onChange={e => setFormItem(f => ({ ...f, quantidade_minima: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModalItem(false)}>Cancelar</Btn>
            <Btn onClick={saveItem}>Adicionar</Btn>
          </div>
        </div>
      </Modal>

      {/* Modal Movimentação */}
      <Modal open={modalMov} onClose={() => setModalMov(false)} title="Registrar Movimentação">
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            {['entrada','saida'].map(t => (
              <button key={t} onClick={() => setFormMov(f => ({ ...f, tipo: t }))}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all capitalize
                  ${formMov.tipo === t ? (t === 'entrada' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-red-500/20 border-red-500/40 text-red-400') : 'bg-[#2a2420] border-[#3e3028] text-[#9a8b7d]'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Quantidade" type="number" value={formMov.quantidade} onChange={e => setFormMov(f => ({ ...f, quantidade: e.target.value }))} />
            <Input label="Data" type="date" value={formMov.data} onChange={e => setFormMov(f => ({ ...f, data: e.target.value }))} />
          </div>
          <Input label="Evento" value={formMov.evento} onChange={e => setFormMov(f => ({ ...f, evento: e.target.value }))} />
          <Input label="Motivo" value={formMov.motivo} onChange={e => setFormMov(f => ({ ...f, motivo: e.target.value }))} />
          <div className="flex gap-3 justify-end mt-2">
            <Btn variant="ghost" onClick={() => setModalMov(false)}>Cancelar</Btn>
            <Btn onClick={saveMov}>Registrar</Btn>
          </div>
        </div>
      </Modal>
    </div>
  )
}
