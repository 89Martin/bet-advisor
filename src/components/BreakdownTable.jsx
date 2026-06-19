import React, { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { GradePill } from './ui'
import { fmtMoney, fmtUnits, fmtPct, fmtOdds, fmtSignedPct, valueColor } from '../lib/format'
import { GRADE_META } from '../lib/advisor'

const col = createColumnHelper()

export default function BreakdownTable({ rows, dimensionLabel }) {
  const [sorting, setSorting] = useState([{ id: 'units', desc: true }])

  const data = useMemo(
    () =>
      rows.map((g) => ({
        key: g.key,
        grade: g.grade?.label,
        gradeScore: g.grade ? GRADE_META[g.grade.label].rank : 9,
        reasons: g.grade?.reasons || [],
        bets: g.stats.bets,
        winRate: g.stats.winRate,
        roi: g.stats.roi,
        units: g.stats.units,
        profit: g.stats.totalProfit,
        avgOdds: g.stats.avgAmericanOdds,
        avgStakeUnits: g.stats.avgStakeUnits,
        clv: g.stats.clvAvg,
        recentUnits: g.recent30 ? g.recent30.units : null,
        recentBets: g.recent30 ? g.recent30.bets : 0,
      })),
    [rows]
  )

  const columns = useMemo(
    () => [
      col.accessor('key', {
        header: dimensionLabel,
        cell: (c) => <span className="font-medium text-slate-100">{c.getValue()}</span>,
      }),
      col.accessor('gradeScore', {
        header: 'Verdict',
        cell: (c) => (c.row.original.grade ? <GradePill grade={c.row.original.grade} /> : null),
        sortingFn: 'basic',
      }),
      col.accessor('bets', { header: 'Bets', cell: (c) => <Num>{c.getValue()}</Num> }),
      col.accessor('winRate', { header: 'Win %', cell: (c) => <Num>{fmtPct(c.getValue())}</Num> }),
      col.accessor('roi', {
        header: 'ROI',
        cell: (c) => <Colored v={c.getValue()}>{fmtSignedPct(c.getValue())}</Colored>,
      }),
      col.accessor('units', {
        header: 'Units',
        cell: (c) => <Colored v={c.getValue()}>{fmtUnits(c.getValue())}</Colored>,
      }),
      col.accessor('profit', {
        header: 'Profit',
        cell: (c) => <Colored v={c.getValue()}>{fmtMoney(c.getValue(), { sign: true })}</Colored>,
      }),
      col.accessor('avgOdds', { header: 'Avg Odds', cell: (c) => <Num>{fmtOdds(c.getValue())}</Num> }),
      col.accessor('avgStakeUnits', { header: 'Avg Stake', cell: (c) => <Num>{c.getValue() ? `${c.getValue().toFixed(2)}u` : '—'}</Num> }),
      col.accessor('clv', {
        header: 'CLV',
        cell: (c) => (c.getValue() == null ? <Num>—</Num> : <Colored v={c.getValue()}>{`${c.getValue() > 0 ? '+' : ''}${c.getValue().toFixed(1)}%`}</Colored>),
      }),
      col.accessor('recentUnits', {
        header: '30d',
        cell: (c) =>
          c.row.original.recentBets === 0 ? (
            <Num>—</Num>
          ) : (
            <Colored v={c.getValue()}>{fmtUnits(c.getValue())}</Colored>
          ),
      }),
    ],
    [dimensionLabel]
  )

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id} className="border-b border-white/10">
              {hg.headers.map((h, idx) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className={`select-none cursor-pointer py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-200 ${
                    idx === 0 ? 'text-left' : 'text-right'
                  }`}
                >
                  <span className={`inline-flex items-center gap-1 ${idx === 0 ? '' : 'justify-end w-full'}`}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                    <SortIcon dir={h.column.getIsSorted()} />
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.025] transition-colors group">
              {row.getVisibleCells().map((cell, idx) => (
                <td
                  key={cell.id}
                  className={`py-2.5 px-3 ${idx === 0 ? 'text-left' : 'text-right tabular-nums'}`}
                  title={idx === 1 ? row.original.reasons.join(' • ') : undefined}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!data.length && <div className="py-8 text-center text-sm text-slate-500">No bets in this view.</div>}
    </div>
  )
}

function Num({ children }) {
  return <span className="text-slate-300">{children}</span>
}
function Colored({ v, children }) {
  return <span style={{ color: valueColor(v) }} className="font-medium">{children}</span>
}
function SortIcon({ dir }) {
  if (!dir) return <span className="text-slate-600 text-[9px]">↕</span>
  return <span className="text-emerald-400 text-[9px]">{dir === 'asc' ? '▲' : '▼'}</span>
}
