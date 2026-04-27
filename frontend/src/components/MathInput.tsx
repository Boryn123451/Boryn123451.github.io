import type { KeyboardEventHandler, Ref } from "react";
import { useEffect, useState } from "react";

import { previewMathInput } from "../api/client";
import type { PreviewKind, PreviewResponse, Settings } from "../types";
import { LatexBlock } from "./LatexBlock";

interface MathInputProps {
  label: string;
  value: string;
  settings: Settings;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  kind?: PreviewKind;
  textareaRef?: Ref<HTMLTextAreaElement>;
  inputRef?: Ref<HTMLInputElement>;
  onTextareaKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  testId?: string;
}

function buildStatusClass(preview: PreviewResponse | null) {
  if (!preview) {
    return "";
  }
  if (preview.status === "error") {
    return "math-preview--error";
  }
  if (preview.status === "incomplete") {
    return "math-preview--incomplete";
  }
  return "math-preview--ok";
}

export function MathInput({
  label,
  value,
  settings,
  onChange,
  placeholder,
  multiline = false,
  rows = 3,
  kind = "expression",
  textareaRef,
  inputRef,
  onTextareaKeyDown,
  testId,
}: MathInputProps) {
  const [preview, setPreview] = useState<PreviewResponse | null>(null);

  useEffect(() => {
    const trimmed = value.trim();

    if (!trimmed) {
      setPreview(null);
      return;
    }

    if (kind === "variable_list") {
      const names = value
        .split(/[,\n;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      const hasTrailingSeparator = /[,\n;]\s*$/.test(value);
      const invalidName = names.find((name) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(name));

      if (invalidName) {
        setPreview({
          operation: "preview",
          status: "error",
          latex: names.join(", "),
          plain: names.join(", "),
          message: "Lista niewiadomych może zawierać tylko nazwy typu x, y, z albo t1.",
          suggestion: "Oddzielaj zmienne przecinkami, na przykład: x, y, z.",
          warnings: [],
        });
        return;
      }

      if (hasTrailingSeparator) {
        setPreview({
          operation: "preview",
          status: "incomplete",
          latex: names.join(", "),
          plain: names.join(", "),
          message: "Lista niewiadomych jest jeszcze niepełna.",
          suggestion: "Dopisujesz kolejną zmienną. Gdy skończysz, usuń końcowy przecinek lub średnik.",
          warnings: [],
        });
        return;
      }

      setPreview({
        operation: "preview",
        status: "ok",
        latex: names.join(", "),
        plain: names.join(", "),
        message: null,
        suggestion: null,
        warnings: [],
      });
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await previewMathInput(
          {
            ...settings,
            expression: value,
            kind,
          },
          controller.signal,
        );
        setPreview(response);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setPreview({
          operation: "preview",
          status: "error",
          latex: "",
          plain: value,
          message: error instanceof Error ? error.message : "Nie można przygotować podglądu.",
          suggestion: "Sprawdź zapis i spróbuj dopisać brakujący fragment.",
          warnings: [],
        });
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [
    kind,
    settings.angle_mode,
    settings.fraction_display,
    settings.mode,
    settings.precision,
    settings.solution_domain,
    value,
  ]);

  return (
    <label className="field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          data-testid={testId}
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onTextareaKeyDown}
          placeholder={placeholder}
        />
      ) : (
        <input
          data-testid={testId}
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
        />
      )}

      <div className={["math-preview", buildStatusClass(preview)].filter(Boolean).join(" ")}>
        <div className="math-preview__label">Podgląd zapisu</div>
        {preview?.latex ? (
          <LatexBlock latex={preview.latex} />
        ) : (
          <span className="muted">Podgląd pojawi się tutaj w trakcie wpisywania.</span>
        )}
      </div>

      {preview?.warnings?.length ? (
        <div className="alert alert--warning">
          {preview.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}

      {preview?.message ? (
        <div className={preview.status === "error" ? "input-error" : "input-hint"}>
          <strong>{preview.status === "incomplete" ? "Wpis jest jeszcze niepełny." : "Sprawdź zapis."}</strong>
          <div>{preview.message}</div>
          {preview.suggestion ? <div>{preview.suggestion}</div> : null}
        </div>
      ) : null}
    </label>
  );
}
