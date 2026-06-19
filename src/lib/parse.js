// ---------------------------------------------------------------------------
// CSV parsing, column auto-detection, and bet normalization
// ---------------------------------------------------------------------------
import Papa from 'papaparse'

// Canonical fields we try to locate in the uploaded CSV. Order matters: more
// specific fields are listed first so the greedy assignment resolves conflicts
// (e.g. "stake amount" goes to stake, not market) sensibly.
const FIELD_SYNONYMS = {
  closing: {
    exact: ['closing line', 'closing odds', 'closing price', 'close odds', 'close line', 'clv', 'cl odds', 'closing'],
    contains: ['closing', 'close line', 'clv'],
  },
  profit: {
    exact: ['profit', 'net profit', 'profit/loss', 'profit loss', 'p/l', 'pnl', 'p l', 'net', 'net return', 'won', 'winnings', 'net win', 'return amount', 'win/loss', 'result amount'],
    contains: ['profit', 'pnl', 'p/l', 'net', 'winnings'],
  },
  stake: {
    exact: ['stake', 'risk', 'wager amount', 'bet amount', 'stake amount', 'risk amount', 'amount', 'amount wagered', 'wagered', 'bet size', 'to win risk'],
    contains: ['stake', 'risk', 'wagered', 'amount'],
  },
  odds: {
    exact: ['odds', 'price', 'american odds', 'decimal odds', 'odd', 'bet odds', 'placed odds', 'taken odds'],
    contains: ['odds', 'price'],
  },
  result: {
    exact: ['result', 'status', 'outcome', 'bet status', 'settlement', 'grade', 'bet result', 'win/loss/push'],
    contains: ['result', 'status', 'outcome', 'settle', 'grade'],
  },
  date: {
    exact: ['date', 'datetime', 'date/time', 'timestamp', 'placed', 'date placed', 'settled', 'settled date', 'date settled', 'settled at', 'accepted', 'accepted at', 'time placed', 'bet date', 'placed at', 'date accepted'],
    contains: ['date', 'placed', 'settled', 'accepted', 'timestamp'],
  },
  sportsbook: {
    exact: ['sportsbook', 'book', 'bookmaker', 'book name', 'site', 'operator', 'sports book'],
    contains: ['sportsbook', 'bookmaker', 'book', 'operator'],
  },
  league: {
    exact: ['league', 'competition', 'tournament', 'comp'],
    contains: ['league', 'competition', 'tournament'],
  },
  sport: {
    exact: ['sport', 'sport name'],
    contains: ['sport'],
  },
  betType: {
    exact: ['bet type', 'type', 'wager type', 'bet category', 'category', 'bet kind', 'wager category'],
    contains: ['bet type', 'wager type', 'category'],
  },
  market: {
    exact: ['market', 'bet market', 'bet name', 'bet', 'wager', 'bet description', 'description', 'selection', 'pick', 'bet info', 'event', 'wager description', 'bet details'],
    contains: ['market', 'description', 'selection', 'bet info', 'event', 'details'],
  },
}

function normHeader(h) {
  return String(h || '')
    .toLowerCase()
    .replace(/[_\-./\\]+/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreHeader(field, header) {
  const syn = FIELD_SYNONYMS[field]
  const h = normHeader(header)
  if (!h) return 0
  let best = 0
  for (const e of syn.exact) {
    if (h === e) best = Math.max(best, 100)
    else if (h.startsWith(e + ' ') || h.endsWith(' ' + e)) best = Math.max(best, 72)
  }
  for (const c of syn.contains) {
    if (h.includes(c)) best = Math.max(best, 45)
  }
  return best
}

// Greedy assignment of headers -> canonical fields based on best score.
export function detectColumns(headers) {
  const fields = Object.keys(FIELD_SYNONYMS)
  const pairs = []
  for (const field of fields) {
    for (const header of headers) {
      const s = scoreHeader(field, header)
      if (s > 0) pairs.push({ field, header, score: s })
    }
  }
  // Tie-break by the field order in FIELD_SYNONYMS (more specific first).
  const fieldRank = Object.fromEntries(fields.map((f, i) => [f, i]))
  pairs.sort((a, b) => b.score - a.score || fieldRank[a.field] - fieldRank[b.field])

  const mapping = {}
  const usedHeaders = new Set()
  for (const p of pairs) {
    if (mapping[p.field] || usedHeaders.has(p.header)) continue
    mapping[p.field] = p.header
    usedHeaders.add(p.header)
  }
  return mapping
}

// --- value parsers ---------------------------------------------------------

export function parseMoney(v) {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  let s = String(v).trim()
  if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) {
    neg = true
    s = s.slice(1, -1)
  }
  s = s.replace(/[$£€,\s]/g, '').replace(/%$/, '')
  if (s === '-' || s === '+' || s === '') return null
  const n = parseFloat(s)
  if (Number.isNaN(n)) return null
  return neg ? -Math.abs(n) : n
}

// Parse odds in either American (+150, -110) or decimal (2.50) form and return
// a unified shape with both representations.
export function parseOdds(v) {
  if (v == null || v === '') return { american: null, decimal: null }
  let s = String(v).trim().replace(/,/g, '')
  if (!s) return { american: null, decimal: null }
  // "EVEN" / "PK" → +100
  if (/^(even|evens|pk|pick'?em)$/i.test(s)) return { american: 100, decimal: 2.0 }
  const n = parseFloat(s)
  if (Number.isNaN(n)) return { american: null, decimal: null }

  const hasSign = /^[+-]/.test(s)
  const looksDecimal = !hasSign && n > 0 && n < 30 && (s.includes('.') || n < 100)
  if (looksDecimal && n >= 1) {
    return { american: decimalToAmerican(n), decimal: n }
  }
  // Treat as American
  return { american: n, decimal: americanToDecimal(n) }
}

export function americanToDecimal(a) {
  if (a == null) return null
  if (a > 0) return 1 + a / 100
  if (a < 0) return 1 + 100 / Math.abs(a)
  return null
}

export function decimalToAmerican(d) {
  if (d == null || d <= 1) return null
  if (d >= 2) return Math.round((d - 1) * 100)
  return Math.round(-100 / (d - 1))
}

export function parseDate(v) {
  if (v == null || v === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  const s = String(v).trim()
  if (!s) return null

  // ISO-ish: let the engine handle it (also covers timezone offsets)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.replace(' ', 'T'))
    if (!Number.isNaN(d.getTime())) return d
  }
  // US style m/d/yyyy[ hh:mm]
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?\s*([ap]m)?)?/i)
  if (m) {
    let [, mo, da, yr, hh, mi, ss, ap] = m
    yr = yr.length === 2 ? 2000 + parseInt(yr, 10) : parseInt(yr, 10)
    let hour = hh ? parseInt(hh, 10) : 0
    if (ap) {
      const pm = /p/i.test(ap)
      if (pm && hour < 12) hour += 12
      if (!pm && hour === 12) hour = 0
    }
    const d = new Date(yr, parseInt(mo, 10) - 1, parseInt(da, 10), hour, mi ? +mi : 0, ss ? +ss : 0)
    if (!Number.isNaN(d.getTime())) return d
  }
  const fallback = new Date(s)
  return Number.isNaN(fallback.getTime()) ? null : fallback
}

// --- classification --------------------------------------------------------

const RESULT_MAP = [
  { re: /\b(push|tie|tied|draw)\b/i, result: 'push' },
  { re: /\b(void|cancel|cancell?ed|refund(ed)?|no action|scratch(ed)?|dead heat)\b/i, result: 'void' },
  { re: /\b(half win|won|win|w|cash(ed)?(\s*out)?|graded win|winner|profit)\b/i, result: 'win' },
  { re: /\b(half loss|lost|loss|lose|l|graded loss|loser)\b/i, result: 'loss' },
]

export function normalizeResult(raw, profit) {
  const s = String(raw ?? '').trim().toLowerCase()
  // Cash-outs are settled by their realized profit.
  if (/cash(ed)?\s*out|cashout/.test(s)) {
    if (profit != null) return profit > 0 ? 'win' : profit < 0 ? 'loss' : 'push'
  }
  if (s) {
    if (/^(w|win|won)$/.test(s)) return 'win'
    if (/^(l|loss|lost|lose)$/.test(s)) return 'loss'
    for (const r of RESULT_MAP) if (r.re.test(s)) return r.result
  }
  // Fall back to profit sign when status is missing/unknown.
  if (profit != null) {
    if (profit > 0) return 'win'
    if (profit < 0) return 'loss'
    return 'push'
  }
  return 'unknown'
}

const PARLAY_RE = /\b(parlay|parlays|multi|multiple|acca|accumulator|sgp|same game parlay|teaser|round robin|combo)\b/i
export function detectParlay(betType, market, legs) {
  if (legs != null && legs > 1) return true
  return PARLAY_RE.test(`${betType || ''} ${market || ''}`)
}

const PROP_RE = /\b(prop|player|anytime|to score|to record|first basket|first td|first touchdown|points|rebounds|assists|pra|p\+r\+a|passing|rushing|receiving|reception|receptions|yards|strikeouts|home run|hits|rbi|shots on goal|sog|saves|double[- ]?double|triple[- ]?double|touchdown|td scorer|goalscorer|goal scorer|to hit|to make|longest)\b/i
const GAMELINE_RE = /\b(moneyline|money line|^ml$|spread|handicap|point spread|run line|runline|puck line|puckline|total|over\/under|o\/u|game total|team total|1x2|draw no bet|dnb|both teams to score|btts|first half|1st half|halftime|alternate)\b/i

export function detectCategory(betType, market, selection) {
  const blob = `${betType || ''} ${market || ''} ${selection || ''}`
  const bt = String(betType || '').toLowerCase()
  if (/\bprop/.test(bt)) return 'prop'
  if (PROP_RE.test(blob) && !/\bteam total\b/i.test(blob)) {
    // team totals are game lines even though "total" matches game-line regex
    return 'prop'
  }
  if (GAMELINE_RE.test(blob)) return 'game'
  return 'game'
}

// Normalize a free-text bet description into a clean, groupable market label.
const MARKET_PATTERNS = [
  // --- player props ---
  [/points?\s*\+\s*reb\w*\s*\+\s*ast|p\s*\+\s*r\s*\+\s*a|\bpra\b/i, 'Player PRA'],
  [/(points?|pts)\s*\+\s*(assists?|ast)/i, 'Player Pts+Ast'],
  [/(points?|pts)\s*\+\s*(reb\w*)/i, 'Player Pts+Reb'],
  [/(reb\w*)\s*\+\s*(assists?|ast)/i, 'Player Reb+Ast'],
  [/\b(three|3)[\s-]?point\w*|threes made|3\s*pt made|\b3pm\b/i, 'Player Threes'],
  [/\brebounds?\b/i, 'Player Rebounds'],
  [/\bassists?\b/i, 'Player Assists'],
  [/\bpoints?\b/i, 'Player Points'],
  [/passing\s*yards?|pass\s*yds/i, 'Passing Yards'],
  [/passing\s*(td|touchdown)s?/i, 'Passing TDs'],
  [/rushing\s*yards?|rush\s*yds/i, 'Rushing Yards'],
  [/receiving\s*yards?|rec\s*yds/i, 'Receiving Yards'],
  [/receptions?\b/i, 'Receptions'],
  [/anytime\s*(td|touchdown|scorer)|to score a td/i, 'Anytime TD'],
  [/first\s*(td|touchdown|scorer)/i, 'First TD'],
  [/strikeouts?\b|\bks?\b(?=.*(pitch|pitcher))/i, 'Strikeouts'],
  [/home\s*runs?\b|\bhr\b/i, 'Home Run'],
  [/total\s*bases/i, 'Total Bases'],
  [/\brbis?\b/i, 'RBIs'],
  [/\bhits\b/i, 'Hits'],
  [/shots\s*on\s*goal|\bsog\b/i, 'Shots on Goal'],
  [/goalie\s*saves|\bsaves\b/i, 'Goalie Saves'],
  [/anytime\s*goal|to score|goal\s*scorer|goalscorer/i, 'Anytime Goal'],
  // --- game lines ---
  [/money\s*line|\bml\b/i, 'Moneyline'],
  [/run\s*line|runline/i, 'Run Line'],
  [/puck\s*line|puckline/i, 'Puck Line'],
  [/spread|handicap|point\s*spread|\bats\b/i, 'Spread'],
  [/team\s*total/i, 'Team Total'],
  [/total|over\s*\/?\s*under|\bo\s*\/\s*u\b|game\s*total/i, 'Total (O/U)'],
  [/both\s*teams?\s*to\s*score|\bbtts\b/i, 'Both Teams to Score'],
  [/draw\s*no\s*bet|\bdnb\b/i, 'Draw No Bet'],
  [/1\s*x\s*2|match\s*result|3[\s-]?way/i, '1X2'],
]

function titleCase(s) {
  return String(s).toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

export function deriveMarket(raw, betType, category, isParlay) {
  if (isParlay) return 'Parlay (multi)'
  const blob = `${betType || ''} ${raw || ''}`
  for (const [re, label] of MARKET_PATTERNS) if (re.test(blob)) return label
  const r = clean(raw)
  if (r && r.length <= 24) return titleCase(r)
  const bt = clean(betType)
  if (bt && bt.length <= 24 && !/^(single|straight|parlay|multi)$/i.test(bt)) return titleCase(bt)
  return category === 'prop' ? 'Other Prop' : 'Other'
}

// Try to read a leg count from a parlay description like "3-leg parlay".
function readLegs(betType, market) {
  const m = `${betType || ''} ${market || ''}`.match(/(\d+)\s*[- ]?\s*(leg|legs|pick|picks|team|teams)\b/i)
  return m ? parseInt(m[1], 10) : null
}

// --- main entry ------------------------------------------------------------

export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: false,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => String(h).trim(),
      complete: (res) => {
        try {
          resolve(buildDataset(res.data, res.meta.fields || []))
        } catch (e) {
          reject(e)
        }
      },
      error: reject,
    })
  })
}

// Also support pasting raw CSV text.
export function parseCSVText(text) {
  const res = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => String(h).trim(),
  })
  return buildDataset(res.data, res.meta.fields || [])
}

function get(row, header) {
  if (!header) return undefined
  return row[header]
}

function buildDataset(rows, headers) {
  const mapping = detectColumns(headers)
  const bets = []
  let dropped = 0

  for (const row of rows) {
    const stake = parseMoney(get(row, mapping.stake))
    let profit = parseMoney(get(row, mapping.profit))
    const oddsRaw = get(row, mapping.odds)
    const { american, decimal } = parseOdds(oddsRaw)
    const rawResult = get(row, mapping.result)
    const result = normalizeResult(rawResult, profit)

    const betType = clean(get(row, mapping.betType))
    const rawMarket = clean(get(row, mapping.market))
    const legs = readLegs(betType, rawMarket)

    // Derive profit from result + odds when the column is absent.
    if (profit == null && stake != null) {
      if (result === 'win' && decimal) profit = stake * (decimal - 1)
      else if (result === 'loss') profit = -stake
      else if (result === 'push' || result === 'void') profit = 0
    }

    const date = parseDate(get(row, mapping.date))

    // Skip rows that carry no usable signal at all.
    if (stake == null && profit == null && !american && !date) {
      dropped++
      continue
    }

    const isParlay = detectParlay(betType, rawMarket, legs)
    const category = detectCategory(betType, rawMarket, rawMarket)

    bets.push({
      date,
      sport: clean(get(row, mapping.sport)) || inferSport(get(row, mapping.league)) || 'Unknown',
      league: clean(get(row, mapping.league)) || 'Unknown',
      betType: betType || 'Unknown',
      market: deriveMarket(rawMarket, betType, category, isParlay),
      description: rawMarket || betType || '',
      odds: american,
      decimalOdds: decimal,
      stake: stake ?? 0,
      result,
      rawResult: clean(rawResult) || '',
      profit: profit ?? 0,
      sportsbook: clean(get(row, mapping.sportsbook)) || 'Unknown',
      closingOdds: parseOdds(get(row, mapping.closing)).american,
      closingDecimal: parseOdds(get(row, mapping.closing)).decimal,
      isParlay,
      legs: legs ?? (isParlay ? null : 1),
      category,
      raw: row,
    })
  }

  // Sort chronologically (undated rows go last).
  bets.sort((a, b) => {
    if (!a.date && !b.date) return 0
    if (!a.date) return 1
    if (!b.date) return -1
    return a.date - b.date
  })

  return { bets, mapping, headers, droppedRows: dropped, totalRows: rows.length }
}

function clean(v) {
  if (v == null) return ''
  return String(v).trim()
}

// Light sport inference from a league name, used only when sport is missing.
const LEAGUE_TO_SPORT = [
  { re: /\b(nfl|ncaaf|cfb|college football|xfl|ufl)\b/i, sport: 'Football' },
  { re: /\b(nba|wnba|ncaab|cbb|college basketball|euroleague)\b/i, sport: 'Basketball' },
  { re: /\b(mlb|baseball|npb|kbo)\b/i, sport: 'Baseball' },
  { re: /\b(nhl|hockey|khl)\b/i, sport: 'Hockey' },
  { re: /\b(mls|epl|premier league|la liga|serie a|bundesliga|ligue 1|ucl|champions league|soccer|football club|fifa|uefa)\b/i, sport: 'Soccer' },
  { re: /\b(atp|wta|tennis)\b/i, sport: 'Tennis' },
  { re: /\b(ufc|mma|bellator)\b/i, sport: 'MMA' },
  { re: /\b(pga|golf|liv)\b/i, sport: 'Golf' },
]
function inferSport(league) {
  const s = clean(league)
  if (!s) return null
  for (const m of LEAGUE_TO_SPORT) if (m.re.test(s)) return m.sport
  return null
}
