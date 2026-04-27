import { useEffect, useState } from "react";

import type { Settings } from "../types";
import { MathInput } from "./MathInput";
import { SectionCard } from "./SectionCard";

type CalculusMode = "differentiate" | "indefinite" | "definite";

interface CalculusPanelProps {
  expression: string;
  variable: string;
  preferredMode?: CalculusMode;
  derivativeOrder: number;
  lowerBound: string;
  upperBound: string;
  settings: Settings;
  busy: boolean;
  onExpressionChange: (value: string) => void;
  onVariableChange: (value: string) => void;
  onDerivativeOrderChange: (value: number) => void;
  onLowerBoundChange: (value: string) => void;
  onUpperBoundChange: (value: string) => void;
  onDifferentiate: () => void;
  onIntegrate: (definite: boolean) => void;
}

export function CalculusPanel({
  expression,
  variable,
  preferredMode = "differentiate",
  derivativeOrder,
  lowerBound,
  upperBound,
  settings,
  busy,
  onExpressionChange,
  onVariableChange,
  onDerivativeOrderChange,
  onLowerBoundChange,
  onUpperBoundChange,
  onDifferentiate,
  onIntegrate,
}: CalculusPanelProps) {
  const [mode, setMode] = useState<CalculusMode>(preferredMode);

  useEffect(() => {
    setMode(preferredMode);
  }, [preferredMode]);

  return (
    <SectionCard title="Analiza matematyczna" subtitle="Pochodne oraz całki oznaczone i nieoznaczone w tym samym silniku CAS.">
      <div className="form-grid">
        <div className="field--wide">
          <MathInput
            label="Funkcja"
            value={expression}
            settings={settings}
            onChange={onExpressionChange}
            placeholder="Na przykład: sin(x)^2"
            testId="calculus-expression-input"
          />
        </div>

        <MathInput
          label="Zmienna"
          value={variable}
          settings={settings}
          onChange={onVariableChange}
          placeholder="x"
          testId="calculus-variable-input"
        />

        {mode === "differentiate" ? (
          <label className="field">
            <span>Rząd pochodnej</span>
            <input
              type="number"
              min={1}
              max={6}
              value={derivativeOrder}
              onChange={(event) => onDerivativeOrderChange(Number(event.target.value))}
              data-testid="calculus-derivative-order-input"
            />
          </label>
        ) : null}
      </div>

      <div className="button-row">
        <button
          type="button"
          className={mode === "differentiate" ? "tab-button tab-button--active" : "tab-button"}
          onClick={() => setMode("differentiate")}
          data-testid="calculus-mode-derivative"
        >
          Pochodna
        </button>
        <button
          type="button"
          className={mode === "indefinite" ? "tab-button tab-button--active" : "tab-button"}
          onClick={() => setMode("indefinite")}
          data-testid="calculus-mode-indefinite"
        >
          Całka nieoznaczona
        </button>
        <button
          type="button"
          className={mode === "definite" ? "tab-button tab-button--active" : "tab-button"}
          onClick={() => setMode("definite")}
          data-testid="calculus-mode-definite"
        >
          Całka oznaczona
        </button>
      </div>

      {mode === "definite" ? (
        <div className="form-grid">
          <MathInput
            label="Dolna granica"
            value={lowerBound}
            settings={settings}
            onChange={onLowerBoundChange}
            testId="calculus-lower-bound-input"
          />
          <MathInput
            label="Górna granica"
            value={upperBound}
            settings={settings}
            onChange={onUpperBoundChange}
            testId="calculus-upper-bound-input"
          />
        </div>
      ) : null}

      {mode === "differentiate" ? (
        <button
          type="button"
          onClick={onDifferentiate}
          disabled={busy}
          data-testid="calculus-submit-derivative"
        >
          {busy ? "Liczę..." : "Policz pochodną"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onIntegrate(mode === "definite")}
          disabled={busy}
          data-testid="calculus-submit-integral"
        >
          {busy ? "Liczę..." : "Policz całkę"}
        </button>
      )}
    </SectionCard>
  );
}
