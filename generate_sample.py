"""Generate a realistic PIKKIT-style CSV export for testing the Bet Advisor.

Builds ~350 bets across several markets with deliberate, advisor-detectable
patterns (a clear Hammer, a Cut, a Reduce, a Watchlist) plus a stake-chasing
streak so the bankroll-discipline warning fires.
"""
import csv
import random
from datetime import datetime, timedelta

random.seed(7)

END = datetime(2026, 6, 15, 20, 0)
START = END - timedelta(days=170)
UNIT = 25.0

BOOKS = ["DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN BET"]

NBA_PLAYERS = ["LeBron James", "Nikola Jokic", "Luka Doncic", "Jayson Tatum",
               "Anthony Edwards", "Shai Gilgeous-Alexander", "Devin Booker"]
NFL_PLAYERS = ["Patrick Mahomes", "Josh Allen", "Christian McCaffrey",
               "Tyreek Hill", "Ja'Marr Chase", "CeeDee Lamb"]
MLB_TEAMS = ["Dodgers", "Yankees", "Braves", "Astros", "Phillies", "Orioles"]
NHL_TEAMS = ["Oilers", "Panthers", "Rangers", "Avalanche", "Stars"]


def american_to_decimal(a):
    return 1 + a / 100 if a > 0 else 1 + 100 / abs(a)


def profit(odds, stake, status):
    if status == "Won":
        return round(stake * (american_to_decimal(odds) - 1), 2)
    if status == "Lost":
        return -stake
    return 0.0  # push / void


rows = []


def add(date, book, sport, league, bet_type, bet, odds, win_rate, stake_units,
        clv_edge=0.0, status_override=None):
    """clv_edge>0 means we beat the close (good); <0 means we got worse odds."""
    stake = round(UNIT * stake_units, 2)
    if status_override:
        status = status_override
    else:
        r = random.random()
        if r < 0.03:
            status = "Push"
        else:
            status = "Won" if random.random() < win_rate else "Lost"
    p = profit(odds, stake, status)
    # closing odds: positive clv_edge => our odds are better than close
    drift = int(round(-clv_edge * abs(odds) * 0.12)) + random.randint(-6, 6)
    closing = odds + drift
    rows.append({
        "Date": date.strftime("%Y-%m-%d %H:%M"),
        "Sportsbook": book,
        "Sport": sport,
        "League": league,
        "Bet Type": bet_type,
        "Bet": bet,
        "Odds": (f"+{odds}" if odds > 0 else str(odds)),
        "Closing Odds": (f"+{closing}" if closing > 0 else str(closing)),
        "Stake": f"{stake:.2f}",
        "Status": status,
        "Profit": f"{p:.2f}",
    })


def rdate():
    return START + timedelta(seconds=random.randint(0, int((END - START).total_seconds())))


def recent_date(days):
    return END - timedelta(seconds=random.randint(0, days * 86400))


# --- HAMMER: NBA Player Points, strong + winning recently ------------------
for _ in range(46):
    pl = random.choice(NBA_PLAYERS)
    line = random.choice([23.5, 25.5, 27.5, 19.5, 31.5])
    odds = random.choice([-115, -110, -120, +100, -105])
    d = rdate()
    add(d, random.choice(BOOKS), "Basketball", "NBA", "Single",
        f"{pl} Over {line} Points", odds, 0.575, random.choice([1, 1, 1.5, 2]), clv_edge=1.2)
for _ in range(14):  # recent reinforcement
    pl = random.choice(NBA_PLAYERS)
    add(recent_date(28), random.choice(BOOKS), "Basketball", "NBA", "Single",
        f"{pl} Over 24.5 Points", -110, 0.60, random.choice([1, 1.5, 2]), clv_edge=1.5)

# --- KEEP BETTING: NBA Spread, modestly profitable -------------------------
for _ in range(44):
    d = rdate()
    add(d, random.choice(BOOKS), "Basketball", "NBA", "Single",
        f"{random.choice(['Lakers','Celtics','Nuggets','Heat'])} -3.5 Spread",
        -110, 0.535, random.choice([1, 1, 2]), clv_edge=0.4)

# --- REDUCE: MLB Moneyline, slightly negative, choppy ----------------------
for _ in range(52):
    d = rdate()
    odds = random.choice([-130, -150, +120, +135, -110])
    wr = 0.55 if odds < 0 else 0.40
    add(d, random.choice(BOOKS), "Baseball", "MLB", "Single",
        f"{random.choice(MLB_TEAMS)} Moneyline", odds, wr - 0.04, random.choice([1, 1, 1.5]), clv_edge=-0.3)

# --- CUT: NFL parlays, bleeding money --------------------------------------
for _ in range(34):
    d = rdate()
    legs = random.randint(2, 4)
    odds = random.choice([+260, +320, +450, +600, +180])
    add(d, random.choice(BOOKS), "Football", "NFL", f"{legs}-Leg Parlay",
        f"{legs}-Team Parlay", odds, 0.22, random.choice([0.5, 1, 1]), clv_edge=-1.5)

# --- CUT-ish: NFL Anytime TD, negative and cold recently -------------------
for _ in range(28):
    d = rdate()
    add(d, random.choice(BOOKS), "Football", "NFL", "Single",
        f"{random.choice(NFL_PLAYERS)} Anytime TD", +160, 0.34, random.choice([0.5, 1]), clv_edge=-0.8)

# --- WATCHLIST: NHL Puck Line, small sample but promising ------------------
for _ in range(13):
    d = rdate()
    add(d, random.choice(BOOKS), "Hockey", "NHL", "Single",
        f"{random.choice(NHL_TEAMS)} -1.5 Puck Line", +145, 0.50, 1, clv_edge=1.0)

# --- NEUTRAL: Soccer totals, roughly break-even ----------------------------
for _ in range(24):
    d = rdate()
    add(d, random.choice(BOOKS), "Soccer", "EPL", "Single",
        "Over 2.5 Goals", -105, 0.51, 1, clv_edge=0.0)

# --- CHASING STREAK: a brutal cold month with escalating stakes ------------
# Simulate a ~3-week losing run in April where stakes balloon (chasing).
chase_start = datetime(2026, 4, 8, 18, 0)
stake_u = 1.0
for i in range(26):
    d = chase_start + timedelta(hours=i * 14)
    # losses dominate; after each loss the bettor sizes up
    won = random.random() < 0.33
    status = "Won" if won else "Lost"
    add(d, random.choice(BOOKS), "Basketball", "NBA", "Single",
        f"{random.choice(NBA_PLAYERS)} Over 26.5 Points", -115, 0.0,
        round(stake_u, 2), clv_edge=-1.0, status_override=status)
    if not won:
        stake_u = min(stake_u * 1.35, 6.0)  # chase: increase stake after a loss
    else:
        stake_u = max(1.0, stake_u * 0.7)

rows.sort(key=lambda r: r["Date"])

with open("sample-pikkit.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader()
    w.writerows(rows)

print(f"Wrote {len(rows)} bets to sample-pikkit.csv")
