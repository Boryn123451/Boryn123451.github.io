import { useEffect, useMemo, useRef, useState } from "react";

import { exportElementAsPdf, exportResultAsTxt } from "../lib/export";
import type { CalculationResponse } from "../types";
import { LatexBlock } from "./LatexBlock";
import { SectionCard } from "./SectionCard";

interface ResultPanelProps {
  result: CalculationResponse | null;
  error: string | null;
}

function isLongResult(result: CalculationResponse) {
  return result.resultLatex.length > 260 || result.resultPlain.length > 320;
}

function buildCollapsedPreview(result: CalculationResponse) {
  const source = result.resultPlain.trim() || result.resultLatex.trim();
  if (source.length <= 180) {
    return source;
  }
  return `${source.slice(0, 177)}...`;
}

export function ResultPanel({ result, error }: ResultPanelProps) {
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [showFullResult, setShowFullResult] = useState(false);
  const [showPlainText, setShowPlainText] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const longResult = useMemo(() => (result ? isLongResult(result) : false), [result]);
  const collapsedPreview = useMemo(() => (result ? buildCollapsedPreview(result) : ""), [result]);

  useEffect(() => {
    setShowFullResult(false);
    setShowPlainText(false);
    setExportingPdf(false);
  }, [result?.resultLatex, result?.resultPlain]);

  async function handleExportPdf() {
    if (!exportRef.current) {
      return;
    }
    setExportingPdf(true);
    try {
      await exportElementAsPdf(exportRef.current);
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <SectionCard
      title="Wynik"
      subtitle="Główny wynik jest renderowany matematycznie. Zapis tekstowy i eksport są dostępne obok jako pomoc."
    >
      {error ? <div className="alert alert--error">{error}</div> : null}

      {!result && !error ? (
        <div className="placeholder">Po wykonaniu obliczenia wynik pojawi się tutaj.</div>
      ) : null}

      {result ? (
        <div className="result-stack" ref={exportRef}>
          <div className="button-row">
            <button type="button" className="ghost-button" onClick={() => exportResultAsTxt(result)}>
              Eksport TXT
            </button>
            <button type="button" className="ghost-button" onClick={handleExportPdf} disabled={exportingPdf}>
              {exportingPdf ? "Eksport PDF..." : "Eksport PDF"}
            </button>
          </div>

          <div className="result-box">
            <span className="result-label">Wejście</span>
            <div className="result-box__math">
              <LatexBlock key={`input-${result.inputLatex}`} latex={result.inputLatex} />
            </div>
          </div>

          {longResult ? (
            <div className="alert alert--warning">
              <div>Uwaga: wynik jest długi.</div>
              <div>Domyślnie pokazuję skrót. Kliknij przycisk, aby rozwinąć pełny zapis.</div>
            </div>
          ) : null}

          <div className="result-box result-box--accent">
            <span className="result-label">Wartość</span>

            {longResult && !showFullResult ? (
              <div className="result-box__collapsed" data-testid="result-collapsed-summary">
                <span className="result-box__collapsed-label">Skrót wyniku</span>
                <code>{collapsedPreview}</code>
              </div>
            ) : (
              <div className="result-box__math-scroll" data-testid="result-value-scroll">
                <div className="result-box__math result-box__math--accent" data-testid="result-value-math">
                  <LatexBlock key={`result-${result.resultLatex}`} latex={result.resultLatex} />
                </div>
              </div>
            )}

            <div className="button-row">
              {longResult ? (
                <button
                  type="button"
                  className="ghost-button"
                  data-testid="result-toggle-full"
                  onClick={() => setShowFullResult((current) => !current)}
                >
                  {showFullResult ? "Ukryj pełny wynik" : "Pokaż pełny wynik"}
                </button>
              ) : null}
              <button
                type="button"
                className="ghost-button"
                data-testid="result-toggle-plain"
                onClick={() => setShowPlainText((current) => !current)}
              >
                {showPlainText ? "Ukryj zapis tekstowy" : "Pokaż zapis tekstowy"}
              </button>
            </div>

            {showPlainText ? (
              <div className="result-box__plain" data-testid="result-plain-text">
                <span>Zapis tekstowy</span>
                <code>{result.resultPlain}</code>
              </div>
            ) : null}
          </div>

          {typeof result.degree === "number" ? (
            <div className="result-meta">
              <span>Stopień wielomianu: {result.degree}</span>
            </div>
          ) : null}

          {result.warnings?.length ? (
            <div className="alert alert--warning">
              {result.warnings.map((warning) => (
                <div key={warning}>{warning}</div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );
}
