import type { Settings } from "../types";
import { SectionCard } from "./SectionCard";

interface SettingsPanelProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

function updateSettings(
  settings: Settings,
  onChange: (settings: Settings) => void,
  patch: Partial<Settings>,
) {
  onChange({ ...settings, ...patch });
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <SectionCard
      title="Ustawienia silnika"
      subtitle="Przełącz tryb exact/approx, dziedzinę rozwiązań, jednostki kątowe i sposób wyświetlania ułamków."
    >
      <div className="settings-grid">
        <label className="field">
          <span>Tryb obliczeń</span>
          <select
            data-testid="settings-mode-select"
            value={settings.mode}
            onChange={(event) =>
              updateSettings(settings, onChange, {
                mode: event.target.value as Settings["mode"],
              })
            }
          >
            <option value="exact">Exact / Symboliczny</option>
            <option value="approx">Approx / Numeryczny</option>
          </select>
        </label>

        <label className="field">
          <span>Dziedzina rozwiązań</span>
          <select
            data-testid="settings-solution-domain-select"
            value={settings.solution_domain}
            onChange={(event) =>
              updateSettings(settings, onChange, {
                solution_domain: event.target.value as Settings["solution_domain"],
              })
            }
          >
            <option value="real">Rzeczywiste</option>
            <option value="complex">Zespolone</option>
          </select>
        </label>

        <label className="field">
          <span>Jednostki kątowe</span>
          <select
            data-testid="settings-angle-select"
            value={settings.angle_mode}
            onChange={(event) =>
              updateSettings(settings, onChange, {
                angle_mode: event.target.value as Settings["angle_mode"],
              })
            }
          >
            <option value="rad">Radiany</option>
            <option value="deg">Stopnie</option>
            <option value="grad">Grady</option>
          </select>
        </label>

        <label className="field">
          <span>Ułamki</span>
          <select
            data-testid="settings-fraction-select"
            value={settings.fraction_display}
            onChange={(event) =>
              updateSettings(settings, onChange, {
                fraction_display: event.target.value as Settings["fraction_display"],
              })
            }
          >
            <option value="improper">Niewłaściwe</option>
            <option value="mixed">Mieszane</option>
          </select>
        </label>

        <label className="field">
          <span>Precyzja numeryczna</span>
          <input
            data-testid="settings-precision-input"
            type="number"
            min={4}
            max={20}
            value={settings.precision}
            onChange={(event) =>
              updateSettings(settings, onChange, {
                precision: Number(event.target.value),
              })
            }
          />
        </label>
      </div>
    </SectionCard>
  );
}
