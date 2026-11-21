"""Reset the demo to its initial state (fictitious data, IDEA.md §3).

Local DB:     uv run python scripts/reset_demo.py
Running app:  uv run python scripts/reset_demo.py --url https://hilo-rosa.onrender.com
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

parser = argparse.ArgumentParser()
parser.add_argument("--url", help="base URL of a running app; omit to reset the local database")
args = parser.parse_args()

if args.url:
    import httpx

    r = httpx.post(f"{args.url.rstrip('/')}/api/demo/reset", timeout=30)
    r.raise_for_status()
    print(r.json())
else:
    from app.services import store

    store.reset_demo()
    print("Demo reiniciada (datos ficticios).")
