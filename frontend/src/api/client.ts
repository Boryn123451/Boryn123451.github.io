import type {
  CalculationResponse,
  PreviewKind,
  PreviewResponse,
  Settings,
} from "../types";
import { withNormalizedSettings } from "../lib/settings";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

interface ApiErrorDetail {
  title?: string;
  message?: string;
  suggestion?: string;
  requestId?: string;
  technical?: string;
}

function formatErrorMessage(detail: ApiErrorDetail, status: number) {
  const lines: string[] = [];

  if (detail.title) {
    lines.push(detail.title);
  }

  lines.push(detail.message || `Zadanie nie powiodło się (HTTP ${status}).`);

  if (detail.suggestion) {
    lines.push(`Jak naprawić: ${detail.suggestion}`);
  }

  if (detail.requestId) {
    lines.push(`Id błędu: ${detail.requestId}`);
  }

  if (detail.technical) {
    lines.push(`Szczegóły techniczne: ${detail.technical}`);
  }

  return lines.join("\n");
}

async function request<T>(path: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { detail?: string | ApiErrorDetail }
      | null;

    if (typeof errorBody?.detail === "string") {
      throw new Error(errorBody.detail);
    }

    if (errorBody?.detail && typeof errorBody.detail === "object") {
      throw new Error(formatErrorMessage(errorBody.detail, response.status));
    }

    throw new Error(`Nie udało się połączyć z backendem (HTTP ${response.status}).`);
  }

  return (await response.json()) as T;
}

export function evaluateExpression(payload: Settings & { expression: string }) {
  return request<CalculationResponse>("/evaluate", withNormalizedSettings(payload));
}

export function previewMathInput(
  payload: Settings & { expression: string; kind?: PreviewKind },
  signal?: AbortSignal,
) {
  return request<PreviewResponse>("/preview", withNormalizedSettings(payload), signal);
}

export function solveEquation(payload: Settings & { equation: string; variable: string }) {
  return request<CalculationResponse>("/solve", withNormalizedSettings(payload));
}

export function solveSystem(payload: Settings & { equations: string; variables: string }) {
  return request<CalculationResponse>("/solve-system", withNormalizedSettings(payload));
}

export function differentiateExpression(
  payload: Settings & { expression: string; variable: string; order: number },
) {
  return request<CalculationResponse>("/differentiate", withNormalizedSettings(payload));
}

export function integrateExpression(
  payload: Settings & {
    expression: string;
    variable: string;
    lower_bound?: string;
    upper_bound?: string;
  },
) {
  return request<CalculationResponse>("/integrate", withNormalizedSettings(payload));
}
