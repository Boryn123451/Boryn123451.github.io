import type { Settings } from "../types";
import { MathInput } from "./MathInput";
import { SectionCard } from "./SectionCard";

interface SystemPanelProps {
  equations: string;
  variables: string;
  settings: Settings;
  busy: boolean;
  onEquationsChange: (value: string) => void;
  onVariablesChange: (value: string) => void;
  onSolveSystem: () => void;
}

export function SystemPanel({
  equations,
  variables,
  settings,
  busy,
  onEquationsChange,
  onVariablesChange,
  onSolveSystem,
}: SystemPanelProps) {
  return (
    <SectionCard
      title="Układy równań"
      subtitle="Osobna zakładka do układów z obsługą do 5 niewiadomych i do 5 równań jednocześnie."
      action={
        <button type="button" onClick={onSolveSystem} disabled={busy} data-testid="system-submit">
          {busy ? "Rozwiązuję..." : "Rozwiąż układ"}
        </button>
      }
    >
      <div className="form-grid">
        <div className="field--wide">
          <MathInput
            label="Równania"
            value={equations}
            settings={settings}
            onChange={onEquationsChange}
            placeholder={"Na przykład:\nx + y = 10\nx - y = 2"}
            multiline
            rows={6}
            kind="system"
            testId="system-equations-input"
          />
        </div>

        <div className="field--wide">
          <MathInput
            label="Niewiadome"
            value={variables}
            settings={settings}
            onChange={onVariablesChange}
            placeholder="x, y, z"
            kind="variable_list"
            testId="system-variables-input"
          />
        </div>
      </div>

      <div className="mode-hint">
        <p>Wpisz każde równanie w osobnym wierszu. Maksymalnie możesz podać 5 niewiadomych i 5 równań.</p>
      </div>
    </SectionCard>
  );
}
