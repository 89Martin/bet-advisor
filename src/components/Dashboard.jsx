import React, { useMemo, useState } from 'react'
import { Card, SectionTitle, StatCard, Pill } from './ui'
import { EquityCurve, MonthlyBars, BreakdownBars } from './Charts'
import BreakdownTable from './BreakdownTable'
import { computeStats, equityCurve, monthlySeries, lastNDays, DIMENSIONS } from '../lib/metrics'
import { gradeBreakdown } from '../lib/advisor'
import { fmtMoney, fmtUnits, fmtPct, fmtSignedPct, fmtOdds, fmtNum } from '../lib/format'

export default function Dashboard({ bets, allBets, unitSize, now, minSample }) {
  const [dim, setDim] = useState('leagueMarket')

  const stats = useMemo(() => computeStats(bets, unitSize), [bets, unitSize])
  const equity = useMemo(() => equityCurve(bets, unitSize), [bets, unitSize])
  const monthly = useMemo(() => monthlySeries(bets, unitSize), [bets, unitSize])
  const breakdown = useMemo(
    () => gradeBreakdown(bets, dim, unitSize, now, { minSample }),
    [bets, dim, unitSize, now, minSample]
  )
  const barData = useMemo(
    () => [...breakdown]
      .map((g) => ({ key: g.key, units: g.stats.units, profit: g.stats.totalProfit, roi: g.stats.roi, bets: g.stats.bets }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 12),
    [breakdown]
  )

  const dimLabel = DIMENSIONS.find((d) => d.id === dim)?.label || dim

  return (
    <div className="space-y-5 fade-up">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Net Profit" value={fmtMoney(stats.totalProfit, { sign: true })} accent={stats.totalProfit} tone="value" sub={`${fmtUnits(stats.units)}`} />
        <StatCard label="ROI" value={fmtSignedPct(stats.roi)} accent={stats.roi} tone="value" sub={`on ${fmtMoney(stats.totalStake)} staked`} />
        <StatCard label="Win Rate" value={fmtPct(stats.winRate)} sub={`${stats.wins}-${stats.losses}${stats.pushes ? `-${stats.pushes}` : ''}${stats.breakevenWinRate != null ? ` · need ${fmtPct(stats.breakevenWinRate)}` : ''}`} />
        <StatCard label="Bets" value={fmtNum(stats.bets)} sub={`${stats.voids} void${stats.voids === 1 ? '' : 's'} excluded`} />
        <StatCard label="Avg Odds" value={fmtOdds(stats.avgAmericanOdds)} sub={stats.avgDecimalOdds ? `${stats.avgDecimalOdds.toFixed(2)} decimal` : '—'} />
        <StatCard label="Avg Stake" value={`${stats.avgStakeUnits.toFixed(2)}u`} sub={fmtMoney(stats.avgStake)} />
        <StatCard label="Total Staked" value={fmtMoney(stats.totalStake)} sub={`${stats.stakedUnits.toFixed(1)} units`} />
        <StatCard
          label="Closing Line"
          value={stats.clvAvg == null ? '—' : `${stats.clvAvg > 0 ? '+' : ''}${stats.clvAvg.toFixed(1)}%`}
          accent={stats.clvAvg}
          tone={stats.clvAvg == null ? undefined : 'value'}
          sub={stats.clvAvg == null ? 'no closing data' : `avg CLV · ${stats.clvCount} bets`}
        />
      </div>

      <RecentVsLongTerm allBets={allBets} unitSize={unitSize} now={now} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionTitle title="Profit curve" subtitle="Cumulative units over settled bets" />
          <EquityCurve data={equity} />
        </Card>
        <Card className="p-5">
          <SectionTitle title="Monthly performance" subtitle="Units won / lost by month" />
          <MonthlyBars data={monthly} />
        </Card>
      </div>

      {/* Breakdown */}
      <Card className="p-5">
        <SectionTitle
          title="Performance breakdown"
          subtitle="Graded by the advisor engine — sort any column"
          right={
            <div className="flex flex-wrap gap-1.5 justify-end max-w-[60%]">
              {DIMENSIONS.map((d) => (
                <Pill key={d.id} active={dim === d.id} onClick={() => setDim(d.id)}>{d.label}</Pill>
              ))}
            </div>
          }
        />
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-5 items-start">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-2">Units by {dimLabel} (top 12)</div>
            <BreakdownBars data={barData} />
          </div>
          <BreakdownTable rows={breakdown} dimensionLabel={dimLabel} />
        </div>
      </Card>
    </div>
  )
}

function RecentVsLongTerm({ allBets, unitSize, now }) {
  const long = useMemo(() => computeStats(allBets, unitSize), [allBets, unitSize])
  const r30 = useMemo(() => computeStats(lastNDays(allBets, 30, now), unitSize), [allBets, unitSize, now])
  const r7 = useMemo(() => computeStats(lastNDays(allBets, 7, now), unitSize), [allBets, unitSize, now])

  const verdict = (() => {
    if (r30.bets < 3) return { text: 'Not enough recent bets to compare against your long-term baseline yet.', tone: 'neutral' }
    const diff = r30.roi - long.roi
    if (r30.roi > 0 && diff > 0.01) return { text: `You're running hotter than usual — last 30 days (${fmtSignedPct(r30.roi)}) is beating your all-time ROI (${fmtSignedPct(long.roi)}).`, tone: 'good' }
    if (r30.roi < 0 && diff < -0.01) return { text: `You're in a cold patch — last 30 days (${fmtSignedPct(r30.roi)}) is well below your all-time ROI (${fmtSignedPct(long.roi)}). Tighten up and don't chase.`, tone: 'bad' }
    return { text: `Recent form (${fmtSignedPct(r30.roi)} over 30 days) is roughly in line with your all-time ROI (${fmtSignedPct(long.roi)}).`, tone: 'neutral' }
  })()

  const toneClass = verdict.tone === 'good' ? 'border-emerald-400/25 bg-emerald-500/[0.05]' : verdict.tone === 'bad' ? 'border-rose-400/25 bg-rose-500/[0.05]' : 'border-white/8'

  return (
    <Card className={`p-5 ${toneClass}`}>
      <SectionTitle title="Recent vs long-term form" subtitle="How your recent betting compares to your baseline" />
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
        <div className="grid grid-cols-3 gap-4">
          <MiniCompare label="Last 7d" s={r7} />
          <MiniCompare label="Last 30d" s={r30} />
          <MiniCompare label="All-time" s={long} />
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{verdict.text}</p>
      </div>
    </Card>
  )
}

function MiniCompare({ label, s }) {
  return (
    <div className="text-center">
      <div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold" style={{ color: s.units > 0 ? '#34d399' : s.units < 0 ? '#f87171' : '#cbd5e1' }}>
        {fmtUnits(s.units)}
      </div>
      <div className="text-xs text-slate-400">{fmtSignedPct(s.roi)} · {s.bets} bets</div>
    </div>
  )
}
