import type { AngleMode, FractionDisplay, Mode, Settings, SolutionDomain } from "../types";

export const defaultSettings: Settings = {
  mode: "exact",
  angle_mode: "rad",
  fraction_display: "improper",
  solution_domain: "real",
  precision: 12,
};

function isMode(value: unknown): value is Mode {
  return value === "exact" || value === "approx";
}

function isAngleMode(value: unknown): value is AngleMode {
  return value === "rad" || value === "deg" || value === "grad";
}

function isFractionDisplay(value: unknown): value is FractionDisplay {
  return value === "improper" || value === "mixed";
}

function isSolutionDomain(value: unknown): value is SolutionDomain {
  return value === "real" || value === "complex";
}

function normalizePrecision(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) {
    return defaultSettings.precision;
  }
  return Math.min(20, Math.max(4, Math.round(numericValue)));
}

export function normalizeSettings(value: unknown): Settings {
  if (!value || typeof value !== "object") {
    return defaultSettings;
  }

  const candidate = value as Partial<Settings>;

  return {
    mode: isMode(candidate.mode) ? candidate.mode : defaultSettings.mode,
    angle_mode: isAngleMode(candidate.angle_mode)
      ? candidate.angle_mode
      : defaultSettings.angle_mode,
    fraction_display: isFractionDisplay(candidate.fraction_display)
      ? candidate.fraction_display
      : defaultSettings.fraction_display,
    solution_domain: isSolutionDomain(candidate.solution_domain)
      ? candidate.solution_domain
      : defaultSettings.solution_domain,
    precision: normalizePrecision(candidate.precision),
  };
}

export function withNormalizedSettings<T extends object>(payload: T): T & Settings {
  return {
    ...(payload as T),
    ...normalizeSettings(payload),
  };
}
