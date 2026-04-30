"""
Shared tools available to all SEO agents.
Each tool has:
  - A schema dict (passed to Claude's tools= parameter)
  - An executor function (called when Claude invokes the tool)
"""
import json
import pathlib
import textwrap
import time
import urllib.parse
import urllib.request
from typing import Any

import config


# ── Tool schemas (what Claude sees) ───────────────────────────────────────────

TOOL_SCHEMAS = [
    {
        "name": "web_search",
        "description": (
            "Search the web for up-to-date information. "
            "Use this to research competitors, keywords, market data, "
            "and topic background. Returns a list of results with title, URL, and snippet."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query string.",
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return (default 10, max 20).",
                    "default": 10,
                },
            },
            "required": ["query"],
        },
    },
    {
        "name": "fetch_url",
        "description": (
            "Fetch the text content of a web page. "
            "Use this to read competitor articles, pricing pages, or reference material. "
            "Returns the page text (stripped of most HTML)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "description": "Full URL to fetch.",
                },
            },
            "required": ["url"],
        },
    },
    {
        "name": "save_file",
        "description": (
            "Save content to a file in the output directory. "
            "Use this to persist articles, keyword lists, strategy documents, and outreach templates."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Relative filename inside the output directory, e.g. 'articles/2026-03-24-my-article.md'",
                },
                "content": {
                    "type": "string",
                    "description": "File content to save.",
                },
            },
            "required": ["filename", "content"],
        },
    },
    {
        "name": "read_file",
        "description": "Read a previously saved file from the output directory.",
        "input_schema": {
            "type": "object",
            "properties": {
                "filename": {
                    "type": "string",
                    "description": "Relative filename inside the output directory.",
                },
            },
            "required": ["filename"],
        },
    },
    {
        "name": "list_files",
        "description": "List files in a subdirectory of the output folder (e.g. 'articles', 'keywords').",
        "input_schema": {
            "type": "object",
            "properties": {
                "subdirectory": {
                    "type": "string",
                    "description": "Subdirectory name: 'articles', 'keywords', 'strategy', or 'backlinks'.",
                },
            },
            "required": ["subdirectory"],
        },
    },
]


# ── Tool executors ─────────────────────────────────────────────────────────────

def web_search(query: str, num_results: int = 10) -> str:
    """Search via Serper API (serper.dev). Falls back to a stub if no key."""
    num_results = min(num_results, 20)

    if not config.SERPER_API_KEY:
        return (
            f"[web_search stub — no SERPER_API_KEY set]\n"
            f"Query: {query}\n"
            "Set SERPER_API_KEY in your environment to enable live search results."
        )

    payload = json.dumps({"q": query, "num": num_results}).encode()
    req = urllib.request.Request(
        "https://google.serper.dev/search",
        data=payload,
        headers={
            "X-API-KEY": config.SERPER_API_KEY,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as exc:
        return f"Search error: {exc}"

    results = []
    for item in data.get("organic", [])[:num_results]:
        results.append(
            f"Title: {item.get('title', '')}\n"
            f"URL: {item.get('link', '')}\n"
            f"Snippet: {item.get('snippet', '')}\n"
        )
    return "\n---\n".join(results) if results else "No results found."


def fetch_url(url: str) -> str:
    """Fetch a URL and return stripped text (first 8 000 chars)."""
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "Mozilla/5.0 (SEO-Research-Bot/1.0)"},
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
    except Exception as exc:
        return f"Fetch error: {exc}"

    # Very simple HTML strip
    import re
    raw = re.sub(r"<script[^>]*>.*?</script>", " ", raw, flags=re.DOTALL | re.IGNORECASE)
    raw = re.sub(r"<style[^>]*>.*?</style>",  " ", raw, flags=re.DOTALL | re.IGNORECASE)
    raw = re.sub(r"<[^>]+>", " ", raw)
    raw = re.sub(r"\s{2,}", " ", raw).strip()
    return raw[:8000]


def save_file(filename: str, content: str) -> str:
    path = config.OUTPUT_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    return f"Saved: {path}"


def read_file(filename: str) -> str:
    path = config.OUTPUT_DIR / filename
    if not path.exists():
        return f"File not found: {filename}"
    return path.read_text(encoding="utf-8")


def list_files(subdirectory: str) -> str:
    path = config.OUTPUT_DIR / subdirectory
    if not path.exists():
        return f"Directory not found: {subdirectory}"
    files = sorted(path.iterdir())
    if not files:
        return "No files found."
    return "\n".join(f.name for f in files)


# ── Dispatcher ─────────────────────────────────────────────────────────────────

def execute_tool(name: str, inputs: dict) -> str:
    """Route a tool call to its executor and return a string result."""
    if name == "web_search":
        return web_search(**inputs)
    if name == "fetch_url":
        return fetch_url(**inputs)
    if name == "save_file":
        return save_file(**inputs)
    if name == "read_file":
        return read_file(**inputs)
    if name == "list_files":
        return list_files(**inputs)
    return f"Unknown tool: {name}"
