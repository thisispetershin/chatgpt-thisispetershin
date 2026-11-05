#!/usr/bin/env python3
"""Copy the site into <out_dir> in the layout the claude.ai artifact preview expects.

The artifact host wraps the main page in its own <html>/<head>/<body>, so index.html
is reduced to its head contents (minus charset/viewport) followed by its body contents.
Other pages are served as standalone documents and are copied unchanged.

Usage: python3 scripts/build_artifact.py /path/to/out_dir
"""
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["index.html", "schedule.html", "quests.html", "news.html"]


def main(out):
    out = Path(out)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    for d in ["assets", "data"]:
        shutil.copytree(ROOT / d, out / d)
    for p in PAGES:
        shutil.copy(ROOT / p, out / p)
    idx = out / "index.html"
    s = idx.read_text()
    head = re.search(r"<head>(.*?)</head>", s, re.S).group(1)
    head = re.sub(r'\s*<meta charset[^>]*>|\s*<meta name="viewport"[^>]*>', "", head)
    body = re.search(r"<body>(.*?)</body>", s, re.S).group(1)
    idx.write_text(head.strip() + "\n" + body)
    print(f"Built preview in {out}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
