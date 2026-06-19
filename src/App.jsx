import React, { useMemo, useState } from 'react'
import Upload from './components/Upload'
import Dashboard from './components/Dashboard'
import AdvisorSummary from './components/AdvisorSummary'
import DataView from './components/DataView'
import { Pill } from './components/ui'
import { defaultUnitSize, referenceDate, filterByRange, RANGES } from './lib/metrics'
import { buildAdvisorSummary } from './lib/advisor'
import { fmtDate } from './lib/format'

const MIN_SAMPLE = 20

export default function App() {
  const [dataset, setDataset] = useState(null)
  const [fileName, setFileName] = useState('')

  if (!dataset) {
    return (
      <Upload
        onLoaded={(ds, name) => {
          setDataset(ds)
          setFileName(name)
        }}
      />
    )
  }

  return (
    <Workspace
      key={fileName}
      dataset={dataset}
      fileName={fileName}
      onReset={() => {
        setDataset(null)
        setFileName('')
      }}
    />
  )
}

function Workspace({ dataset, fileName, onReset }) {
  const [view, setView] = useState('advisor')
  const [range, setRange] = useState('all')
  const [unitSize, setUnitSize] = useState(() => defaultUnitSize(dataset.bets))

  const now = useMemo(() => referenceDate(dataset.bets), [dataset.bets])
  const filtered = useMemo(() => filterByRange(dataset.bets, range, now), [dataset.bets, range, now])
  const summary = useMemo(
    () => buildAdvisorSummary(dataset.bets, unitSize, now, { minSample: MIN_SAMPLE }),
    [dataset.bets, unitSize, now]
  )

  const dateRange = useMemo(() => {
    const dated = dataset.bets.filter((b) => b.date).map((b) => b.date)
    if (!dated.length) return null
    return { from: new Date(Math.min(...dated)), to: new Date(Math.max(...dated)) }
  }, [dataset.bets])

  const TABS = [
    { id: 'advisor', label: 'Advisor Summary', icon: '★' },
    { id: 'dashboard', label: 'Dashboard', icon: '▦' },
    { id: 'data', label: 'Data', icon: '≡' },
  ]

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#070d1b]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300 text-lg">▲</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 leading-tight">Bet Advisor</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {fileName} · {dataset.bets.length} bets{dateRange ? ` · ${fmtDate(dateRange.from)} – ${fmtDate(dateRange.to)}` : ''}
                </div>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 rounded-xl border border-white/8 bg-white/[0.02] p-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    view === t.id ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="mr-1.5 opacity-70">{t.icon}</span>{t.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <UnitInput unitSize={unitSize} setUnitSize={setUnitSize} />
              <button
                onClick={onReset}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 transition-colors"
              >
                New file
              </button>
            </div>
          </div>

          {/* mobile tabs + range row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
            <div className="flex md:hidden items-center gap-1">
              {TABS.map((t) => (
                <Pill key={t.id} active={view === t.id} onClick={() => setView(t.id)}>{t.label}</Pill>
              ))}
            </div>
            {view === 'dashboard' && (
              <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                <span className="text-[11px] uppercase tracking-wider text-slate-500 mr-1">Range</span>
                {RANGES.map((r) => (
                  <Pill key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>{r.label}</Pill>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        {view === 'advisor' && <AdvisorSummary summary={summary} unitSize={unitSize} />}
        {view === 'dashboard' && (
          <Dashboard bets={filtered} allBets={dataset.bets} unitSize={unitSize} now={now} minSample={MIN_SAMPLE} />
        )}
        {view === 'data' && <DataView dataset={dataset} unitSize={unitSize} />}
      </main>

      <footer className="mx-auto max-w-[1400px] px-6 py-8 text-center text-xs text-slate-600">
        Bet Advisor · all analysis runs locally in your browser · not financial advice — bet responsibly.
      </footer>
    </div>
  )
}

function UnitInput({ unitSize, setUnitSize }) {
  return (
    <label className="hidden sm:flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-1.5">
      <span className="text-[11px] uppercase tracking-wider text-slate-500">1 unit =</span>
      <span className="text-slate-400 text-sm">$</span>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={unitSize}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!Number.isNaN(v) && v > 0) setUnitSize(v)
        }}
        className="w-16 bg-transparent text-sm font-medium text-slate-100 outline-none"
      />
    </label>
  )
}
