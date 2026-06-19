// Shared display formatters.

export function fmtMoney(n, { sign = false } = {}) {
  if (n == null || Number.isNaN(n)) return '—'
  const s = n < 0 ? '-' : sign ? '+' : ''
  const abs = Math.abs(n)
  return `${s}$${abs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function fmtUnits(n, { sign = true } = {}) {
  if (n == null || Number.isNaN(n)) return '—'
  const s = n > 0 && sign ? '+' : ''
  return `${s}${n.toFixed(2)}u`
}

export function fmtPct(x, digits = 1) {
  if (x == null || Number.isNaN(x)) return '—'
  return `${(x * 100).toFixed(digits)}%`
}

export function fmtSignedPct(x, digits = 1) {
  if (x == null || Number.isNaN(x)) return '—'
  const s = x > 0 ? '+' : ''
  return `${s}${(x * 100).toFixed(digits)}%`
}

export function fmtOdds(american) {
  if (american == null || Number.isNaN(american)) return '—'
  const r = Math.round(american)
  return r > 0 ? `+${r}` : `${r}`
}

export function fmtNum(n) {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString()
}

export function fmtDate(d) {
  if (!d) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Color for a positive/negative value.
export function valueColor(n) {
  if (n == null || n === 0) return 'var(--color-slate-400, #94a3b8)'
  return n > 0 ? '#34d399' : '#f87171'
}
