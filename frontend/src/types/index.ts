export type Mode = "exact" | "approx";
export type AngleMode = "rad" | "deg" | "grad";
export type FractionDisplay = "improper" | "mixed";
export type SolutionDomain = "real" | "complex";
export type TabKey = "evaluate" | "algebra" | "systems" | "calculus" | "formulas";
export type PreviewKind = "expression" | "equation" | "system" | "variable_list";
export type PreviewStatus = "empty" | "ok" | "incomplete" | "error";

export interface Settings {
  mode: Mode;
  angle_mode: AngleMode;
  fraction_display: FractionDisplay;
  solution_domain: SolutionDomain;
  precision: number;
}

export interface CalculationResponse {
  operation: string;
  inputLatex: string;
  resultLatex: string;
  resultPlain: string;
  warnings: string[];
  degree?: number;
  isDefinite?: boolean;
}

export interface PreviewResponse {
  operation: "preview";
  status: PreviewStatus;
  latex: string;
  plain: string;
  message: string | null;
  suggestion: string | null;
  warnings: string[];
}

export interface HistoryEntry {
  id: string;
  operation: string;
  title: string;
  request: string;
  reuseValue: string;
  resultLatex: string;
  resultPlain: string;
  createdAt: string;
}

export interface MemoryEntry {
  plain: string;
  latex: string;
}
