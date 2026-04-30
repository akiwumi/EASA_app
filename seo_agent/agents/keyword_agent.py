"""
Keyword Research Agent
Discovers 200+ SEO keywords in the aviation compliance / EASA niche.
Clusters them by topic, search intent, and difficulty.
Output: output/keywords/keyword_database.json
"""
import json
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).parent.parent))

import config
from agent_loop import run_agent

SEED_KEYWORDS = config.NICHE["seed_keywords"]

SYSTEM_PROMPT = f"""
You are an expert SEO keyword researcher specialising in B2B SaaS and aviation compliance.

Product: {config.NICHE["product_description"]}
Target audience: {", ".join(config.NICHE["target_audience"])}

Your job is to find 200+ high-value SEO keywords for this product.

Research process:
1. Start with seed keywords: {", ".join(SEED_KEYWORDS)}
2. Use web_search to find what aviation professionals search for:
   - Search Google for aviation compliance questions
   - Search for EASA regulation topics on aviation forums
   - Look at "People Also Ask" style questions in search results
   - Find long-tail keywords (3–6 words) with informational and commercial intent
3. Cover ALL keyword categories:
   - Regulatory: "EASA Part-FCL updates 2025", "EASA AMC GM changes", etc.
   - Problem-aware: "how to track aviation regulatory changes", "flight school compliance checklist"
   - Software-aware: "aviation compliance management software", "best ATO management software"
   - Comparison: "EASA compliance software comparison", "aviation SMS software vs manual tracking"
   - How-to / Educational: "how to comply with EASA Part-ORO", "EASA ATO approval process"
   - Niche audience: "Part-147 MRO compliance tools", "EASA Part-66 licence tracker"
4. For each keyword estimate:
   - Intent: informational / commercial / transactional / navigational
   - Difficulty: easy / medium / hard (based on competitor strength in results)
   - Value: high / medium / low (relevance to the product)

Save as JSON to 'keywords/keyword_database.json' using save_file.
Structure:
{{
  "total_keywords": 200,
  "clusters": [
    {{
      "cluster_name": "EASA Regulation Updates",
      "description": "...",
      "keywords": [
        {{
          "keyword": "...",
          "intent": "informational",
          "difficulty": "medium",
          "value": "high",
          "article_idea": "Brief article title idea using this keyword"
        }}
      ]
    }}
  ]
}}

Aim for at least 10 clusters and 200+ keywords total.
"""

USER_PROMPT = f"""
Find 200+ SEO keywords for an aviation compliance SaaS targeting flight schools and EASA regulation tracking.

Seed keywords: {", ".join(SEED_KEYWORDS)}

Search extensively to find:
- Long-tail informational keywords (blog article targets)
- Commercial intent keywords (product page targets)
- Question-based keywords (FAQ and how-to articles)
- Competitor brand + comparison keywords
- Aviation niche terms (EASA, Part-FCL, ATO, MRO, SMS, etc.)

Group them into topical clusters and save to 'keywords/keyword_database.json'.
"""


def run():
    print("=== KEYWORD AGENT: Discovering 200+ keywords ===")
    result = run_agent(
        system=SYSTEM_PROMPT,
        user_message=USER_PROMPT,
        model=config.MODELS["keywords"],
        max_tokens=8192,
        max_iterations=25,
    )
    print("\n✓ Keyword research complete.")
    return result


if __name__ == "__main__":
    run()
