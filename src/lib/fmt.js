export const brl = (v, dec = 0) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: dec }).format(v || 0)

export const num = (v) =>
  new Intl.NumberFormat('pt-BR').format(v || 0)

export const pct = (v, dec = 1) => `${(v * 100).toFixed(dec).replace('.', ',')}%`

export const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export const EMPREENDIMENTOS_2025 = ['marino','grena','maina','arbo']
export const EMPREENDIMENTOS_2026 = ['marino','grena','maina','orla']

export const COR_EMP = {
  marino: '#F2B82A',
  grena:  '#C6552A',
  maina:  '#1A4060',
  arbo:   '#4a7c59',
  orla:   '#D4956A',
}
