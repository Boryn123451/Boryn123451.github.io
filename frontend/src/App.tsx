import { useEffect, useState } from "react";

import {
  differentiateExpression,
  evaluateExpression,
  integrateExpression,
  solveEquation,
  solveSystem,
} from "./api/client";
import { AlgebraPanel } from "./components/AlgebraPanel";
import { CalculusPanel } from "./components/CalculusPanel";
import { EvaluatePanel } from "./components/EvaluatePanel";
import { FormulaPanel } from "./components/FormulaPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { MemoryPanel } from "./components/MemoryPanel";
import { ResultPanel } from "./components/ResultPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { SystemPanel } from "./components/SystemPanel";
import { usePersistentState } from "./hooks/usePersistentState";
import { defaultSettings, normalizeSettings } from "./lib/settings";
import type {
  CalculationResponse,
  HistoryEntry,
  MemoryEntry,
  Settings,
  TabKey,
} from "./types";

type CalculusPanelMode = "differentiate" | "indefinite" | "definite";

function createHistoryEntry(
  response: CalculationResponse,
  title: string,
  request: string,
  reuseValue: string,
): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    operation: response.operation,
    title,
    request,
    reuseValue,
    resultLatex: response.resultLatex,
    resultPlain: response.resultPlain,
    createdAt: new Date().toISOString(),
  };
}

function splitMeaningfulLines(text: string) {
  return text
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function looksLikeSystemInput(text: string) {
  const lines = splitMeaningfulLines(text);
  return lines.length >= 2 && lines.every((line) => line.includes("="));
}

function looksLikeEquationInput(text: string) {
  const lines = splitMeaningfulLines(text);
  return lines.length === 1 && lines[0].includes("=");
}

function splitTopLevelArguments(text: string) {
  const parts: string[] = [];
  let current = "";
  let roundDepth = 0;
  let squareDepth = 0;
  let braceDepth = 0;

  for (const character of text) {
    if (character === "," && roundDepth === 0 && squareDepth === 0 && braceDepth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }

    current += character;
    if (character === "(") {
      roundDepth += 1;
    } else if (character === ")") {
      roundDepth = Math.max(0, roundDepth - 1);
    } else if (character === "[") {
      squareDepth += 1;
    } else if (character === "]") {
      squareDepth = Math.max(0, squareDepth - 1);
    } else if (character === "{") {
      braceDepth += 1;
    } else if (character === "}") {
      braceDepth = Math.max(0, braceDepth - 1);
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function unwrapOuterParentheses(text: string) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) {
    return trimmed;
  }

  let depth = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    if (trimmed[index] === "(") {
      depth += 1;
    } else if (trimmed[index] === ")") {
      depth -= 1;
      if (depth === 0 && index < trimmed.length - 1) {
        return trimmed;
      }
    }
  }

  return trimmed.slice(1, -1).trim();
}

function parseFunctionCall(text: string, names: string[]) {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  for (const name of names) {
    const prefix = `${name}(`;
    if (lower.startsWith(prefix) && trimmed.endsWith(")")) {
      return {
        name,
        args: splitTopLevelArguments(trimmed.slice(prefix.length, -1)),
      };
    }
  }

  return null;
}

function parseCalculusShortcut(text: string) {
  const derivativeCall = parseFunctionCall(text, ["diff", "differentiate"]);
  if (derivativeCall && derivativeCall.args.length >= 2) {
    const orderValue = Number(derivativeCall.args[2]);
    return {
      mode: "differentiate" as const,
      expression: derivativeCall.args[0],
      variable: derivativeCall.args[1],
      order: Number.isFinite(orderValue) ? Math.min(6, Math.max(1, Math.trunc(orderValue))) : 1,
      lowerBound: "",
      upperBound: "",
    };
  }

  const integralCall = parseFunctionCall(text, ["integrate", "int"]);
  if (integralCall && integralCall.args.length >= 2) {
    const secondArgument = unwrapOuterParentheses(integralCall.args[1]);
    const tupleArguments = splitTopLevelArguments(secondArgument);

    if (tupleArguments.length === 3) {
      return {
        mode: "definite" as const,
        expression: integralCall.args[0],
        variable: tupleArguments[0],
        order: 1,
        lowerBound: tupleArguments[1],
        upperBound: tupleArguments[2],
      };
    }

    return {
      mode: "indefinite" as const,
      expression: integralCall.args[0],
      variable: integralCall.args[1],
      order: 1,
      lowerBound: "",
      upperBound: "",
    };
  }

  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("evaluate");
  const [settings, setSettings] = usePersistentState<Settings>(
    "cas-settings",
    defaultSettings,
    normalizeSettings,
  );
  const [history, setHistory] = usePersistentState<HistoryEntry[]>("cas-history", []);
  const [memory, setMemory] = usePersistentState<MemoryEntry | null>("cas-memory", null);

  const [evaluateInput, setEvaluateInput] = usePersistentState("cas-evaluate", "");
  const [algebraEquation, setAlgebraEquation] = usePersistentState("cas-algebra-equation", "");
  const [algebraVariable, setAlgebraVariable] = usePersistentState("cas-algebra-variable", "");
  const [systemEquations, setSystemEquations] = usePersistentState("cas-algebra-system-equations", "");
  const [systemVariables, setSystemVariables] = usePersistentState("cas-algebra-system-variables", "");
  const [calculusExpression, setCalculusExpression] = usePersistentState("cas-calculus-expression", "");
  const [calculusVariable, setCalculusVariable] = usePersistentState("cas-calculus-variable", "");
  const [calculusPreferredMode, setCalculusPreferredMode] = useState<CalculusPanelMode>("differentiate");
  const [calculusDerivativeOrder, setCalculusDerivativeOrder] = usePersistentState(
    "cas-calculus-derivative-order",
    1,
  );
  const [calculusLowerBound, setCalculusLowerBound] = usePersistentState("cas-calculus-lower", "");
  const [calculusUpperBound, setCalculusUpperBound] = usePersistentState("cas-calculus-upper", "");

  const [result, setResult] = useState<CalculationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setHistory((current) => current.filter((entry) => entry.operation !== "plot"));
  }, [setHistory]);

  function pushHistory(entry: HistoryEntry) {
    setHistory((current) => [entry, ...current].slice(0, 20));
  }

  function updateResult(nextResult: CalculationResponse, title: string, request: string, reuseValue: string) {
    setResult(nextResult);
    setError(null);
    pushHistory(createHistoryEntry(nextResult, title, request, reuseValue));
  }

  function redirectToTab(targetTab: TabKey, message: string, apply: () => void) {
    apply();
    setResult(null);
    setError(message);
    setActiveTab(targetTab);
  }

  function maybeRedirectEvaluateInput() {
    const trimmed = evaluateInput.trim();
    if (!trimmed) {
      setResult(null);
      setError("Wpisz wyrażenie matematyczne.");
      return true;
    }

    if (looksLikeSystemInput(trimmed)) {
      redirectToTab(
        "systems",
        "To wygląda na układ równań. Przeniosłem zapis do zakładki „Układy równań”.",
        () => {
          setSystemEquations(trimmed);
        },
      );
      return true;
    }

    if (looksLikeEquationInput(trimmed)) {
      redirectToTab(
        "algebra",
        "To wygląda na równanie. Przeniosłem zapis do zakładki „Równania”.",
        () => {
          setAlgebraEquation(trimmed);
        },
      );
      return true;
    }

    const calculusShortcut = parseCalculusShortcut(trimmed);
    if (calculusShortcut) {
      redirectToTab(
        "calculus",
        "To wygląda na polecenie rachunku różniczkowego lub całkowego. Przeniosłem zapis do zakładki „Analiza”.",
        () => {
          setCalculusExpression(calculusShortcut.expression);
          setCalculusVariable(calculusShortcut.variable);
          setCalculusDerivativeOrder(calculusShortcut.order);
          setCalculusLowerBound(calculusShortcut.lowerBound);
          setCalculusUpperBound(calculusShortcut.upperBound);
          setCalculusPreferredMode(calculusShortcut.mode);
        },
      );
      return true;
    }

    return false;
  }

  function maybeRedirectEquationInput() {
    const trimmed = algebraEquation.trim();
    if (!trimmed) {
      setResult(null);
      setError("Wpisz równanie w postaci lewa = prawa.");
      return true;
    }

    if (looksLikeSystemInput(trimmed)) {
      redirectToTab(
        "systems",
        "Wpis zawiera kilka równań. Przeniosłem go do zakładki „Układy równań”.",
        () => {
          setSystemEquations(trimmed);
          if (algebraVariable.trim()) {
            setSystemVariables(algebraVariable.trim());
          }
        },
      );
      return true;
    }

    return false;
  }

  function maybeRedirectSystemInput() {
    const trimmed = systemEquations.trim();
    if (!trimmed) {
      setResult(null);
      setError("Wpisz co najmniej jedno równanie układu.");
      return true;
    }

    if (looksLikeEquationInput(trimmed)) {
      redirectToTab(
        "algebra",
        "To jest pojedyncze równanie, więc przeniosłem je do zakładki „Równania”.",
        () => {
          setAlgebraEquation(trimmed);
          if (systemVariables.trim() && !/[,\n;]/.test(systemVariables.trim())) {
            setAlgebraVariable(systemVariables.trim());
          }
        },
      );
      return true;
    }

    return false;
  }

  function maybeRedirectCalculusInput(targetMode: CalculusPanelMode) {
    const trimmed = calculusExpression.trim();
    if (!trimmed) {
      setResult(null);
      setError(
        targetMode === "differentiate"
          ? "Wpisz funkcję, dla której mam policzyć pochodną."
          : "Wpisz funkcję, dla której mam policzyć całkę.",
      );
      return true;
    }

    if (looksLikeSystemInput(trimmed)) {
      redirectToTab(
        "systems",
        "W polu analizy wykryłem układ równań. Przeniosłem zapis do zakładki „Układy równań”.",
        () => {
          setSystemEquations(trimmed);
        },
      );
      return true;
    }

    if (looksLikeEquationInput(trimmed)) {
      redirectToTab(
        "algebra",
        "W polu analizy wykryłem równanie. Przeniosłem zapis do zakładki „Równania”.",
        () => {
          setAlgebraEquation(trimmed);
          if (calculusVariable.trim()) {
            setAlgebraVariable(calculusVariable.trim());
          }
        },
      );
      return true;
    }

    setCalculusPreferredMode(targetMode);
    return false;
  }

  async function runEvaluate() {
    if (maybeRedirectEvaluateInput()) {
      return;
    }
    setBusy(true);
    try {
      const response = await evaluateExpression({
        ...settings,
        expression: evaluateInput,
      });
      updateResult(response, "Obliczenie", evaluateInput, response.resultPlain);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nieznany błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function runSolveEquation() {
    if (maybeRedirectEquationInput()) {
      return;
    }
    setBusy(true);
    try {
      const response = await solveEquation({
        ...settings,
        equation: algebraEquation,
        variable: algebraVariable,
      });
      updateResult(response, "Równanie", algebraEquation, response.resultPlain);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nieznany błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function runSolveSystem() {
    if (maybeRedirectSystemInput()) {
      return;
    }
    if (!systemVariables.trim()) {
      setResult(null);
      setError("Podaj niewiadome rozdzielone przecinkami, na przykład x, y, z.");
      return;
    }
    setBusy(true);
    try {
      const response = await solveSystem({
        ...settings,
        equations: systemEquations,
        variables: systemVariables,
      });
      updateResult(response, "Układ równań", systemEquations, response.resultPlain);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nieznany błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function runDifferentiate() {
    if (maybeRedirectCalculusInput("differentiate")) {
      return;
    }
    if (!calculusVariable.trim()) {
      setResult(null);
      setError("Podaj zmienną, względem której mam liczyć pochodną.");
      return;
    }
    setBusy(true);
    try {
      const response = await differentiateExpression({
        ...settings,
        expression: calculusExpression,
        variable: calculusVariable,
        order: Math.min(6, Math.max(1, Number(calculusDerivativeOrder) || 1)),
      });
      updateResult(
        response,
        `Pochodna rzędu ${Math.min(6, Math.max(1, Number(calculusDerivativeOrder) || 1))}`,
        calculusExpression,
        response.resultPlain,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nieznany błąd.");
    } finally {
      setBusy(false);
    }
  }

  async function runIntegrate(definite: boolean) {
    if (maybeRedirectCalculusInput(definite ? "definite" : "indefinite")) {
      return;
    }
    if (!calculusVariable.trim()) {
      setResult(null);
      setError("Podaj zmienną, względem której mam liczyć całkę.");
      return;
    }
    setBusy(true);
    try {
      const response = await integrateExpression({
        ...settings,
        expression: calculusExpression,
        variable: calculusVariable,
        lower_bound: definite ? calculusLowerBound : undefined,
        upper_bound: definite ? calculusUpperBound : undefined,
      });
      updateResult(
        response,
        definite ? "Całka oznaczona" : "Całka nieoznaczona",
        calculusExpression,
        response.resultPlain,
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Nieznany błąd.");
    } finally {
      setBusy(false);
    }
  }

  function recallMemory() {
    if (!memory) {
      return;
    }

    if (activeTab === "evaluate") {
      setEvaluateInput((current) => `${current}${current ? " " : ""}${memory.plain}`);
      return;
    }

    if (activeTab === "algebra") {
      setAlgebraEquation((current) => `${current}${current ? " " : ""}${memory.plain}`);
      return;
    }

    if (activeTab === "systems") {
      setSystemEquations((current) => `${current}${current ? "\n" : ""}${memory.plain}`);
      return;
    }

    if (activeTab === "calculus") {
      setCalculusExpression((current) => `${current}${current ? " " : ""}${memory.plain}`);
    }
  }

  function reuseHistoryEntry(entry: HistoryEntry) {
    if (entry.operation === "evaluate") {
      setActiveTab("evaluate");
      setEvaluateInput(entry.request);
      return;
    }

    if (entry.operation === "solve") {
      setActiveTab("algebra");
      setAlgebraEquation(entry.request);
      return;
    }

    if (entry.operation === "solve_system") {
      setActiveTab("systems");
      setSystemEquations(entry.request);
      return;
    }

    if (entry.operation === "differentiate" || entry.operation === "integrate") {
      setActiveTab("calculus");
      setCalculusExpression(entry.request);
      return;
    }

    setActiveTab("evaluate");
    setEvaluateInput(entry.request);
    setError("Ten wpis pochodzi z usuniętego modułu wykresów. Przeniosłem zapis do kalkulatora.");
  }

  function applyHistoryResult(entry: HistoryEntry) {
    if (activeTab === "evaluate") {
      setEvaluateInput(entry.reuseValue);
      return;
    }

    if (activeTab === "algebra") {
      setAlgebraEquation(entry.reuseValue);
      return;
    }

    if (activeTab === "systems") {
      setSystemEquations(entry.reuseValue);
      return;
    }

    if (activeTab === "calculus") {
      setCalculusExpression(entry.reuseValue);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Dual-Mode CAS Calculator</span>
          <h1>Kalkulator naukowy Exact + Approx</h1>
          <p>
            Silnik symboliczny oparty o SymPy, render matematyczny w KaTeX i rozbudowana baza
            wzorów bez żadnych płatnych API i bez kluczy.
          </p>
        </div>
        <div className="hero__badge">
          <strong>{settings.mode === "exact" ? "Exact" : "Approx"}</strong>
          <span>{settings.angle_mode.toUpperCase()}</span>
        </div>
      </header>

      <main className="layout">
        <div className="layout__main">
          <SettingsPanel settings={settings} onChange={setSettings} />

          <div className="tab-bar">
            {[
              ["evaluate", "Kalkulator"],
              ["algebra", "Równania"],
              ["systems", "Układy równań"],
              ["calculus", "Analiza"],
              ["formulas", "Wzory"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-testid={`main-tab-${key}`}
                className={activeTab === key ? "tab-button tab-button--active" : "tab-button"}
                onClick={() => setActiveTab(key as TabKey)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "evaluate" ? (
            <EvaluatePanel
              expression={evaluateInput}
              settings={settings}
              busy={busy}
              onChange={setEvaluateInput}
              onAngleModeChange={(angleMode) =>
                setSettings((current) => ({ ...current, angle_mode: angleMode }))
              }
              onSubmit={() => void runEvaluate()}
            />
          ) : null}

          {activeTab === "algebra" ? (
            <AlgebraPanel
              equation={algebraEquation}
              variable={algebraVariable}
              settings={settings}
              busy={busy}
              onEquationChange={setAlgebraEquation}
              onVariableChange={setAlgebraVariable}
              onSolveEquation={() => void runSolveEquation()}
            />
          ) : null}

          {activeTab === "systems" ? (
            <SystemPanel
              equations={systemEquations}
              variables={systemVariables}
              settings={settings}
              busy={busy}
              onEquationsChange={setSystemEquations}
              onVariablesChange={setSystemVariables}
              onSolveSystem={() => void runSolveSystem()}
            />
          ) : null}

          {activeTab === "calculus" ? (
            <CalculusPanel
              expression={calculusExpression}
              variable={calculusVariable}
              preferredMode={calculusPreferredMode}
              derivativeOrder={Math.min(6, Math.max(1, Number(calculusDerivativeOrder) || 1))}
              lowerBound={calculusLowerBound}
              upperBound={calculusUpperBound}
              settings={settings}
              busy={busy}
              onExpressionChange={setCalculusExpression}
              onVariableChange={setCalculusVariable}
              onDerivativeOrderChange={setCalculusDerivativeOrder}
              onLowerBoundChange={setCalculusLowerBound}
              onUpperBoundChange={setCalculusUpperBound}
              onDifferentiate={() => void runDifferentiate()}
              onIntegrate={(definite) => void runIntegrate(definite)}
            />
          ) : null}

          {activeTab === "formulas" ? <FormulaPanel /> : null}
        </div>

        <aside className="layout__side">
          <ResultPanel result={result} error={error} />
          <MemoryPanel
            memory={memory}
            canStore={Boolean(result)}
            onStore={() =>
              result
                ? setMemory({
                    plain: result.resultPlain,
                    latex: result.resultLatex,
                  })
                : undefined
            }
            onRecall={recallMemory}
            onClear={() => setMemory(null)}
          />
          <HistoryPanel
            entries={history}
            onReuse={reuseHistoryEntry}
            onApplyResult={applyHistoryResult}
            onClear={() => setHistory([])}
          />
        </aside>
      </main>
    </div>
  );
}
