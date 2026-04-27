#!/usr/bin/env python3
"""Analyze failures from the test plan runner report."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "artifacts" / "plan_testow_aplikacja_matematyczna_report.json"
CASES = ROOT / "artifacts" / "plan_testow_aplikacja_matematyczna_cases.json"

data = json.loads(REPORT.read_text(encoding="utf-8"))
cases = {c["id"]: c for c in json.loads(CASES.read_text(encoding="utf-8"))}

failed = [d for d in data if d["status"] == "failed"]
print(f"Total: {len(data)}, Passed: {len(data)-len(failed)}, Failed: {len(failed)}")
print()

# Categorize failures
categories = {}
for f in failed:
    cat = f["category"] if f.get("category") else "unknown"
    categories.setdefault(cat, []).append(f)

for cat, items in sorted(categories.items()):
    print(f"=== {cat} ({len(items)} failures) ===")
    for item in items:
        c = cases.get(item["id"], {})
        print(f"  {item['id']}: {item['reason'][:100]}")
        print(f"    Input: {c.get('input_text','')[:100]}")
        print(f"    Expected: {c.get('expected','')[:100]}")
        print(f"    Result type: {c.get('result_type','')}")
        print()
