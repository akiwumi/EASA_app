"""
Backlink Agent
Finds high-quality backlink opportunities in the aviation niche.
Generates personalised outreach email templates.
Output: output/backlinks/opportunities_YYYY-MM.json
         output/backlinks/outreach_templates_YYYY-MM.md
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
You are an expert SEO link-building specialist with deep knowledge of the aviation industry.

Product: {config.NICHE["product_description"]}
Website: {config.NICHE["website_url"]}
Monthly backlink target: {config.MONTHLY_TARGETS["backlinks"]} quality backlinks

Your job is to find GENUINE, HIGH-QUALITY backlink opportunities in the aviation niche.
Only pursue white-hat, relationship-based link building.

Types of backlinks to pursue:
1. **Guest posts** — aviation compliance blogs, aviation technology publications
2. **Resource page links** — aviation authority websites listing compliance tools
3. **Broken link building** — find broken links on aviation sites and offer replacement content
4. **Directory listings** — aviation software directories, flight school tool directories
5. **Citation/data links** — offer original data/research that others will cite
6. **Partnerships** — aviation associations, EASA-aligned training bodies
7. **Forum/community mentions** — PPRuNe, Aviation Stack Exchange, EASA forums
8. **Podcast/interview opportunities** — aviation compliance podcasts

Research process:
1. Read 'strategy/competitor_research.json' for the high-authority sites list
2. Search for aviation compliance blogs, directories, and resource pages
3. Find specific pages where a link to this product would add value
4. Check Domain Authority signals (search results ranking, linking patterns)
5. Find the right contact person or email pattern for outreach

For each opportunity provide:
- Site name + URL
- Type: guest-post / resource-page / broken-link / directory / partnership
- Specific page URL where link would go
- Why they would link (value proposition)
- Contact method
- Personalised outreach angle (what you can offer them)

Generate personalised email templates for each opportunity.

Save:
- Opportunities JSON → 'backlinks/opportunities_{{month}}.json'
- Outreach templates → 'backlinks/outreach_templates_{{month}}.md'
"""


def run(month: Optional[str] = None):
    if not month:
        month = date.today().strftime("%Y-%m")

    print(f"=== BACKLINK AGENT: Finding link opportunities for {month} ===")

    user_prompt = f"""
Month: {month}
Target: Find {config.MONTHLY_TARGETS["backlinks"]} high-quality backlink opportunities.

Steps:
1. Read 'strategy/competitor_research.json' to get the list of high-authority aviation sites
2. Search for additional aviation compliance blogs, directories, and resource pages
3. Search for: "aviation compliance" + "resources", "EASA software" + "tools",
   "flight school management" + "recommended tools", aviation safety blogs
4. For each opportunity, find the specific page and contact information
5. Write a personalised outreach email template for each
6. Save opportunities to 'backlinks/opportunities_{month}.json'
7. Save all outreach email templates to 'backlinks/outreach_templates_{month}.md'

Focus on quality over quantity — 10 excellent prospects beats 50 weak ones.
Prioritise sites with real aviation audiences: flight schools, ATOs, safety officers.
"""

    result = run_agent(
        system=SYSTEM_PROMPT,
        user_message=user_prompt,
        model=config.MODELS["backlinks"],
        max_tokens=8192,
        max_iterations=25,
    )
    print(f"\n✓ Backlink opportunities saved for {month}.")
    return result


if __name__ == "__main__":
    run()
