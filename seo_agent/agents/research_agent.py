"""
Research Agent
Performs deep market research: competitors, positioning, content gaps.
Output: output/strategy/competitor_research.json
"""
import json
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

import config
from agent_loop import run_agent

SYSTEM_PROMPT = f"""
You are an expert aviation industry market research analyst and SEO strategist.
Your job is to do DEEP research on the competitive landscape for:

Product: {config.NICHE["product_description"]}
Target audience: {", ".join(config.NICHE["target_audience"])}

You have access to web_search and fetch_url tools. Use them extensively.

Your research process:
1. Search for the top 10 competitors offering aviation compliance, flight school management,
   or EASA regulatory tracking software.
2. For each competitor: visit their website, analyse their content strategy, pricing signals,
   key features, and SEO approach (what topics they write about).
3. Identify CONTENT GAPS — important aviation compliance topics that competitors
   don't cover well, or cover poorly.
4. Identify the most powerful SEO angles for this product.
5. Note which aviation websites, blogs, forums, and directories are high-authority
   in this niche (these will become backlink targets).

At the end, save a structured JSON report to 'strategy/competitor_research.json' using save_file.
The JSON must have this structure:
{{
  "competitors": [
    {{
      "name": "...",
      "url": "...",
      "positioning": "...",
      "key_features": [...],
      "content_topics": [...],
      "seo_strengths": "...",
      "weaknesses": "..."
    }}
  ],
  "content_gaps": ["..."],
  "high_authority_sites": [
    {{"name": "...", "url": "...", "why": "..."}}
  ],
  "seo_angles": ["..."],
  "market_summary": "..."
}}

Be thorough — search multiple times, visit pages, read articles. Quality research here
drives everything downstream.
"""

USER_PROMPT = f"""
Research the competitive landscape for aviation compliance and EASA regulatory tracking software.

Target product: {config.NICHE["product_description"]}
Website: {config.NICHE["website_url"]}

Do deep research:
- Find all major competitors
- Analyse their content and SEO strategies
- Identify content gaps and opportunities
- List high-authority aviation industry websites for backlinks

Save the full structured report to 'strategy/competitor_research.json'.
"""


def run():
    print("=== RESEARCH AGENT: Market & Competitor Analysis ===")
    result = run_agent(
        system=SYSTEM_PROMPT,
        user_message=USER_PROMPT,
        model=config.MODELS["research"],
        max_tokens=8192,
        max_iterations=25,
    )
    print("\n✓ Research complete.")
    return result


if __name__ == "__main__":
    run()
