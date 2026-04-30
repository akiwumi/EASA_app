"""
SEO Pipeline Orchestrator
Runs all agents in the correct sequence.

Usage:
  python pipeline.py setup          # Run once: research + keywords + strategy
  python pipeline.py article [N]    # Write article N from calendar (default: next unwritten)
  python pipeline.py backlinks      # Find this month's backlink opportunities
  python pipeline.py daily          # Auto: write next pending article
  python pipeline.py full           # Run everything from scratch
"""
import json
import sys
import pathlib
from datetime import date
from typing import Optional

import config

BASE_DIR = pathlib.Path(__file__).parent


def _get_month() -> str:
    return date.today().strftime("%Y-%m")


def _next_article_number(month: str) -> int:
    """Return the next article number that hasn't been written yet."""
    cal_path = config.STRATEGY_DIR / f"content_calendar_{month}.json"
    if not cal_path.exists():
        return 1

    calendar = json.loads(cal_path.read_text())
    total = len(calendar.get("articles", []))

    # Check which articles exist
    articles_dir = config.ARTICLES_DIR
    written_slugs = {f.stem.split("-", 3)[-1] for f in articles_dir.glob("*.md")} if articles_dir.exists() else set()

    for i in range(1, total + 1):
        articles = calendar.get("articles", [])
        article = next(
            (a for a in articles if a.get("publishing_order") == i),
            articles[min(i - 1, len(articles) - 1)] if articles else None,
        )
        if article and article.get("slug", "") not in written_slugs:
            return i
    return total + 1  # All written


def cmd_setup(month: Optional[str] = None):
    """Full monthly setup: research + keywords + strategy."""
    from agents import research_agent, keyword_agent, content_strategy

    print("\n" + "=" * 60)
    print("PHASE 1: Market & Competitor Research")
    print("=" * 60)
    research_agent.run()

    print("\n" + "=" * 60)
    print("PHASE 2: Keyword Research (200+ keywords)")
    print("=" * 60)
    keyword_agent.run()

    print("\n" + "=" * 60)
    print("PHASE 3: Content Calendar (30 articles)")
    print("=" * 60)
    content_strategy.run(month=month)

    print("\n✓ Setup complete. Ready to start writing articles.")


def cmd_article(n: Optional[int] = None, month: Optional[str] = None):
    """Write a single article from the calendar."""
    from agents import article_writer

    if not month:
        month = _get_month()
    if not n:
        n = _next_article_number(month)
        print(f"  Auto-selected article #{n}")

    article_writer.run_from_calendar(month=month, article_number=n)


def cmd_daily():
    """Write the next pending article for this month."""
    month = _get_month()
    n = _next_article_number(month)

    cal_path = config.STRATEGY_DIR / f"content_calendar_{month}.json"
    if not cal_path.exists():
        print(f"No content calendar found for {month}. Run: python pipeline.py setup")
        return

    calendar = json.loads(cal_path.read_text())
    total = len(calendar.get("articles", []))

    if n > total:
        print(f"All {total} articles for {month} have been written!")
        return

    print(f"Writing article {n}/{total} for {month}…")
    cmd_article(n=n, month=month)


def cmd_backlinks(month: Optional[str] = None):
    """Find this month's backlink opportunities."""
    from agents import backlink_agent
    backlink_agent.run(month=month)


def cmd_full():
    """Run setup then write all 30 articles and find backlinks."""
    month = _get_month()
    cmd_setup(month=month)

    print("\n" + "=" * 60)
    print("PHASE 4: Writing all 30 articles")
    print("=" * 60)
    for i in range(1, config.MONTHLY_TARGETS["articles"] + 1):
        print(f"\n--- Article {i}/{config.MONTHLY_TARGETS['articles']} ---")
        cmd_article(n=i, month=month)

    print("\n" + "=" * 60)
    print("PHASE 5: Backlink Research")
    print("=" * 60)
    cmd_backlinks(month=month)

    print("\n✓ Full pipeline complete!")


def cmd_status():
    """Show pipeline status for this month."""
    month = _get_month()
    print(f"\n=== SEO Pipeline Status — {month} ===\n")

    # Keywords
    kw_path = config.KEYWORDS_DIR / "keyword_database.json"
    if kw_path.exists():
        kw = json.loads(kw_path.read_text())
        total_kw = sum(len(c.get("keywords", [])) for c in kw.get("clusters", []))
        print(f"  Keywords: {total_kw} keywords in {len(kw.get('clusters', []))} clusters")
    else:
        print("  Keywords: not generated yet")

    # Calendar
    cal_path = config.STRATEGY_DIR / f"content_calendar_{month}.json"
    if cal_path.exists():
        cal = json.loads(cal_path.read_text())
        planned = len(cal.get("articles", []))
        print(f"  Content calendar: {planned} articles planned")
    else:
        print("  Content calendar: not generated yet")

    # Articles written
    articles = list(config.ARTICLES_DIR.glob("*.md")) if config.ARTICLES_DIR.exists() else []
    month_articles = [a for a in articles if a.stem.startswith(month)]
    print(f"  Articles written this month: {len(month_articles)}/{config.MONTHLY_TARGETS['articles']}")
    for a in sorted(month_articles)[:5]:
        print(f"    - {a.stem}")
    if len(month_articles) > 5:
        print(f"    … and {len(month_articles) - 5} more")

    # Backlinks
    bl_path = config.BACKLINKS_DIR / f"opportunities_{month}.json"
    if bl_path.exists():
        bl = json.loads(bl_path.read_text())
        opps = bl.get("opportunities", [])
        print(f"  Backlink opportunities: {len(opps)} found")
    else:
        print("  Backlinks: not researched yet")

    print()


# ── CLI entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"

    if cmd == "setup":
        cmd_setup()
    elif cmd == "article":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else None
        cmd_article(n=n)
    elif cmd == "daily":
        cmd_daily()
    elif cmd == "backlinks":
        cmd_backlinks()
    elif cmd == "full":
        cmd_full()
    elif cmd == "status":
        cmd_status()
    else:
        print(__doc__)
        sys.exit(1)
