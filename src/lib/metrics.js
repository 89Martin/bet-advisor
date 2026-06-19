// ---------------------------------------------------------------------------
// Performance metrics: aggregate stats, breakdowns, trends, time series
// ---------------------------------------------------------------------------
import { decimalToAmerican } from './parse.js'

const DAY = 24 * 60 * 60 * 1000

export function median(nums) {
  const a = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n)).sort((x, y) => x - y)
  if (!a.length) return 0
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}

// A reasonable default "unit" = median stake of settled bets.
export function defaultUnitSize(bets) {
  const stakes = bets.map((b) => b.stake).filter((s) => s > 0)
  const m = median(stakes)
  return m > 0 ? round(m, 2) : 1
}

export function referenceDate(bets) {
  let max = null
  for (const b of bets) if (b.date && (!max || b.date > max)) max = b.date
  return max || new Date()
}

function round(n, p = 2) {
  const f = Math.pow(10, p)
  return Math.round(n * f) / f
}

// --- core aggregate --------------------------------------------------------

export function computeStats(bets, unitSize = 1) {
  let wins = 0, losses = 0, pushes = 0, voids = 0
  let totalStake = 0, totalProfit = 0
  let oddsDecSum = 0, oddsCount = 0
  let stakeSum = 0, stakeCount = 0
  let clvSum = 0, clvCount = 0
  let maxWin = 0

  for (const b of bets) {
    totalProfit += b.profit || 0
    if (b.result === 'win') wins++
    else if (b.result === 'loss') losses++
    else if (b.result === 'push') pushes++
    else if (b.result === 'void') voids++

    if (b.result === 'win' || b.result === 'loss' || b.result === 'push') {
      totalStake += b.stake || 0
    }
    if (b.decimalOdds) { oddsDecSum += b.decimalOdds; oddsCount++ }
    if (b.stake > 0) { stakeSum += b.stake; stakeCount++ }
    if (b.decimalOdds && b.closingDecimal) {
      clvSum += b.decimalOdds / b.closingDecimal - 1
      clvCount++
    }
    if ((b.profit || 0) > maxWin) maxWin = b.profit
  }

  const decided = wins + losses
  const avgDecimal = oddsCount ? oddsDecSum / oddsCount : null
  const winRate = decided ? wins / decided : 0
  const roi = totalStake ? totalProfit / totalStake : 0

  return {
    bets: bets.length,
    wins, losses, pushes, voids, decided,
    winRate,
    breakevenWinRate: avgDecimal ? 1 / avgDecimal : null,
    totalStake: round(totalStake),
    totalProfit: round(totalProfit),
    roi,
    units: round(totalProfit / unitSize, 2),
    stakedUnits: round(totalStake / unitSize, 2),
    avgDecimalOdds: avgDecimal ? round(avgDecimal, 3) : null,
    avgAmericanOdds: avgDecimal ? decimalToAmerican(avgDecimal) : null,
    avgStake: stakeCount ? round(stakeSum / stakeCount) : 0,
    avgStakeUnits: stakeCount ? round(stakeSum / stakeCount / unitSize, 2) : 0,
    clvAvg: clvCount ? round((clvSum / clvCount) * 100, 2) : null,
    clvCount,
    maxWin: round(maxWin),
    maxProfitShare: totalProfit > 0 ? maxWin / totalProfit : 0,
  }
}

// --- date ranges -----------------------------------------------------------

export const RANGES = [
  { id: 'all', label: 'All-time' },
  { id: '7', label: 'Last 7 days' },
  { id: '15', label: 'Last 15 days' },
  { id: '30', label: 'Last 30 days' },
  { id: 'mtd', label: 'This month' },
]

export function rangeStart(range, now) {
  const d = new Date(now)
  switch (range) {
    case '7': return new Date(d.getTime() - 7 * DAY)
    case '15': return new Date(d.getTime() - 15 * DAY)
    case '30': return new Date(d.getTime() - 30 * DAY)
    case 'mtd': return new Date(d.getFullYear(), d.getMonth(), 1)
    default: return null
  }
}

export function filterByRange(bets, range, now) {
  const start = rangeStart(range, now)
  if (!start) return bets
  return bets.filter((b) => b.date && b.date >= start)
}

export function lastNDays(bets, n, now) {
  const start = new Date(now.getTime() - n * DAY)
  return bets.filter((b) => b.date && b.date >= start)
}

// --- buckets ---------------------------------------------------------------

export function oddsBucket(a) {
  if (a == null) return { key: 'Unknown', order: 99 }
  if (a <= -250) return { key: 'Heavy favorite (≤ -250)', order: 0 }
  if (a <= -150) return { key: 'Favorite (-249 to -150)', order: 1 }
  if (a <= -110) return { key: 'Slight favorite (-149 to -110)', order: 2 }
  if (a < 110) return { key: "Pick'em (-109 to +109)", order: 3 }
  if (a <= 150) return { key: 'Slight dog (+110 to +150)', order: 4 }
  if (a <= 250) return { key: 'Underdog (+151 to +250)', order: 5 }
  return { key: 'Longshot (≥ +251)', order: 6 }
}

export function stakeBucket(stakeUnits) {
  if (stakeUnits == null) return { key: 'Unknown', order: 99 }
  if (stakeUnits < 0.5) return { key: 'Micro (< 0.5u)', order: 0 }
  if (stakeUnits < 1) return { key: 'Small (0.5–1u)', order: 1 }
  if (stakeUnits < 2) return { key: 'Standard (1–2u)', order: 2 }
  if (stakeUnits <= 3) return { key: 'Large (2–3u)', order: 3 }
  return { key: 'Huge (> 3u)', order: 4 }
}

// --- breakdowns ------------------------------------------------------------

export const DIMENSIONS = [
  { id: 'leagueMarket', label: 'Market by League' },
  { id: 'sport', label: 'Sport' },
  { id: 'league', label: 'League' },
  { id: 'betType', label: 'Bet Type' },
  { id: 'market', label: 'Market (all leagues)' },
  { id: 'sportsbook', label: 'Sportsbook' },
  { id: 'oddsRange', label: 'Odds Range' },
  { id: 'stakeSize', label: 'Stake Size' },
  { id: 'structure', label: 'Singles vs Parlays' },
  { id: 'category', label: 'Props vs Game Lines' },
]

// "WNBA Player Assists" — market prefixed by its league (or sport) so the same
// market in different leagues is graded separately.
export function leagueMarketKey(bet) {
  const lg = bet.league && bet.league !== 'Unknown'
    ? bet.league
    : bet.sport && bet.sport !== 'Unknown'
      ? bet.sport
      : ''
  return lg ? `${lg} ${bet.market}` : (bet.market || 'Unknown')
}

export function dimensionKey(bet, dim, unitSize) {
  switch (dim) {
    case 'sport': return { key: bet.sport || 'Unknown', order: 0 }
    case 'league': return { key: bet.league || 'Unknown', order: 0 }
    case 'betType': return { key: bet.betType || 'Unknown', order: 0 }
    case 'market': return { key: bet.market || 'Unknown', order: 0 }
    case 'leagueMarket': return { key: leagueMarketKey(bet), order: 0 }
    case 'sportsbook': return { key: bet.sportsbook || 'Unknown', order: 0 }
    case 'oddsRange': return oddsBucket(bet.odds)
    case 'stakeSize': return stakeBucket(unitSize ? bet.stake / unitSize : null)
    case 'structure': return { key: bet.isParlay ? 'Parlay' : 'Single', order: bet.isParlay ? 1 : 0 }
    case 'category': return { key: bet.category === 'prop' ? 'Player Prop' : 'Game Line', order: bet.category === 'prop' ? 1 : 0 }
    default: return { key: 'Unknown', order: 0 }
  }
}

// Group bets by dimension and compute stats + a recent (30d) sub-window for each.
export function buildBreakdown(bets, dim, unitSize, now) {
  const groups = new Map()
  for (const b of bets) {
    const { key, order } = dimensionKey(b, dim, unitSize)
    if (!groups.has(key)) groups.set(key, { key, order, bets: [] })
    groups.get(key).bets.push(b)
  }
  const recentStart = new Date(now.getTime() - 30 * DAY)
  const out = []
  for (const g of groups.values()) {
    const stats = computeStats(g.bets, unitSize)
    const recentBets = g.bets.filter((b) => b.date && b.date >= recentStart)
    const recent30 = computeStats(recentBets, unitSize)
    out.push({ key: g.key, order: g.order, stats, recent30, bets: g.bets })
  }
  // Default ordering: by display order, then by units descending.
  out.sort((a, b) => a.order - b.order || b.stats.units - a.stats.units)
  return out
}

// --- time series -----------------------------------------------------------

// Cumulative profit (units) across settled bets, in chronological order.
export function equityCurve(bets, unitSize) {
  const settled = bets
    .filter((b) => b.date && (b.result === 'win' || b.result === 'loss' || b.result === 'push'))
    .sort((a, b) => a.date - b.date)
  let cum = 0
  return settled.map((b, i) => {
    cum += (b.profit || 0) / unitSize
    return {
      i: i + 1,
      date: b.date,
      label: b.date.toLocaleDateString(),
      units: round(cum, 2),
      profit: round(cum * unitSize, 2),
    }
  })
}

export function monthlySeries(bets, unitSize) {
  const map = new Map()
  for (const b of bets) {
    if (!b.date) continue
    const key = `${b.date.getFullYear()}-${String(b.date.getMonth() + 1).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(b)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, list]) => {
      const s = computeStats(list, unitSize)
      const label = new Date(key + '-01').toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
      return { key, label, units: s.units, profit: s.totalProfit, bets: s.bets, roi: s.roi, avgStake: s.avgStake, winRate: s.winRate }
    })
}

// Profit (units) per dimension key, for bar charts.
export function profitByDimension(bets, dim, unitSize, now) {
  return buildBreakdown(bets, dim, unitSize, now).map((g) => ({
    key: g.key,
    units: g.stats.units,
    profit: g.stats.totalProfit,
    roi: g.stats.roi,
    bets: g.stats.bets,
  }))
}

export { round }
