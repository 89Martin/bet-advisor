// ---------------------------------------------------------------------------
// Advisor engine: grades each betting area and produces plain-English insights
// ---------------------------------------------------------------------------
import { buildBreakdown, computeStats, round } from './metrics.js'

const DAY = 24 * 60 * 60 * 1000

export const GRADE_META = {
  Hammer: {
    label: 'Hammer',
    blurb: 'Proven, repeatable edge. Bet it with confidence.',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.12)',
    border: 'rgba(34,197,94,0.45)',
    rank: 0,
  },
  'Keep Betting': {
    label: 'Keep Betting',
    blurb: 'Profitable or trending up with a solid sample. Stay the course.',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.10)',
    border: 'rgba(74,222,128,0.40)',
    rank: 1,
  },
  Watchlist: {
    label: 'Watchlist',
    blurb: 'Small sample but early promise. Keep stakes modest and gather data.',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.10)',
    border: 'rgba(56,189,248,0.40)',
    rank: 2,
  },
  Reduce: {
    label: 'Reduce',
    blurb: 'Weak or inconsistent. Trim stake and tighten selection.',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.40)',
    rank: 3,
  },
  Cut: {
    label: 'Cut',
    blurb: 'Losing with no evidence of an edge. Stop betting this.',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.45)',
    rank: 4,
  },
}

export const GRADE_ORDER = ['Hammer', 'Keep Betting', 'Watchlist', 'Reduce', 'Cut']

// Grade a single betting area from its long-term stats and a recent (30d) window.
export function gradeArea(stats, recent30, opts = {}) {
  const minSample = opts.minSample ?? 20
  const s = stats
  const r = recent30 || { bets: 0, totalProfit: 0, roi: 0 }

  const recentHasData = r.bets >= 3
  const recentPositive = recentHasData && r.totalProfit > 0
  const recentNegative = recentHasData && r.totalProfit < 0
  const oneWinDependent = s.maxProfitShare >= 0.5 && s.totalProfit > 0
  const be = s.breakevenWinRate
  const poorWinRate = be != null ? s.winRate < be - 0.03 : s.winRate < 0.45
  const hasEdge = (s.clvAvg != null && s.clvAvg > 0) || s.roi > 0.02

  const reasons = []
  let label

  if (s.bets < minSample) {
    const promising = (s.roi > 0.03 && s.units > 0 && !oneWinDependent) || (s.clvAvg != null && s.clvAvg > 1)
    if (promising) {
      label = 'Watchlist'
      reasons.push(`Only ${s.bets} bets so far, but ${pct(s.roi)} ROI is encouraging`)
      if (s.clvAvg != null && s.clvAvg > 1) reasons.push(`Beating the closing line by ${s.clvAvg.toFixed(1)}% on average`)
    } else if (s.roi < -0.08 && recentNegative) {
      label = 'Reduce'
      reasons.push(`Small sample (${s.bets}) and already down ${fmtUnits(s.units)}`)
    } else {
      label = 'Watchlist'
      reasons.push(`Small sample (${s.bets} bets) — not enough to judge yet`)
    }
  } else if (s.roi > 0 && s.units > 0 && recentPositive && !oneWinDependent) {
    label = 'Hammer'
    reasons.push(`${pct(s.roi)} ROI over ${s.bets} bets (${fmtUnits(s.units)})`)
    reasons.push(`Recent 30 days still profitable (${fmtUnits(r.units)})`)
    reasons.push('Profit is broad-based, not one lucky hit')
  } else if (s.roi > 0 || recentPositive) {
    label = 'Keep Betting'
    if (s.roi > 0) reasons.push(`Profitable long-term: ${pct(s.roi)} ROI (${fmtUnits(s.units)})`)
    if (recentPositive) reasons.push(`Trending up recently (${fmtUnits(r.units)} in last 30d)`)
    if (oneWinDependent) reasons.push('⚠ Heavily reliant on one big win — keep stakes steady')
  } else if (s.roi < 0 && recentNegative && poorWinRate && !hasEdge) {
    label = 'Cut'
    reasons.push(`${pct(s.roi)} ROI (${fmtUnits(s.units)}) over ${s.bets} bets`)
    reasons.push(`Win rate ${pct(s.winRate)}${be != null ? ` vs ${pct(be)} needed to break even` : ''}`)
    if (s.clvAvg != null && s.clvAvg <= 0) reasons.push(`Losing to the closing line (${s.clvAvg.toFixed(1)}% CLV) — no edge`)
    else reasons.push('No evidence of an edge')
  } else {
    label = 'Reduce'
    if (s.roi < 0) reasons.push(`Slightly negative: ${pct(s.roi)} ROI (${fmtUnits(s.units)})`)
    else reasons.push('Marginal results with an inconsistent recent trend')
    if (recentNegative) reasons.push(`Down ${fmtUnits(r.units)} over the last 30 days`)
    if (oneWinDependent) reasons.push('Profit (if any) leans on a single big win')
  }

  return { label, reasons, score: areaScore(s, r), ...GRADE_META[label] }
}

// A confidence-weighted score used to rank areas against each other.
function areaScore(s, r) {
  const confidence = Math.min(1, s.bets / 40)
  const recentBump = r.bets >= 3 ? Math.sign(r.totalProfit) * 4 : 0
  const clvBump = s.clvAvg != null ? clamp(s.clvAvg, -5, 5) : 0
  return round(s.roi * 100 * confidence + s.units * 0.3 + recentBump + clvBump, 2)
}

// Attach a grade to every group of a breakdown.
export function gradeBreakdown(bets, dim, unitSize, now, opts) {
  return buildBreakdown(bets, dim, unitSize, now).map((g) => ({
    ...g,
    grade: gradeArea(g.stats, g.recent30, opts),
  }))
}

// ---------------------------------------------------------------------------
// Advisor Summary
// ---------------------------------------------------------------------------

export function buildAdvisorSummary(bets, unitSize, now, opts = {}) {
  // Grade markets within each league so e.g. WNBA and NBA "Player Assists" are
  // judged separately rather than blended into one misleading number.
  const markets = gradeBreakdown(bets, 'leagueMarket', unitSize, now, opts)

  const keep = markets
    .filter((g) => (g.grade.label === 'Hammer' || g.grade.label === 'Keep Betting') && g.stats.units > 0)
    .sort((a, b) => b.stats.units - a.stats.units || b.grade.score - a.grade.score)
    .slice(0, 3)

  const stop = markets
    .filter((g) => (g.grade.label === 'Cut' || g.grade.label === 'Reduce') && g.stats.totalProfit < 0)
    .sort((a, b) => a.stats.units - b.stats.units)
    .slice(0, 3)

  const biggestLeak = findBiggestLeak(bets, unitSize, now)
  const { best: bestTrend, worst: worstTrend } = findTrends(bets, unitSize, now)
  const discipline = analyzeDiscipline(bets, unitSize)
  const focus = buildFocus(markets, biggestLeak, bestTrend, worstTrend, discipline)

  return { markets, keep, stop, biggestLeak, bestTrend, worstTrend, discipline, focus }
}

// Scan several dimensions and surface the single worst money drain.
function findBiggestLeak(bets, unitSize, now) {
  const dims = ['leagueMarket', 'betType', 'sport', 'oddsRange', 'structure', 'category', 'sportsbook']
  let worst = null
  for (const dim of dims) {
    for (const g of buildBreakdown(bets, dim, unitSize, now)) {
      if (g.stats.bets < 10) continue
      if (g.stats.totalProfit >= 0) continue
      if (!worst || g.stats.units < worst.stats.units) {
        worst = { dimension: dim, ...g, grade: gradeArea(g.stats, g.recent30) }
      }
    }
  }
  return worst
}

function findTrends(bets, unitSize, now) {
  const recentStart = new Date(now.getTime() - 30 * DAY)
  const dims = ['leagueMarket', 'betType', 'sport']
  const candidates = []
  const seen = new Set()
  for (const dim of dims) {
    for (const g of buildBreakdown(bets, dim, unitSize, now)) {
      const recentBets = g.bets.filter((b) => b.date && b.date >= recentStart)
      if (recentBets.length < 4) continue
      const recent = computeStats(recentBets, unitSize)
      const id = `${dim}:${g.key}`
      if (seen.has(g.key)) continue
      seen.add(g.key)
      candidates.push({ dimension: dim, key: g.key, recent, longTerm: g.stats })
    }
  }
  candidates.sort((a, b) => b.recent.roi - a.recent.roi)
  const best = candidates[0] || null
  const worst = candidates.length ? candidates[candidates.length - 1] : null
  return { best, worst: worst && worst !== best ? worst : (candidates[candidates.length - 1] || null) }
}

// ---------------------------------------------------------------------------
// Bankroll discipline: is stake size / volume creeping up during losing runs?
// ---------------------------------------------------------------------------

export function analyzeDiscipline(bets, unitSize) {
  const settled = bets
    .filter((b) => b.date && (b.result === 'win' || b.result === 'loss' || b.result === 'push') && b.stake > 0)
    .sort((a, b) => a.date - b.date)

  const warnings = []
  const result = { hasWarning: false, warnings, chasing: null, monthly: null, overall: null }
  if (settled.length < 12) return result

  // 1) Chasing: stake size after a cold rolling window (prior 7 settled bets down)
  const WINDOW = 7
  let chaseSum = 0, chaseN = 0, baseSum = 0, baseN = 0
  for (let i = WINDOW; i < settled.length; i++) {
    const prev = settled.slice(i - WINDOW, i)
    const prevPL = prev.reduce((a, b) => a + (b.profit || 0), 0)
    const stake = settled[i].stake
    if (prevPL < 0) { chaseSum += stake; chaseN++ }
    else { baseSum += stake; baseN++ }
  }
  if (chaseN >= 5 && baseN >= 5) {
    const chaseAvg = chaseSum / chaseN
    const baseAvg = baseSum / baseN
    const ratio = baseAvg > 0 ? chaseAvg / baseAvg : 1
    result.chasing = {
      chaseAvg: round(chaseAvg), baseAvg: round(baseAvg), ratio: round(ratio, 2),
      chaseAvgUnits: round(chaseAvg / unitSize, 2), baseAvgUnits: round(baseAvg / unitSize, 2),
      chaseN, baseN,
    }
    if (ratio >= 1.2) {
      warnings.push({
        severity: ratio >= 1.5 ? 'high' : 'medium',
        title: 'Stake size rises when you are cold',
        detail: `Your average stake is ${Math.round((ratio - 1) * 100)}% higher right after a losing run (${fmtUnitsRaw(chaseAvg / unitSize)} vs ${fmtUnitsRaw(baseAvg / unitSize)} normally). That is textbook chasing — keep unit size flat regardless of recent results.`,
      })
    }
  }

  // 2) Monthly: do you stake more / bet more often in losing months?
  const months = new Map()
  for (const b of settled) {
    const key = `${b.date.getFullYear()}-${String(b.date.getMonth() + 1).padStart(2, '0')}`
    if (!months.has(key)) months.set(key, [])
    months.get(key).push(b)
  }
  const monthRows = [...months.entries()].map(([key, list]) => {
    const profit = list.reduce((a, b) => a + (b.profit || 0), 0)
    const stakeSum = list.reduce((a, b) => a + b.stake, 0)
    const days = new Set(list.map((b) => b.date.toDateString())).size
    return {
      key,
      profit: round(profit),
      bets: list.length,
      avgStake: round(stakeSum / list.length),
      betsPerDay: round(list.length / Math.max(1, days), 2),
    }
  })
  result.monthly = monthRows
  const losing = monthRows.filter((m) => m.profit < 0)
  const winning = monthRows.filter((m) => m.profit >= 0)
  if (losing.length >= 1 && winning.length >= 1) {
    const losStake = avg(losing.map((m) => m.avgStake))
    const winStake = avg(winning.map((m) => m.avgStake))
    const losVol = avg(losing.map((m) => m.betsPerDay))
    const winVol = avg(winning.map((m) => m.betsPerDay))
    if (winStake > 0 && losStake / winStake >= 1.2) {
      warnings.push({
        severity: 'medium',
        title: 'Bigger stakes in losing months',
        detail: `In months you finished down, your average stake was ${Math.round((losStake / winStake - 1) * 100)}% larger than in profitable months. Size bets off your bankroll, not off how the month is going.`,
      })
    }
    if (winVol > 0 && losVol / winVol >= 1.25) {
      warnings.push({
        severity: 'medium',
        title: 'More volume in losing months',
        detail: `You place ${Math.round((losVol / winVol - 1) * 100)}% more bets per active day in losing months. Forcing volume to win money back usually deepens the hole.`,
      })
    }
  }

  result.overall = {
    avgStakeUnits: round(avg(settled.map((b) => b.stake)) / unitSize, 2),
    maxStakeUnits: round(Math.max(...settled.map((b) => b.stake)) / unitSize, 2),
  }
  result.hasWarning = warnings.length > 0
  return result
}

// ---------------------------------------------------------------------------
// Focus recommendation (plain English)
// ---------------------------------------------------------------------------

function buildFocus(markets, leak, best, worst, discipline) {
  const lines = []
  const hammers = markets.filter((m) => m.grade.label === 'Hammer')
  const keeps = markets.filter((m) => m.grade.label === 'Keep Betting' && m.stats.units > 0)
  const cuts = markets.filter((m) => m.grade.label === 'Cut')

  if (hammers.length) {
    lines.push(`Lean into your edges: ${list(hammers.slice(0, 3).map((m) => m.key))}. These are your proven, repeatable winners — they deserve your biggest (but still disciplined) stakes.`)
  } else if (keeps.length) {
    lines.push(`Concentrate volume on ${list(keeps.slice(0, 3).map((m) => m.key))}, your most reliable markets, rather than spreading thin across everything.`)
  } else {
    lines.push('No market has cleared the bar for a confident edge yet. Keep stakes small and uniform while you build a larger sample.')
  }

  if (cuts.length) {
    lines.push(`Stop betting ${list(cuts.slice(0, 3).map((m) => m.key))} for the next 30 days. There is no evidence of an edge there and it is draining your bankroll.`)
  } else if (leak) {
    lines.push(`Plug your biggest leak — ${leak.key} (${leak.dimension}) — which has cost you ${fmtUnits(leak.stats.units)}. Either cut it or drop to minimum stakes until it proves itself.`)
  }

  if (worst && worst.recent.roi < -0.05) {
    lines.push(`Watch ${worst.key}: it is cold over the last 30 days (${pct(worst.recent.roi)} ROI). Don't try to force it back.`)
  }
  if (discipline.hasWarning) {
    lines.push('Most important: fix your staking discipline (see the bankroll warning below). Flat, bankroll-based unit sizing will help more than any single market change.')
  }
  return lines
}

// --- formatting helpers ----------------------------------------------------

function pct(x) {
  if (x == null) return '—'
  return `${(x * 100).toFixed(1)}%`
}
function fmtUnits(u) {
  if (u == null) return '—'
  const sign = u > 0 ? '+' : ''
  return `${sign}${u.toFixed(2)}u`
}
function fmtUnitsRaw(u) {
  return `${u.toFixed(2)}u`
}
function list(arr) {
  if (!arr.length) return ''
  if (arr.length === 1) return arr[0]
  if (arr.length === 2) return `${arr[0]} and ${arr[1]}`
  return `${arr.slice(0, -1).join(', ')}, and ${arr[arr.length - 1]}`
}
function avg(arr) {
  const a = arr.filter((n) => typeof n === 'number' && !Number.isNaN(n))
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)) }

export { pct, fmtUnits }
