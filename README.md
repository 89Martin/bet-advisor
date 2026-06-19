# Bet Advisor

A web-based **betting advisor** dashboard. Upload a PIKKIT CSV export of your
betting history and it parses, cleans, and analyzes it — then tells you in plain
English which bets to **hammer**, **keep**, **reduce**, **cut**, or **watch**.

Everything runs locally in your browser. No data is uploaded anywhere.

## Quick start

```bash
npm install
npm run dev      # opens http://localhost:5173
```

Then drag your PIKKIT CSV onto the upload screen (or use the included
`sample-pikkit.csv` to try it out).

```bash
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## What it does

**Parsing & cleaning**
- CSV parsing with PapaParse.
- Auto-detects columns for date, sport, league, bet type, market, odds, stake,
  result, profit/loss, sportsbook, and closing line — no manual mapping needed.
  (See the **Data** tab to confirm how your headers were mapped.)
- Normalizes results into win / loss / push / void (cash-outs are settled by
  realized profit; missing results are inferred from profit).
- Normalizes free-text bets into clean market labels (Moneyline, Spread,
  Total, Player Points, Anytime TD, …) so breakdowns are meaningful.
- Detects singles vs parlays and player props vs game lines.
- Handles American or decimal odds, derives profit when absent, and computes CLV
  when a closing line is present.

**Metrics** — ROI, win rate, units won/lost, average odds, total stake, total
profit, bet count, average CLV, plus the win rate needed to break even.

**Breakdowns** — by sport, league, bet type, market, sportsbook, odds range,
stake size, singles vs parlays, and props vs game lines. Sortable graded table +
units chart.

**Trends** — Last 7 / 15 / 30 days, this month, and all-time filters, plus a
recent-vs-long-term comparison so you know when you're running hot or cold.

**Advisor engine** — grades every betting area:

| Verdict | Meaning |
|---|---|
| 🟢 **Hammer** | Positive ROI & units, ≥20 bets, positive recent 30-day trend, not reliant on one big win |
| 🟢 **Keep Betting** | Positive long-term ROI *or* positive recent trend with a solid sample |
| 🔵 **Watchlist** | <20 bets but showing early promise |
| 🟠 **Reduce** | Weak ROI, inconsistent recent trend, or thin sample |
| 🔴 **Cut** | Negative ROI, negative recent trend, poor win rate, no evidence of an edge |

**Advisor Summary** — top 3 markets to keep, top 3 to stop, your biggest leak,
best/worst recent trends, a recommended focus for the next 30 days, and a
**bankroll discipline** warning if your stake size or bet volume creeps up during
losing stretches (chasing detection).

## Tech

React · Vite · Tailwind CSS v4 · Recharts · PapaParse · TanStack Table.

## Notes

- **1 unit** is set from your median stake by default; adjust it in the top bar.
- Recent-window calculations use the most recent bet in your file as "today",
  so older exports still show meaningful 7/30-day windows.
- `generate_sample.py` builds the demo `sample-pikkit.csv` (requires Python).

*Not financial advice — bet responsibly.*
