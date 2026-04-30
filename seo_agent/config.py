"""
SEO Agent Configuration
Niche: EASA aviation compliance SaaS for flight schools
"""
import os

# ── Product & niche ────────────────────────────────────────────────────────────
NICHE = {
    "product_name": "EASA Compliance App",
    "product_description": (
        "Aviation regulatory compliance software for flight schools. "
        "Automatically tracks EASA regulation changes daily, compares them against "
        "a school's Flight Book, and proposes approved updates with full version history."
    ),
    "target_audience": [
        "flight school compliance managers",
        "aviation safety officers",
        "chief flight instructors (CFI)",
        "flight training organisations (FTO/ATO)",
        "accountable managers at Part-147 MROs",
    ],
    "website_url": os.getenv("SITE_URL", "https://yourdomain.com"),
    "primary_language": "en",
    "target_countries": ["EU", "UK", "US", "AU", "CA"],
    "seed_keywords": [
        "EASA regulations",
        "aviation compliance software",
        "flight school management software",
        "aviation regulatory tracking",
        "EASA Part-FCL compliance",
        "ATO compliance management",
        "aviation safety management system",
        "EASA amendments tracker",
    ],
}

# ── Monthly targets ────────────────────────────────────────────────────────────
MONTHLY_TARGETS = {
    "articles": 30,
    "backlinks": 10,
    "article_min_words": 1500,
    "article_max_words": 2000,
}

# ── AI models ─────────────────────────────────────────────────────────────────
MODELS = {
    "research":  "claude-opus-4-6",
    "keywords":  "claude-opus-4-6",
    "strategy":  "claude-opus-4-6",
    "writing":   "claude-opus-4-6",
    "backlinks": "claude-sonnet-4-6",
}

# ── API keys (set in .env or environment) ─────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
SERPER_API_KEY    = os.getenv("SERPER_API_KEY", "")   # serper.dev — for web search

# ── Output paths ──────────────────────────────────────────────────────────────
import pathlib
BASE_DIR     = pathlib.Path(__file__).parent
OUTPUT_DIR   = BASE_DIR / "output"
ARTICLES_DIR = OUTPUT_DIR / "articles"
KEYWORDS_DIR = OUTPUT_DIR / "keywords"
STRATEGY_DIR = OUTPUT_DIR / "strategy"
BACKLINKS_DIR = OUTPUT_DIR / "backlinks"
