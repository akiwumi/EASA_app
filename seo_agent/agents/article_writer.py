"""
Article Writer Agent
Takes a topic from the content calendar and produces a deep-researched,
SEO-optimised article of 1500–2000 words.

Output: output/articles/YYYY-MM-DD-<slug>.md
"""
from __future__ import annotations

import json
import sys
import pathlib
from datetime import date
from typing import Optional

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

import config
from agent_loop import run_agent

SYSTEM_PROMPT = f"""
You are a world-class SEO content writer specialising in aviation compliance, regulatory tech,
and flight training. You write for flight school compliance managers, safety officers,
and aviation training organisations (ATOs).

Product context: {config.NICHE["product_description"]}

Your writing process for each article:
1. RESEARCH PHASE — Use web_search and fetch_url to deeply research the topic:
   - Search for the latest EASA regulations, AMC/GM, opinions, and decisions related to the topic
   - Find what competitors have written and identify gaps / angles they missed
   - Look for real statistics, case studies, official EASA documents, and expert quotes
   - Research at least 5–8 sources before writing
2. OUTLINE PHASE — Follow the provided H2/H3 outline, but improve it if research reveals better angles
3. WRITING PHASE — Write the article:
   - Word count: {config.MONTHLY_TARGETS["article_min_words"]}–{config.MONTHLY_TARGETS["article_max_words"]} words
   - Tone: authoritative but accessible — like a compliance expert explaining to a busy manager
   - Include: real EASA regulation references, numbered lists, practical examples
   - Naturally include primary keyword in H1, first paragraph, 2–3 H2s, and conclusion
   - Add secondary keywords naturally throughout
   - End with a strong CTA paragraph mentioning the product
4. FORMATTING — Output clean Markdown with:
   - YAML frontmatter (title, slug, date, primary_keyword, secondary_keywords, meta_description, word_count)
   - H2 and H3 headings
   - Bullet lists and numbered steps where appropriate
   - Bold for key terms
   - Author note / disclaimer where appropriate

Save the final article using save_file to 'articles/<date>-<slug>.md'.
Also update 'strategy/articles_published.json' to record the published article.
"""


def run(
    article_brief: Optional[dict] = None,
    topic: Optional[str] = None,
    keyword: Optional[str] = None,
    today: Optional[str] = None,
):
    """
    Write one article.
    - article_brief: dict from content calendar (preferred)
    - topic + keyword: fallback for ad-hoc use
    """
    if not today:
        today = date.today().isoformat()

    month = today[:7]

    if article_brief:
        slug      = article_brief.get("slug", "article")
        title     = article_brief.get("title", topic or "Aviation Compliance Article")
        keyword   = article_brief.get("primary_keyword", keyword or "aviation compliance")
        secondary = article_brief.get("secondary_keywords", [])
        meta      = article_brief.get("meta_description", "")
        outline   = article_brief.get("outline", [])
        brief     = article_brief.get("brief", "")
        funnel    = article_brief.get("funnel_stage", "TOFU")
    else:
        slug      = (topic or "article").lower().replace(" ", "-")
        title     = topic or "Aviation Compliance Guide"
        keyword   = keyword or "aviation compliance"
        secondary = []
        meta      = ""
        outline   = []
        brief     = ""
        funnel    = "TOFU"

    print(f"=== ARTICLE WRITER: '{title}' ===")
    print(f"  Keyword: {keyword}")

    user_prompt = f"""
Write a {config.MONTHLY_TARGETS["article_min_words"]}–{config.MONTHLY_TARGETS["article_max_words"]}-word SEO article.

**Article details:**
- Title: {title}
- Slug: {slug}
- Primary keyword: {keyword}
- Secondary keywords: {", ".join(secondary) if secondary else "derive from topic"}
- Meta description: {meta or "write an engaging 155-char meta description"}
- Funnel stage: {funnel}
- Article brief: {brief or "Cover this topic comprehensively for aviation compliance professionals"}
- Outline to follow:
{chr(10).join(f"  - {h}" for h in outline) if outline else "  (develop your own outline from research)"}

**Your steps:**
1. Search for the latest information on: "{keyword}" in the EASA aviation compliance space
2. Find at least 5 credible sources (EASA website, aviation authority sites, industry publications)
3. Research what top-ranking articles cover and what they miss
4. Write the full article in Markdown with YAML frontmatter
5. Verify word count is {config.MONTHLY_TARGETS["article_min_words"]}–{config.MONTHLY_TARGETS["article_max_words"]} words
6. Save to 'articles/{today}-{slug}.md'

The article must be authoritative, practically useful, and naturally promote the EASA Compliance App
in the conclusion without being salesy.
"""

    result = run_agent(
        system=SYSTEM_PROMPT,
        user_message=user_prompt,
        model=config.MODELS["writing"],
        max_tokens=8192,
        max_iterations=30,
    )

    print(f"\n✓ Article saved: articles/{today}-{slug}.md")
    return result


def run_from_calendar(month: Optional[str] = None, article_number: int = 1):
    """
    Load the content calendar and write article number N.
    """
    if not month:
        month = date.today().strftime("%Y-%m")

    cal_path = config.STRATEGY_DIR / f"content_calendar_{month}.json"
    if not cal_path.exists():
        raise FileNotFoundError(
            f"Content calendar not found: {cal_path}\n"
            "Run content_strategy.py first."
        )

    calendar = json.loads(cal_path.read_text())
    articles = calendar.get("articles", [])

    if not articles:
        raise ValueError("Content calendar has no articles.")

    # Find article by publishing_order
    article = next(
        (a for a in articles if a.get("publishing_order") == article_number),
        articles[min(article_number - 1, len(articles) - 1)],
    )

    return run(article_brief=article)


if __name__ == "__main__":
    import sys
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    run_from_calendar(article_number=n)
