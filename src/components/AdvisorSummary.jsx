import React from 'react'
import { Card, SectionTitle, GradePill } from './ui'
import { fmtUnits, fmtMoney, fmtSignedPct, fmtPct } from '../lib/format'

export default function AdvisorSummary({ summary, unitSize }) {
  const { keep, stop, biggestLeak, bestTrend, worstTrend, discipline, focus } = summary

  return (
    <div className="space-y-5 fade-up">
      {/* Recommended focus */}
      <Card className="p-5 border-emerald-400/20 bg-gradient-to-br from-emerald-500/[0.07] to-transparent">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-300">★</span>
          <h2 className="text-base font-semibold text-slate-100">Recommended focus — next 30 days</h2>
        </div>
        <ul className="space-y-2.5">
          {focus.map((line, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-slate-200 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Keep / Stop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionTitle title="Top markets to keep betting" subtitle="Your strongest, most repeatable edges" />
          <div className="space-y-2.5">
            {keep.length ? keep.map((g) => <MarketRow key={g.key} g={g} good />) : <NoneYet text="No market has earned a confident green light yet — keep stakes small and build sample." />}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Top markets to stop betting" subtitle="Consistent money-losers with no edge" />
          <div className="space-y-2.5">
            {stop.length ? stop.map((g) => <MarketRow key={g.key} g={g} />) : <NoneYet text="Nothing is clearly bleeding money — nice discipline." />}
          </div>
        </Card>
      </div>

      {/* Leak / trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <InsightCard
          title="Biggest betting leak"
          accent="#ef4444"
          icon="🩸"
        >
          {biggestLeak ? (
            <>
              <div className="text-lg font-semibold text-slate-100">{biggestLeak.key}</div>
              <div className="text-xs text-slate-400 capitalize mb-2">by {labelDim(biggestLeak.dimension)}</div>
              <div className="text-2xl font-bold text-rose-400">{fmtUnits(biggestLeak.stats.units)}</div>
              <div className="text-xs text-slate-400 mt-1">
                {fmtMoney(biggestLeak.stats.totalProfit, { sign: true })} over {biggestLeak.stats.bets} bets · {fmtSignedPct(biggestLeak.stats.roi)} ROI
              </div>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                This single area is your largest drain. Cutting or minimizing it is the fastest way to improve your bottom line.
              </p>
            </>
          ) : (
            <NoneYet text="No single area stands out as a major leak." />
          )}
        </InsightCard>

        <InsightCard title="Best recent trend" accent="#22c55e" icon="🔥">
          {bestTrend ? <TrendBody t={bestTrend} good /> : <NoneYet text="Not enough recent bets to spot a hot streak." />}
        </InsightCard>

        <InsightCard title="Worst recent trend" accent="#ef4444" icon="🧊">
          {worstTrend ? <TrendBody t={worstTrend} /> : <NoneYet text="Not enough recent bets to spot a cold streak." />}
        </InsightCard>
      </div>

      {/* Discipline */}
      <DisciplineCard discipline={discipline} />
    </div>
  )
}

function MarketRow({ g, good }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-100 truncate">{g.key}</span>
          <GradePill grade={g.grade.label} />
        </div>
        <div className="mt-1 text-xs text-slate-400 truncate">{g.grade.reasons[0]}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-base font-semibold ${good ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtUnits(g.stats.units)}</div>
        <div className="text-xs text-slate-400">{fmtSignedPct(g.stats.roi)} · {g.stats.bets} bets</div>
      </div>
    </div>
  )
}

function TrendBody({ t, good }) {
  const color = good ? '#34d399' : '#f87171'
  return (
    <>
      <div className="text-lg font-semibold text-slate-100">{t.key}</div>
      <div className="text-xs text-slate-400 capitalize mb-2">by {labelDim(t.dimension)} · last 30 days</div>
      <div className="text-2xl font-bold" style={{ color }}>{fmtUnits(t.recent.units)}</div>
      <div className="text-xs text-slate-400 mt-1">
        {fmtSignedPct(t.recent.roi)} ROI over {t.recent.bets} recent bets
      </div>
      <p className="mt-3 text-sm text-slate-300 leading-relaxed">
        Long-term this market is {t.longTerm.units >= 0 ? 'up' : 'down'} {fmtUnits(Math.abs(t.longTerm.units), { sign: false })} ({fmtSignedPct(t.longTerm.roi)} ROI).
        {good
          ? ' Riding hot — but stay disciplined on stake size.'
          : ' Cooling off — avoid chasing it back.'}
      </p>
    </>
  )
}

function InsightCard({ title, accent, icon, children }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: accent }}>{title}</h3>
      </div>
      {children}
    </Card>
  )
}

function DisciplineCard({ discipline }) {
  const ok = !discipline.hasWarning
  return (
    <Card className={`p-5 ${ok ? 'border-emerald-400/20' : 'border-amber-400/30 bg-amber-500/[0.04]'}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{ok ? '🛡️' : '⚠️'}</span>
        <h3 className="text-base font-semibold text-slate-100">Bankroll discipline</h3>
      </div>
      {ok ? (
        <p className="text-sm text-slate-300">
          No red flags. Your stake size and bet volume stay steady whether you're winning or losing — that's exactly what good bankroll management looks like.
        </p>
      ) : (
        <div className="space-y-3">
          {discipline.warnings.map((w, i) => (
            <div
              key={i}
              className={`rounded-xl border px-4 py-3 ${
                w.severity === 'high' ? 'border-rose-400/30 bg-rose-500/[0.07]' : 'border-amber-400/30 bg-amber-500/[0.06]'
              }`}
            >
              <div className={`text-sm font-semibold ${w.severity === 'high' ? 'text-rose-200' : 'text-amber-200'}`}>{w.title}</div>
              <div className="mt-1 text-sm text-slate-300 leading-relaxed">{w.detail}</div>
            </div>
          ))}
          {discipline.chasing && (
            <div className="text-xs text-slate-400">
              After a cold run your avg stake is <b className="text-slate-200">{discipline.chasing.chaseAvgUnits.toFixed(2)}u</b> vs{' '}
              <b className="text-slate-200">{discipline.chasing.baseAvgUnits.toFixed(2)}u</b> normally.
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function NoneYet({ text }) {
  return <p className="text-sm text-slate-500">{text}</p>
}

function labelDim(dim) {
  const map = { market: 'market', betType: 'bet type', sport: 'sport', oddsRange: 'odds range', structure: 'bet structure', category: 'bet category', sportsbook: 'sportsbook', league: 'league', stakeSize: 'stake size' }
  return map[dim] || dim
}
