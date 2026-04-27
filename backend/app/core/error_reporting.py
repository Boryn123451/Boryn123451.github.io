from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import traceback
from typing import Any, Dict
from uuid import uuid4


PROJECT_ROOT = Path(__file__).resolve().parents[3]
LOGS_DIR = PROJECT_ROOT / "logs"
ERROR_LOG_PATH = LOGS_DIR / "backend-errors.jsonl"

LOGS_DIR.mkdir(parents=True, exist_ok=True)


ERROR_TITLES = {
    "evaluate": "Błąd obliczania wyrażenia",
    "preview": "Błąd podglądu zapisu",
    "solve": "Błąd rozwiązywania równania",
    "solve-system": "Błąd rozwiązywania układu równań",
    "differentiate": "Błąd liczenia pochodnej",
    "integrate": "Błąd liczenia całki",
}


ERROR_SUGGESTIONS = {
    "evaluate": "Sprawdź operatory, nawiasy i czy wpis nie jest równaniem lub układem równań.",
    "preview": "Popraw nawiasy, przecinki i operatory w miejscu oznaczonym jako niepoprawne.",
    "solve": "Wpisz jedno równanie z symbolem '=' i podaj zmienną, względem której ma być rozwiązane.",
    "solve-system": "Wpisz każde równanie w osobnym wierszu, a niewiadome rozdziel przecinkami, np. x, y, z.",
    "differentiate": "Sprawdź funkcję, zmienną oraz rząd pochodnej. Dla wyższych pochodnych użyj rzędu od 1 do 6.",
    "integrate": "Sprawdź funkcję, zmienną oraz granice. Dla całki oznaczonej obie granice muszą być podane.",
}


def _sanitize_value(value: Any, max_length: int = 600) -> Any:
    if isinstance(value, dict):
        return {str(key): _sanitize_value(item, max_length=max_length) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_value(item, max_length=max_length) for item in value[:20]]
    if isinstance(value, tuple):
        return [_sanitize_value(item, max_length=max_length) for item in value[:20]]
    if value is None:
        return None
    text = str(value)
    if len(text) <= max_length:
        return text
    return f"{text[:max_length]}..."


def _write_log(record: Dict[str, Any]) -> None:
    with ERROR_LOG_PATH.open("a", encoding="utf-8") as handle:
        json.dump(record, handle, ensure_ascii=False)
        handle.write("\n")


def build_error_detail(
    operation: str,
    exc: Exception,
    *,
    status_code: int,
    payload: Dict[str, Any] | None = None,
    unexpected: bool,
) -> Dict[str, Any]:
    request_id = uuid4().hex[:10]
    technical = f"{type(exc).__name__}: {exc}"
    title = ERROR_TITLES.get(operation, "Błąd silnika")
    suggestion = ERROR_SUGGESTIONS.get(operation, "Sprawdź dane wejściowe i spróbuj ponownie.")
    message = str(exc) if str(exc).strip() else "Silnik zwrócił pusty komunikat o błędzie."

    record: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_id": request_id,
        "operation": operation,
        "status_code": status_code,
        "unexpected": unexpected,
        "message": message,
        "technical": technical,
        "payload": _sanitize_value(payload or {}),
    }
    if unexpected:
        record["traceback"] = traceback.format_exc()

    _write_log(record)

    detail: Dict[str, Any] = {
        "title": title,
        "message": message,
        "suggestion": suggestion,
        "requestId": request_id,
        "operation": operation,
    }
    if unexpected:
        detail["technical"] = technical

    return detail
