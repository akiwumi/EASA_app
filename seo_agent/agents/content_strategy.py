"""
Content Strategy Agent
Reads competitor research + keyword database.
Produces a 30-article monthly content calendar.
Output: output/strategy/content_calendar_YYYY-MM.json
"""
import json
import sys
import pathlib
from datetime import date

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

import config
from agent_loop import run_agent

SYSTEM_PROMPT = f"""
You are a senior content strategist for a B2B SaaS company in the aviation compliance niche.

Product: {config.NICHE["product_description"]}
Monthly article target: {config.MONTHLY_TARGETS["articles"]} articles
Word count per article: {config.MONTHLY_TARGETS["article_min_words"]}–{config.MONTHLY_TARGETS["article_max_words"]} words

Your job:
1. Read the competitor research file ('strategy/competitor_research.json') using read_file.
2. Read the keyword database ('keywords/keyword_database.json') using read_file.
3. Build a 30-article content calendar optimised for:
   - SEO traffic growth (prioritise high-value, lower-difficulty keywords)
   - Topical authority (cover clusters comprehensively — pillar + supporting articles)
   - Content variety (how-to guides, comparison articles, explainers, case studies, news analysis)
   - Funnel coverage (TOFU informational, MOFU comparison, BOFU product-led)

For each article provide:
- Slug (URL-friendly, keyword-rich)
- H1 title (compelling, includes primary keyword)
- Primary keyword
- Secondary keywords (3–5)
- Meta description (≤160 chars)
- Article type: guide / comparison / how-to / news-analysis / case-study / FAQ
- Funnel stage: TOFU / MOFU / BOFU
- Outline: H2 and H3 headings (6–8 sections)
- Internal link suggestions (which other planned articles to link to)
- Brief: 2–3 sentences on what the article should argue / prove
- Publishing order (1–30, prioritise quick-win keywords first)

Save to 'strategy/content_calendar_{{month}}.json' using save_file.
"""


def run(month: str = None):
    if not month:
        month = date.today().strftime("%Y-%m")

    print(f"=== CONTENT STRATEGY AGENT: Building {month} content calendar ===")

    user_prompt = f"""
Month: {month}

1. Read 'strategy/competitor_research.json'
2. Read 'keywords/keyword_database.json'
3. Plan 30 articles for this month covering the best SEO opportunities.
4. Prioritise: high commercial value, lower competition, strong topical cluster coverage.
5. Mix article types: pillar guides (3000+ is fine), how-to posts, comparison pieces, news analysis.
6. Save the calendar to 'strategy/content_calendar_{month}.json'.

Return a brief summary of the strategy after saving.
"""

    result = run_agent(
        system=SYSTEM_PROMPT,
        user_message=user_prompt,
        model=config.MODELS["strategy"],
        max_tokens=8192,
        max_iterations=20,
    )
    print("\n✓ Content calendar built.")
    return result


if __name__ == "__main__":
    run()
