-- ============================================================
-- TALENCO MARKETING DASHBOARD — SUPABASE SCHEMA
-- ============================================================

-- USERS (gerenciado pelo Supabase Auth, esta tabela estende)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null default 'viewer', -- 'admin' | 'viewer'
  created_at timestamptz default now()
);

-- EMPREENDIMENTOS
create table if not exists empreendimentos (
  id serial primary key,
  nome text not null,
  codigo text not null unique, -- 'marino', 'orla', 'grena', 'maina', 'arbo'
  ativo boolean default true,
  ano_inicio int not null,
  vgv_total numeric(14,2),
  created_at timestamptz default now()
);

insert into empreendimentos (nome, codigo, ano_inicio, vgv_total) values
  ('Residencial Marino',  'marino', 2025, 0),
  ('Residencial Grená',   'grena',  2025, 0),
  ('Residencial Mainá',   'maina',  2025, 0),
  ('Arbo',                'arbo',   2025, 0),
  ('Orla Caiçara (SCP)',  'orla',   2026, 0)
on conflict (codigo) do nothing;

-- VENDAS (alimenta o caixa de marketing dinamicamente)
create table if not exists vendas (
  id serial primary key,
  empreendimento_id int references empreendimentos(id),
  data_venda date not null,
  valor_vgv numeric(14,2) not null,
  unidade text,
  comprador text,
  ano int generated always as (extract(year from data_venda)::int) stored,
  mes int generated always as (extract(month from data_venda)::int) stored,
  created_at timestamptz default now()
);

-- ORÇAMENTO DE MARKETING (planejamento anual)
create table if not exists orcamento_planejado (
  id serial primary key,
  ano int not null,
  empreendimento_id int references empreendimentos(id), -- null = institucional TalenCo
  categoria text not null, -- 'midia', 'eventos', 'ferramentas', 'outros'
  mes int not null check (mes between 1 and 12),
  valor_planejado numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  unique(ano, empreendimento_id, categoria, mes)
);

-- CAIXA DE MARKETING (gerado automaticamente pelas vendas)
-- view calculada: 1% do VGV vendido no mês
-- split: 30% institucional / 70% produto
-- esta tabela guarda ajustes manuais se necessário
create table if not exists caixa_marketing_ajuste (
  id serial primary key,
  ano int not null,
  mes int not null,
  empreendimento_id int references empreendimentos(id),
  ajuste numeric(12,2) default 0,
  motivo text,
  created_at timestamptz default now()
);

-- GASTOS / EXECUÇÃO DE MARKETING
create table if not exists gastos (
  id serial primary key,
  data date not null,
  ano int generated always as (extract(year from data)::int) stored,
  mes int generated always as (extract(month from data)::int) stored,
  empreendimento_id int references empreendimentos(id), -- null = institucional
  categoria text not null, -- 'midia', 'eventos', 'ferramentas', 'outros'
  subcategoria text,
  descricao text not null,
  fornecedor text,
  valor numeric(12,2) not null,
  comprovante_url text,
  created_at timestamptz default now()
);

-- CAMPANHAS DIGITAIS
create table if not exists campanhas (
  id serial primary key,
  nome text not null,
  empreendimento_id int references empreendimentos(id),
  plataforma text not null, -- 'meta', 'google', 'youtube', 'tiktok', 'organico'
  status text default 'ativa', -- 'ativa' | 'pausada' | 'encerrada'
  data_inicio date not null,
  data_fim date,
  investimento_planejado numeric(12,2),
  created_at timestamptz default now()
);

-- KPIs DE CAMPANHAS (entrada manual ou futura integração de API)
create table if not exists kpis_campanha (
  id serial primary key,
  campanha_id int references campanhas(id) on delete cascade,
  data date not null,
  -- funil de mídia paga
  investimento numeric(12,2) default 0,
  impressoes int default 0,
  alcance int default 0,
  cliques int default 0,
  ctr numeric(6,4) default 0,
  cpm numeric(8,2) default 0,
  cpc numeric(8,2) default 0,
  leads int default 0,
  cpl numeric(8,2) default 0,
  -- funil de vendas
  leads_qualificados int default 0,
  visitas_stand int default 0,
  propostas int default 0,
  reservas int default 0,
  vendas int default 0,
  -- vídeo
  visualizacoes int default 0,
  vtr numeric(6,4) default 0,
  cpv numeric(8,2) default 0,
  created_at timestamptz default now()
);

-- AUDIÊNCIA / BRANDING (orgânico + pago + offline)
create table if not exists audiencia (
  id serial primary key,
  data date not null,
  mes int generated always as (extract(month from data)::int) stored,
  ano int generated always as (extract(year from data)::int) stored,
  -- orgânico
  seguidores_instagram int default 0,
  seguidores_facebook int default 0,
  inscritos_youtube int default 0,
  visitas_site int default 0,
  -- mídia paga (alcance total)
  alcance_pago_meta int default 0,
  alcance_pago_google int default 0,
  -- offline
  evento_nome text,
  evento_publico int default 0,
  created_at timestamptz default now()
);

-- INVENTÁRIO DE BRINDES
create table if not exists brindes (
  id serial primary key,
  item text not null,
  descricao text,
  custo_unitario numeric(8,2) not null,
  quantidade_atual int not null default 0,
  quantidade_minima int default 5, -- alerta de reposição
  created_at timestamptz default now()
);

create table if not exists brindes_movimentacao (
  id serial primary key,
  brinde_id int references brindes(id) on delete cascade,
  tipo text not null, -- 'entrada' | 'saida'
  quantidade int not null,
  data date not null,
  evento text,
  motivo text,
  created_at timestamptz default now()
);

-- EVENTOS / ATIVAÇÕES
create table if not exists eventos (
  id serial primary key,
  nome text not null,
  tipo text not null, -- 'evento', 'ativacao', 'stand', 'visita_obra'
  empreendimento_id int references empreendimentos(id),
  data_inicio date not null,
  data_fim date,
  local text,
  publico_estimado int,
  publico_real int,
  orcamento_planejado numeric(12,2),
  status text default 'planejado', -- 'planejado' | 'realizado' | 'cancelado'
  created_at timestamptz default now()
);

-- ============================================================
-- VIEWS CALCULADAS
-- ============================================================

-- Caixa de marketing mensal (calculado via vendas)
create or replace view vw_caixa_marketing as
select
  v.ano,
  v.mes,
  v.empreendimento_id,
  e.nome as empreendimento,
  e.codigo,
  sum(v.valor_vgv) as vgv_vendido,
  sum(v.valor_vgv) * 0.01 as caixa_total,
  sum(v.valor_vgv) * 0.01 * 0.70 as caixa_produto,
  sum(v.valor_vgv) * 0.01 * 0.30 as caixa_institucional
from vendas v
join empreendimentos e on e.id = v.empreendimento_id
group by v.ano, v.mes, v.empreendimento_id, e.nome, e.codigo;

-- Budget executado vs planejado
create or replace view vw_budget_execucao as
select
  coalesce(p.ano, g.ano) as ano,
  coalesce(p.mes, g.mes) as mes,
  coalesce(p.empreendimento_id, g.empreendimento_id) as empreendimento_id,
  coalesce(p.categoria, g.categoria) as categoria,
  coalesce(p.valor_planejado, 0) as planejado,
  coalesce(sum(g.valor), 0) as executado,
  coalesce(p.valor_planejado, 0) - coalesce(sum(g.valor), 0) as saldo
from orcamento_planejado p
full outer join gastos g
  on g.ano = p.ano
  and g.mes = p.mes
  and coalesce(g.empreendimento_id, -1) = coalesce(p.empreendimento_id, -1)
  and g.categoria = p.categoria
group by p.ano, p.mes, p.empreendimento_id, p.categoria, p.valor_planejado, g.ano, g.mes, g.empreendimento_id, g.categoria;

-- Estoque de brindes atual
create or replace view vw_estoque_brindes as
select
  b.id,
  b.item,
  b.descricao,
  b.custo_unitario,
  b.quantidade_minima,
  b.quantidade_atual +
    coalesce(sum(case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end), 0)
    as quantidade_atual,
  case
    when b.quantidade_atual +
      coalesce(sum(case when m.tipo = 'entrada' then m.quantidade else -m.quantidade end), 0)
      <= b.quantidade_minima then true
    else false
  end as alerta_reposicao
from brindes b
left join brindes_movimentacao m on m.brinde_id = b.id
group by b.id, b.item, b.descricao, b.custo_unitario, b.quantidade_minima, b.quantidade_atual;

-- RLS (Row Level Security)
alter table profiles enable row level security;
alter table vendas enable row level security;
alter table gastos enable row level security;
alter table campanhas enable row level security;
alter table kpis_campanha enable row level security;
alter table audiencia enable row level security;
alter table brindes enable row level security;
alter table brindes_movimentacao enable row level security;
alter table eventos enable row level security;
alter table orcamento_planejado enable row level security;

-- Políticas: usuários autenticados veem tudo (refinamos depois)
do $$ declare t text; begin
  foreach t in array array['profiles','vendas','gastos','campanhas','kpis_campanha',
    'audiencia','brindes','brindes_movimentacao','eventos','orcamento_planejado',
    'caixa_marketing_ajuste','empreendimentos'] loop
    execute format('create policy "auth_all_%s" on %s for all using (auth.role() = ''authenticated'')', t, t);
  end loop;
end $$;

-- PATCH: adicionar coluna cor aos empreendimentos (rodar no Supabase SQL Editor)
-- alter table empreendimentos add column if not exists cor text default '#F2B82A';
