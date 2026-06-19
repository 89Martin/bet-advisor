import React, { useMemo, useState } from 'react'
import { Card, SectionTitle } from './ui'
import { fmtMoney, fmtUnits, fmtOdds, fmtDate, valueColor } from '../lib/format'

const FIELD_LABELS = {
  date: 'Date', sport: 'Sport', league: 'League', betType: 'Bet Type',
  market: 'Market', odds: 'Odds', stake: 'Stake', result: 'Result',
  profit: 'Profit / Loss', sportsbook: 'Sportsbook', closing: 'Closing Line',
}

export default function DataView({ dataset }) {
  const { bets, mapping, headers, droppedRows, totalRows } = dataset
  const [showAll, setShowAll] = useState(false)

  const quality = useMemo(() => {
    const n = bets.length
    const has = (pred) => bets.filter(pred).length
    return {
      withDate: has((b) => b.date),
      withOdds: has((b) => b.odds != null),
      withClosing: has((b) => b.closingDecimal != null),
      unknownResult: has((b) => b.result === 'unknown'),
      parlays: has((b) => b.isParlay),
      props: has((b) => b.category === 'prop'),
      n,
    }
  }, [bets])

  const sample = showAll ? bets.slice().reverse() : bets.slice().reverse().slice(0, 50)

  return (
    <div className="space-y-5 fade-up">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <SectionTitle title="Detected columns" subtitle="How your CSV headers were auto-mapped" />
          <div className="space-y-1.5">
            {Object.keys(FIELD_LABELS).map((f) => (
              <div key={f} className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-white/5 last:border-0">
                <span className="text-slate-400">{FIELD_LABELS[f]}</span>
                {mapping[f] ? (
                  <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-400/20">{mapping[f]}</span>
                ) : (
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-500 border border-white/10">not found</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            All headers in file: {headers.join(', ')}
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Data quality" subtitle="What we read and cleaned" />
          <div className="grid grid-cols-2 gap-3">
            <QualityStat label="Bets parsed" value={`${quality.n}`} sub={`of ${totalRows} rows`} />
            <QualityStat label="Skipped rows" value={`${droppedRows}`} sub="empty / unusable" tone={droppedRows > 0 ? 'warn' : 'ok'} />
            <QualityStat label="With dates" value={pctStr(quality.withDate, quality.n)} sub={`${quality.withDate} bets`} />
            <QualityStat label="With odds" value={pctStr(quality.withOdds, quality.n)} sub={`${quality.withOdds} bets`} />
            <QualityStat label="Closing line" value={pctStr(quality.withClosing, quality.n)} sub={quality.withClosing ? 'CLV available' : 'no CLV data'} tone={quality.withClosing ? 'ok' : 'muted'} />
            <QualityStat label="Unknown result" value={`${quality.unknownResult}`} sub="graded by profit" tone={quality.unknownResult > 0 ? 'warn' : 'ok'} />
            <QualityStat label="Parlays" value={`${quality.parlays}`} sub={`${quality.n - quality.parlays} singles`} />
            <QualityStat label="Player props" value={`${quality.props}`} sub={`${quality.n - quality.props} game lines`} />
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <SectionTitle
          title="Bets (most recent first)"
          subtitle={`${showAll ? bets.length : Math.min(50, bets.length)} of ${bets.length} shown`}
          right={
            bets.length > 50 ? (
              <button onClick={() => setShowAll((s) => !s)} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5">
                {showAll ? 'Show recent 50' : `Show all ${bets.length}`}
              </button>
            ) : null
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-400">
                <Th>Date</Th><Th>Sport</Th><Th>League</Th><Th>Bet</Th><Th>Market</Th><Th>Type</Th>
                <Th right>Odds</Th><Th right>Stake</Th><Th>Result</Th><Th right>Profit</Th><Th>Book</Th>
              </tr>
            </thead>
            <tbody>
              {sample.map((b, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/[0.025]">
                  <Td>{fmtDate(b.date)}</Td>
                  <Td>{b.sport}</Td>
                  <Td className="text-slate-400">{b.league}</Td>
                  <Td className="max-w-[260px] truncate" title={b.description}>{b.description || '—'}</Td>
                  <Td>{b.market}</Td>
                  <Td className="text-slate-400">{b.isParlay ? 'Parlay' : b.category === 'prop' ? 'Prop' : 'Single'}</Td>
                  <Td right>{fmtOdds(b.odds)}</Td>
                  <Td right>{fmtMoney(b.stake)}</Td>
                  <Td><ResultBadge r={b.result} /></Td>
                  <Td right style={{ color: valueColor(b.profit) }} className="font-medium tabular-nums">{fmtMoney(b.profit, { sign: true })}</Td>
                  <Td className="text-slate-400">{b.sportsbook}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function QualityStat({ label, value, sub, tone }) {
  const color = tone === 'warn' ? '#fbbf24' : tone === 'ok' ? '#34d399' : tone === 'muted' ? '#94a3b8' : '#e2e8f0'
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-xs text-slate-500">{sub}</div>
    </div>
  )
}

function ResultBadge({ r }) {
  const map = {
    win: ['Win', 'text-emerald-300 bg-emerald-500/10 border-emerald-400/20'],
    loss: ['Loss', 'text-rose-300 bg-rose-500/10 border-rose-400/20'],
    push: ['Push', 'text-slate-300 bg-white/5 border-white/10'],
    void: ['Void', 'text-slate-400 bg-white/5 border-white/10'],
    unknown: ['?', 'text-amber-300 bg-amber-500/10 border-amber-400/20'],
  }
  const [text, cls] = map[r] || map.unknown
  return <span className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${cls}`}>{text}</span>
}

function Th({ children, right }) {
  return <th className={`py-2 px-2.5 font-semibold ${right ? 'text-right' : 'text-left'}`}>{children}</th>
}
function Td({ children, right, className = '', style, title }) {
  return <td className={`py-2 px-2.5 ${right ? 'text-right tabular-nums' : 'text-left'} ${className}`} style={style} title={title}>{children}</td>
}

function pctStr(n, total) {
  if (!total) return '—'
  return `${Math.round((n / total) * 100)}%`
}
