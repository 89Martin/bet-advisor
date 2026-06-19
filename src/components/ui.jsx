// Shared presentational primitives used across the dashboard.
import React from 'react'
import { GRADE_META } from '../lib/advisor'
import { valueColor } from '../lib/format'

export function Card({ className = '', children, ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_10px_30px_-15px_rgba(0,0,0,0.6)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ title, subtitle, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-100">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function StatCard({ label, value, sub, accent, tone, icon }) {
  const color = tone === 'value' ? valueColor(accent) : undefined
  return (
    <Card className="p-4 fade-up">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </Card>
  )
}

export function GradePill({ grade, size = 'sm' }) {
  const meta = GRADE_META[grade] || { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.3)', label: grade }
  const pad = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad}`}
      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.border}` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  )
}

export function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40'
          : 'text-slate-400 border border-white/10 hover:text-slate-200 hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )
}

export function Delta({ value, suffix = '' }) {
  if (value == null || Number.isNaN(value)) return <span className="text-slate-500">—</span>
  const up = value > 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
      {up ? '▲' : value < 0 ? '▼' : '•'} {Math.abs(value).toFixed(1)}{suffix}
    </span>
  )
}

export function Empty({ children }) {
  return <div className="text-sm text-slate-500 py-8 text-center">{children}</div>
}
