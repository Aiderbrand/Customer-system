export const INDUSTRY_OPTIONS = [
  { value: 'retail', label: 'Retail' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'gastronomia', label: 'Gastronomía' },
  { value: 'salud', label: 'Salud' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'educacion', label: 'Educación' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'logistica', label: 'Logística' },
  { value: 'otro', label: 'Otro' },
]

export const TEAM_SIZE_OPTIONS = [
  { value: '1-5', label: '1–5 personas' },
  { value: '6-15', label: '6–15 personas' },
  { value: '16-50', label: '16–50 personas' },
  { value: '50+', label: 'Más de 50 personas' },
]

export const YEARS_OPTIONS = [
  { value: 'menos-1', label: 'Menos de 1 año' },
  { value: '1-3', label: '1–3 años' },
  { value: '3-5', label: '3–5 años' },
  { value: '5+', label: 'Más de 5 años' },
]

export const BUDGET_OPTIONS = [
  { value: 'no-claro', label: 'No tengo claro' },
  { value: 'menos-500', label: 'Menos de $500/mes' },
  { value: '500-2000', label: '$500–$2000/mes' },
  { value: 'mas-2000', label: 'Más de $2000/mes' },
]

export const TIMEFRAME_OPTIONS = [
  { value: 'ya-mismo', label: 'Ya mismo' },
  { value: '1-2-semanas', label: 'En 1–2 semanas' },
  { value: 'un-mes', label: 'En un mes' },
  { value: 'evaluando', label: 'Todavía estoy evaluando' },
]

export const TOOLS_OPTIONS = [
  'WhatsApp',
  'Email',
  'Google Drive',
  'Sheets / Excel',
  'CRM',
  'Facturación',
  'Turnos',
  'Trello',
  'Notion',
  'Redes sociales',
  'Otro',
]

export const INDUSTRY_LABELS = Object.fromEntries(INDUSTRY_OPTIONS.map((o) => [o.value, o.label]))
export const TEAM_SIZE_LABELS = Object.fromEntries(TEAM_SIZE_OPTIONS.map((o) => [o.value, o.label]))
export const YEARS_LABELS = Object.fromEntries(YEARS_OPTIONS.map((o) => [o.value, o.label]))
export const BUDGET_LABELS = Object.fromEntries(BUDGET_OPTIONS.map((o) => [o.value, o.label]))
export const TIMEFRAME_LABELS = Object.fromEntries(TIMEFRAME_OPTIONS.map((o) => [o.value, o.label]))
