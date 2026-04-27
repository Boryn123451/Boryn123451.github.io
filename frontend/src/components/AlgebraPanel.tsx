import type { Settings } from "../types";
import { MathInput } from "./MathInput";
import { SectionCard } from "./SectionCard";

interface AlgebraPanelProps {
  equation: string;
  variable: string;
  settings: Settings;
  busy: boolean;
  onEquationChange: (value: string) => void;
  onVariableChange: (value: string) => void;
  onSolveEquation: () => void;
}

export function AlgebraPanel({
  equation,
  variable,
  settings,
  busy,
  onEquationChange,
  onVariableChange,
  onSolveEquation,
}: AlgebraPanelProps) {
  return (
    <SectionCard
      title="Równania"
      subtitle="Równania pojedyncze, wielomiany do 4 stopnia i ogólne przypadki, gdy SymPy potrafi znaleźć rodzinę rozwiązań."
      action={
        <button type="button" onClick={onSolveEquation} disabled={busy} data-testid="equation-submit">
          {busy ? "Rozwiązuję..." : "Rozwiąż równanie"}
        </button>
      }
    >
      <div className="form-grid">
        <div className="field--wide">
          <MathInput
            label="Równanie"
            value={equation}
            settings={settings}
            onChange={onEquationChange}
            placeholder="Na przykład: 2*x^2 + 4 = 0"
            kind="equation"
            testId="equation-input"
          />
        </div>

        <MathInput
          label="Zmienna"
          value={variable}
          settings={settings}
          onChange={onVariableChange}
          placeholder="x albo pozostaw puste"
          testId="equation-variable-input"
        />
      </div>
    </SectionCard>
  );
}
