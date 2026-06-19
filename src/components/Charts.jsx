import React from 'react'
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { fmtUnits, fmtMoney, fmtPct } from '../lib/format'

const AXIS = { fontSize: 11, fill: '#7c8aa5' }
const GRID = '#1c2742'

function TipBox({ children }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0b1220]/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      {children}
    </div>
  )
}

export function EquityCurve({ data }) {
  if (!data.length) return <Empty />
  const last = data[data.length - 1]?.units ?? 0
  const positive = last >= 0
  const stroke = positive ? '#22c55e' : '#ef4444'
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="i" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={40} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${v}u`} />
        <ReferenceLine y={0} stroke="#46557a" strokeDasharray="4 4" />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return (
              <TipBox>
                <div className="text-slate-400">Bet #{p.i} · {p.label}</div>
                <div className="font-semibold" style={{ color: stroke }}>{fmtUnits(p.units)} ({fmtMoney(p.profit, { sign: true })})</div>
              </TipBox>
            )
          }}
        />
        <Area type="monotone" dataKey="units" stroke={stroke} strokeWidth={2} fill="url(#eq)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function MonthlyBars({ data }) {
  if (!data.length) return <Empty />
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => `${v}u`} />
        <ReferenceLine y={0} stroke="#46557a" />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return (
              <TipBox>
                <div className="text-slate-200 font-medium mb-0.5">{p.label}</div>
                <div style={{ color: p.units >= 0 ? '#34d399' : '#f87171' }}>{fmtUnits(p.units)} · {fmtMoney(p.profit, { sign: true })}</div>
                <div className="text-slate-400">{p.bets} bets · {fmtPct(p.roi)} ROI</div>
              </TipBox>
            )
          }}
        />
        <Bar dataKey="units" radius={[4, 4, 0, 0]} maxBarSize={44}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.units >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BreakdownBars({ data }) {
  if (!data.length) return <Empty />
  const height = Math.max(160, data.length * 34 + 24)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} tickFormatter={(v) => `${v}u`} />
        <YAxis type="category" dataKey="key" tick={{ ...AXIS, fill: '#aab6cc' }} tickLine={false} axisLine={false} width={140} />
        <ReferenceLine x={0} stroke="#46557a" />
        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0].payload
            return (
              <TipBox>
                <div className="text-slate-200 font-medium mb-0.5">{p.key}</div>
                <div style={{ color: p.units >= 0 ? '#34d399' : '#f87171' }}>{fmtUnits(p.units)} · {fmtMoney(p.profit, { sign: true })}</div>
                <div className="text-slate-400">{p.bets} bets · {fmtPct(p.roi)} ROI</div>
              </TipBox>
            )
          }}
        />
        <Bar dataKey="units" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.units >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

function Empty() {
  return <div className="h-[200px] flex items-center justify-center text-sm text-slate-500">Not enough data to chart.</div>
}
