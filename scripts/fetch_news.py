#!/usr/bin/env python3
"""Fetch AI + Web3 headlines from RSS feeds into data/news.json (stdlib only).

Run locally:  python3 scripts/fetch_news.py
Runs daily via .github/workflows/news.yml.
"""
import email.utils
import html
import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

def gnews(query):
    q = urllib.parse.quote_plus(query + " when:7d")
    return f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"

# (category, source label, url). Edit freely.
FEEDS = [
    ("ai_workflow", "Google News", gnews('"AI agents" OR "AI workflow" OR "AI automation"')),
    ("ai_workflow", "Google News", gnews('n8n OR Zapier AI OR "Claude Code" OR "agentic workflow"')),
    ("ai_workflow", "Simon Willison", "https://simonwillison.net/atom/everything/"),
    ("ai_workflow", "Hugging Face", "https://huggingface.co/blog/feed.xml"),
    ("ai_creative", "Google News", gnews('"generative AI" (art OR music OR video OR design OR creators)')),
    ("ai_creative", "Google News", gnews('AI video generation OR AI filmmaking OR "AI music"')),
    ("ai_general", "Google News", gnews('OpenAI OR Anthropic OR "Google DeepMind" OR "Meta AI" model release')),
    ("web3", "CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/"),
    ("web3", "Decrypt", "https://decrypt.co/feed"),
    ("web3", "Cointelegraph", "https://cointelegraph.com/rss"),
    ("web3", "Google News", gnews('DeFi OR "zero-knowledge" OR Ethereum OR stablecoin OR "real-world assets"')),
]
PER_FEED = 12
MAX_AGE = timedelta(days=10)
UA = "Mozilla/5.0 (LifeOS news fetcher; +https://github.com)"


def text(el, *names):
    for n in names:
        found = el.find(n)
        if found is not None:
            if found.text and found.text.strip():
                return found.text.strip()
            if found.get("href"):
                return found.get("href")
    return ""


def clean(s, limit=220):
    s = re.sub(r"<[^>]+>", " ", html.unescape(s or ""))
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= limit else s[: limit - 1].rsplit(" ", 1)[0] + "…"


def parse_date(s):
    if not s:
        return None
    try:
        d = email.utils.parsedate_to_datetime(s)
    except (TypeError, ValueError):
        try:
            d = datetime.fromisoformat(s.replace("Z", "+00:00"))
        except ValueError:
            return None
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


def fetch(cat, label, url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        root = ET.fromstring(r.read())
    # strip namespaces so RSS and Atom look alike
    for el in root.iter():
        if "}" in el.tag:
            el.tag = el.tag.split("}", 1)[1]
    out = []
    for it in (root.findall(".//item") or root.findall(".//entry"))[:PER_FEED]:
        title = clean(text(it, "title"), 200)
        link = text(it, "link")
        if not link:
            le = it.find("link")
            link = le.get("href", "") if le is not None else ""
        source = label
        if label == "Google News":  # titles look like "Headline - Publisher"
            src_el = it.find("source")
            if src_el is not None and src_el.text:
                source = src_el.text.strip()
                title = re.sub(r"\s+-\s+" + re.escape(source) + r"$", "", title)
        summary = "" if label == "Google News" else clean(text(it, "description", "summary", "content"))
        published = parse_date(text(it, "pubDate", "published", "updated"))
        if not title or not link:
            continue
        out.append({
            "category": cat, "title": title, "link": link, "source": source, "summary": summary,
            "published": (published or datetime.now(timezone.utc)).isoformat(),
        })
    return out


def main():
    items, errors = [], []
    for cat, label, url in FEEDS:
        try:
            items += fetch(cat, label, url)
        except Exception as e:  # keep going if one feed fails
            errors.append(f"{label} ({cat}): {e}")
    cutoff = datetime.now(timezone.utc) - MAX_AGE
    seen, uniq = set(), []
    for x in sorted(items, key=lambda x: x["published"], reverse=True):
        key = re.sub(r"\W+", "", x["title"].lower())[:80]
        if key in seen or datetime.fromisoformat(x["published"]) < cutoff:
            continue
        seen.add(key)
        uniq.append(x)
    out = Path(__file__).resolve().parent.parent / "data" / "news.json"
    if not uniq and out.exists():
        print("No items fetched; keeping previous news.json", file=sys.stderr)
        return 1
    out.write_text(json.dumps({
        "updated": datetime.now(timezone.utc).isoformat(), "items": uniq, "errors": errors,
    }, ensure_ascii=False, indent=1))
    print(f"Wrote {len(uniq)} items; {len(errors)} feed errors")
    for e in errors:
        print("  -", e, file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
