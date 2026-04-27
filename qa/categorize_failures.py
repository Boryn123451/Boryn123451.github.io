#!/usr/bin/env python3
"""Detailed categorization of test failures."""
import json
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "artifacts" / "plan_testow_aplikacja_matematyczna_report.json"
CASES = ROOT / "artifacts" / "plan_testow_aplikacja_matematyczna_cases.json"

data = json.loads(REPORT.read_text(encoding="utf-8"))
cases = {c["id"]: c for c in json.loads(CASES.read_text(encoding="utf-8"))}
failed = [d for d in data if d["status"] == "failed"]

# Categorize by failure pattern
patterns = Counter()
for f in failed:
    reason = f["reason"]
    c = cases.get(f["id"], {})
    rt = c.get("result_type", "")
    
    if "preview status=" in reason:
        patterns["PREVIEW_STATUS_MISMATCH"] += 1
    elif "oczekiwano błędu" in reason or "oczekiwano b" in reason:
        patterns["EXPECTED_ERROR_GOT_RESULT"] += 1
    elif "fallback statyczny UI" in reason:
        patterns["UI_FALLBACK"] += 1
    elif reason.startswith("wynik=") and "expected=" in reason:
        patterns["WRONG_RESULT_VALUE"] += 1
    elif "Nie udało się" in reason or "Nie uda" in reason:
        patterns["PARSE_ERROR"] += 1
    elif "Brakuje zamykającego" in reason or "Brakuje zamykaj" in reason:
        patterns["MISSING_BRACKET_ERROR"] += 1
    elif "one_solution" == reason:
        patterns["EQUATION_EXPECTED_ERROR_GOT_SOLUTION"] += 1
    elif "no_solutions" == reason:
        patterns["EQUATION_WRONG_CLASSIFICATION"] += 1
    elif "x in {" in reason:
        patterns["EQUATION_SET_RESULT" ] += 1
    elif reason.startswith("{"):
        patterns["SYSTEM_DICT_RESULT"] += 1
    elif "Wyjątek runnera" in reason or "Wyj" in reason:
        patterns["RUNNER_EXCEPTION"] += 1
    elif "Dziedzina:" in reason:
        patterns["EQUATION_DOMAIN_RESULT"] += 1
    elif "->" in reason:
        patterns["SETTINGS_NO_CHANGE"] += 1
    else:
        patterns["OTHER"] += 1

print("=== Failure Patterns ===")
for pattern, count in patterns.most_common():
    print(f"  {pattern}: {count}")

# Print specific category details
print("\n=== PREVIEW_STATUS_MISMATCH Details ===")
for f in failed:
    if "preview status=" in f["reason"]:
        c = cases[f["id"]]
        print(f"  {f['id']}: {f['reason']} | expected result_type: {c['result_type']}")

print("\n=== EXPECTED_ERROR_GOT_RESULT Details ===")
for f in failed:
    if "oczekiwano" in f["reason"]:
        c = cases[f["id"]]
        print(f"  {f['id']}: {f['reason'][:80]} | result_type: {c['result_type']}")

print("\n=== EQUATION_WRONG_CLASSIFICATION Details ===")
for f in failed:
    c = cases.get(f["id"], {})
    if f["reason"] == "no_solutions" or f["reason"] == "one_solution":
        print(f"  {f['id']}: got={f['reason']} | expected_type={c.get('result_type','')} | input={c.get('input_text','')[:100]}")

print("\n=== SYSTEM_DICT_RESULT Details ===")
for f in failed:
    if f["reason"].startswith("{") and f["id"].startswith("UR"):
        c = cases.get(f["id"], {})
        print(f"  {f['id']}: got={f['reason'][:80]} | expected_type={c.get('result_type','')} | expected={c.get('expected','')[:80]}")

print("\n=== AM (Analysis) failures ===")
for f in failed:
    if f["id"].startswith("AM"):
        c = cases.get(f["id"], {})
        print(f"  {f['id']}: got={f['reason'][:80]} | expected_type={c.get('result_type','')} | input={c.get('input_text','')[:100]} | expected={c.get('expected','')[:80]}")
