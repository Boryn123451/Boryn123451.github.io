import type { KeyboardEvent, MouseEvent } from "react";
import { useRef, useState } from "react";

import type { Settings } from "../types";
import { LatexBlock } from "./LatexBlock";
import { MathInput } from "./MathInput";
import { SectionCard } from "./SectionCard";

interface EvaluatePanelProps {
  expression: string;
  settings: Settings;
  busy: boolean;
  onChange: (value: string) => void;
  onAngleModeChange: (value: Settings["angle_mode"]) => void;
  onSubmit: () => void;
}

interface KeypadButton {
  id: string;
  text?: string;
  latex?: string;
  ariaLabel?: string;
  action: () => void;
  tone?: "action" | "function" | "primary";
  wide?: boolean;
}

type KeypadTab = "trig" | "science" | "constants" | "matrices";
type EntryMode = "manual" | "keypad";

function KeypadLabel({ text, latex }: { text?: string; latex?: string }) {
  if (latex) {
    return <LatexBlock latex={latex} inline className="keypad-button__latex" />;
  }
  return <span>{text}</span>;
}

function getButtonAriaLabel(button: KeypadButton) {
  return button.ariaLabel ?? button.text ?? button.id;
}

export function EvaluatePanel({
  expression,
  settings,
  busy,
  onChange,
  onAngleModeChange,
  onSubmit,
}: EvaluatePanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = useState<KeypadTab>("trig");
  const [entryMode, setEntryMode] = useState<EntryMode>("manual");

  function updateText(nextValue: string, caretPosition?: number) {
    onChange(nextValue);

    if (typeof caretPosition !== "number") {
      return;
    }

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) {
        return;
      }
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(caretPosition, caretPosition);
    });
  }

  function insertToken(token: string, caretOffset = token.length) {
    const textarea = textareaRef.current;
    if (!textarea) {
      updateText(expression + token);
      return;
    }

    const start = textarea.selectionStart ?? expression.length;
    const end = textarea.selectionEnd ?? expression.length;
    const nextValue = expression.slice(0, start) + token + expression.slice(end);
    updateText(nextValue, start + caretOffset);
  }

  function insertWrapped(prefix: string, suffix = ")") {
    const textarea = textareaRef.current;
    if (!textarea) {
      const nextValue = expression + prefix + suffix;
      updateText(nextValue, nextValue.length - suffix.length);
      return;
    }

    const start = textarea.selectionStart ?? expression.length;
    const end = textarea.selectionEnd ?? expression.length;
    const selected = expression.slice(start, end);
    const wrapped = prefix + selected + suffix;
    const nextValue = expression.slice(0, start) + wrapped + expression.slice(end);
    const caretPosition = selected.length > 0 ? start + wrapped.length : start + prefix.length;
    updateText(nextValue, caretPosition);
  }

  function handleBackspace() {
    const textarea = textareaRef.current;
    if (!textarea) {
      updateText(expression.slice(0, -1));
      return;
    }

    const start = textarea.selectionStart ?? expression.length;
    const end = textarea.selectionEnd ?? expression.length;

    if (start !== end) {
      updateText(expression.slice(0, start) + expression.slice(end), start);
      return;
    }

    if (start === 0) {
      return;
    }

    updateText(expression.slice(0, start - 1) + expression.slice(end), start - 1);
  }

  function handleKeypadPointerDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onSubmit();
    }
  }

  const numericKeypad: KeypadButton[] = [
    { id: "ac", text: "AC", action: () => updateText("", 0), tone: "action" },
    { id: "del", text: "DEL", action: handleBackspace, tone: "action" },
    { id: "(", latex: "(", ariaLabel: "Nawias otwierający", action: () => insertToken("(") },
    { id: ")", latex: ")", ariaLabel: "Nawias zamykający", action: () => insertToken(")") },
    { id: "^", latex: "x^y", ariaLabel: "Potęga", action: () => insertToken("^") },
    { id: "7", latex: "7", action: () => insertToken("7") },
    { id: "8", latex: "8", action: () => insertToken("8") },
    { id: "9", latex: "9", action: () => insertToken("9") },
    { id: "/", latex: "\\div", ariaLabel: "Dzielenie", action: () => insertToken("/") },
    {
      id: "sqrt",
      latex: "\\sqrt{x}",
      ariaLabel: "Pierwiastek",
      action: () => insertWrapped("sqrt("),
      tone: "function",
    },
    { id: "4", latex: "4", action: () => insertToken("4") },
    { id: "5", latex: "5", action: () => insertToken("5") },
    { id: "6", latex: "6", action: () => insertToken("6") },
    { id: "*", latex: "\\cdot", ariaLabel: "Mnożenie", action: () => insertToken("*") },
    {
      id: "log",
      latex: "\\log(x)",
      ariaLabel: "Logarytm",
      action: () => insertWrapped("log("),
      tone: "function",
    },
    { id: "1", latex: "1", action: () => insertToken("1") },
    { id: "2", latex: "2", action: () => insertToken("2") },
    { id: "3", latex: "3", action: () => insertToken("3") },
    { id: "-", latex: "-", ariaLabel: "Odejmowanie", action: () => insertToken("-") },
    { id: "pi", latex: "\\pi", ariaLabel: "Pi", action: () => insertToken("pi"), tone: "function" },
    { id: "0", latex: "0", action: () => insertToken("0"), wide: true },
    { id: ".", latex: ".", action: () => insertToken(".") },
    { id: "+", latex: "+", ariaLabel: "Dodawanie", action: () => insertToken("+") },
    { id: "=", latex: "=", ariaLabel: "Oblicz", action: onSubmit, tone: "primary", wide: true },
  ];

  const scientificTabs: Record<KeypadTab, KeypadButton[]> = {
    trig: [
      { id: "sin", latex: "\\sin", action: () => insertWrapped("sin("), tone: "function" },
      { id: "cos", latex: "\\cos", action: () => insertWrapped("cos("), tone: "function" },
      { id: "tan", latex: "\\tan", action: () => insertWrapped("tan("), tone: "function" },
      { id: "cot", latex: "\\cot", action: () => insertWrapped("cot("), tone: "function" },
      { id: "sec", latex: "\\sec", action: () => insertWrapped("sec("), tone: "function" },
      { id: "csc", latex: "\\csc", action: () => insertWrapped("csc("), tone: "function" },
      { id: "asin", latex: "\\arcsin", action: () => insertWrapped("asin("), tone: "function" },
      { id: "acos", latex: "\\arccos", action: () => insertWrapped("acos("), tone: "function" },
      { id: "atan", latex: "\\arctan", action: () => insertWrapped("atan("), tone: "function" },
    ],
    science: [
      { id: "exp", latex: "\\exp(x)", action: () => insertWrapped("exp("), tone: "function" },
      { id: "ln", latex: "\\ln(x)", action: () => insertWrapped("ln("), tone: "function" },
      { id: "abs", latex: "\\left|x\\right|", action: () => insertWrapped("abs("), tone: "function" },
      { id: "root", latex: "\\sqrt[n]{x}", action: () => insertToken("root(2,)", 7), tone: "function" },
      { id: "binomial", latex: "\\binom{n}{k}", action: () => insertToken("binomial(n,k)", 9), tone: "function" },
      { id: "sinh", latex: "\\sinh", action: () => insertWrapped("sinh("), tone: "function" },
      { id: "cosh", latex: "\\cosh", action: () => insertWrapped("cosh("), tone: "function" },
      { id: "tanh", latex: "\\tanh", action: () => insertWrapped("tanh("), tone: "function" },
      { id: "reciprocal", latex: "\\frac{1}{x}", action: () => insertWrapped("1/("), tone: "function" },
      { id: "square", latex: "x^2", action: () => insertToken("^2"), tone: "function" },
      { id: "cube", latex: "x^3", action: () => insertToken("^3"), tone: "function" },
    ],
    constants: [
      { id: "pi-const", latex: "\\pi", action: () => insertToken("pi"), tone: "function" },
      { id: "e-const", latex: "e", action: () => insertToken("e"), tone: "function" },
      { id: "i-const", latex: "i", action: () => insertToken("i"), tone: "function" },
      { id: "alpha", latex: "\\alpha", action: () => insertToken("alpha"), tone: "function" },
      { id: "beta", latex: "\\beta", action: () => insertToken("beta"), tone: "function" },
      { id: "gamma", latex: "\\gamma", action: () => insertToken("gamma"), tone: "function" },
      { id: "delta", latex: "\\delta", action: () => insertToken("delta"), tone: "function" },
      { id: "theta", latex: "\\theta", action: () => insertToken("theta"), tone: "function" },
      { id: "lambda", latex: "\\lambda", action: () => insertToken("lambda"), tone: "function" },
      { id: "phi", latex: "\\phi", action: () => insertToken("phi"), tone: "function" },
      { id: "omega", latex: "\\omega", action: () => insertToken("omega"), tone: "function" },
      { id: "Delta", latex: "\\Delta", action: () => insertToken("Delta"), tone: "function" },
      { id: "Omega", latex: "\\Omega", action: () => insertToken("Omega"), tone: "function" },
      { id: "factorial", latex: "x!", action: () => insertToken("!"), tone: "function" },
      { id: "percent", latex: "\\%", action: () => insertToken("/100"), tone: "function" },
      { id: "comma", text: ",", action: () => insertToken(", "), tone: "function" },
    ],
    matrices: [
      { id: "matrix", latex: "\\mathrm{Matrix}", action: () => insertToken("Matrix([[]])", 9), tone: "function" },
      { id: "det", latex: "\\det(A)", action: () => insertWrapped("det("), tone: "function" },
      { id: "inv", latex: "A^{-1}", action: () => insertWrapped("inv("), tone: "function" },
      { id: "transpose", latex: "A^T", action: () => insertWrapped("transpose("), tone: "function" },
      { id: "trace", latex: "\\operatorname{tr}(A)", action: () => insertWrapped("trace("), tone: "function" },
    ],
  };

  return (
    <SectionCard
      title="Kalkulator główny"
      subtitle="Arytmetyka, liczby zespolone, macierze i funkcje specjalne przez wspólny parser CAS."
      action={
        <button type="button" onClick={onSubmit} disabled={busy} data-testid="evaluate-submit-top">
          {busy ? "Obliczam..." : "Oblicz"}
        </button>
      }
    >
      <div className="button-row">
        <button
          type="button"
          className={entryMode === "manual" ? "tab-button tab-button--active" : "tab-button"}
          onClick={() => setEntryMode("manual")}
        >
          Wpisywanie
        </button>
        <button
          type="button"
          className={entryMode === "keypad" ? "tab-button tab-button--active" : "tab-button"}
          onClick={() => setEntryMode("keypad")}
        >
          Klawiatura
        </button>
      </div>

      <MathInput
        label="Wyrażenie"
        value={expression}
        settings={settings}
        onChange={onChange}
        placeholder="Wpisz wyrażenie matematyczne"
        multiline
        rows={entryMode === "manual" ? 4 : 3}
        textareaRef={textareaRef}
        onTextareaKeyDown={handleTextareaKeyDown}
        testId="evaluate-input"
      />

      <div className="mode-hint">
        <div className="mode-hint__header">
          <strong>Jednostki kątowe</strong>
          <div className="mode-switch">
            {(["rad", "deg", "grad"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={settings.angle_mode === mode ? "tab-button tab-button--active" : "tab-button"}
                onClick={() => onAngleModeChange(mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {entryMode === "manual" ? (
          <div className="manual-actions">
            <span className="muted">Skrót: Ctrl+Enter oblicza bez schodzenia niżej po panelu.</span>
            <button
              type="button"
              className="ghost-button"
              onClick={onSubmit}
              disabled={busy}
              data-testid="evaluate-submit-inline"
            >
              {busy ? "Obliczam..." : "Oblicz teraz"}
            </button>
          </div>
        ) : null}
      </div>

      {entryMode === "keypad" ? (
        <>
          <div className="scientific-tabs">
            {[
              ["trig", "Tryg"],
              ["science", "Naukowe"],
              ["constants", "Stałe"],
              ["matrices", "Macierze"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={activeTab === key ? "tab-button tab-button--active" : "tab-button"}
                onClick={() => setActiveTab(key as KeypadTab)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="scientific-tab-panel">
            {scientificTabs[activeTab].map((button) => (
              <button
                key={button.id}
                type="button"
                className="keypad-button keypad-button--function"
                aria-label={getButtonAriaLabel(button)}
                onMouseDown={handleKeypadPointerDown}
                onClick={button.action}
              >
                <KeypadLabel text={button.text} latex={button.latex} />
              </button>
            ))}
          </div>

          <div className="calculator-keypad" aria-label="Klawiatura kalkulatora">
            {numericKeypad.map((key) => (
              <button
                key={key.id}
                type="button"
                className={[
                  "keypad-button",
                  key.tone ? `keypad-button--${key.tone}` : "",
                  key.wide ? "keypad-button--wide" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={getButtonAriaLabel(key)}
                onMouseDown={handleKeypadPointerDown}
                onClick={key.action}
              >
                <KeypadLabel text={key.text} latex={key.latex} />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </SectionCard>
  );
}
