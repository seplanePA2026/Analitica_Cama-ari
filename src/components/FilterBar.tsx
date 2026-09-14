import type { RelatorioFiltros } from '../lib/filters'

type OptionMap = {
  sexo: string[]
  idade: string[]
  religiao: string[]
  escolaridade: string[]
  renda: string[]
  regiao: string[]
}

type Props = {
  value: RelatorioFiltros
  options: OptionMap
  onChange: (next: RelatorioFiltros) => void
  onClear: () => void
  baseN: number
  filteredN: number
}

const LABELS: { key: keyof RelatorioFiltros; label: string }[] = [
  { key: 'sexo', label: 'Sexo' },
  { key: 'idade', label: 'Faixa etária' },
  { key: 'religiao', label: 'Religião' },
  { key: 'escolaridade', label: 'Escolaridade' },
  { key: 'renda', label: 'Renda' },
  { key: 'regiao', label: 'Região' },
]

export function FilterBar({ value, options, onChange, onClear, baseN, filteredN }: Props) {
  return (
    <div className="filter-bar desktop-only">
      <div className="filter-bar-label">Filtros do relatório</div>
      <div className="filter-bar-fields">
        {LABELS.map(({ key, label }) => (
          <label key={key} className="filter-field">
            {label}
            <select
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
            >
              <option value="">Todos</option>
              {options[key].map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="filter-bar-actions">
        <span className="meta">
          {filteredN.toLocaleString('pt-BR')} / {baseN.toLocaleString('pt-BR')}
        </span>
        <button type="button" className="filter-clear" onClick={onClear}>
          Limpar filtros
        </button>
      </div>
    </div>
  )
}

export function FilterDrawer({
  open,
  onClose,
  value,
  options,
  onChange,
  onClear,
  baseN,
  filteredN,
}: Props & { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} aria-hidden />
      <aside className="filter-drawer" role="dialog" aria-label="Filtros do relatório">
        <div className="sheet-head">
          <h2>Filtros do relatório</h2>
          <button type="button" className="sheet-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="filter-drawer-body">
          {LABELS.map(({ key, label }) => (
            <label key={key} className="filter-field block">
              {label}
              <select
                value={value[key]}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              >
                <option value="">Todos</option>
                {options[key].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="filter-drawer-foot">
          <span className="meta">
            {filteredN.toLocaleString('pt-BR')} de {baseN.toLocaleString('pt-BR')} entrevistas
          </span>
          <button type="button" className="filter-clear" onClick={onClear}>
            Limpar filtros
          </button>
          <button type="button" className="filter-apply" onClick={onClose}>
            Aplicar
          </button>
        </div>
      </aside>
    </>
  )
}

export { LABELS }
