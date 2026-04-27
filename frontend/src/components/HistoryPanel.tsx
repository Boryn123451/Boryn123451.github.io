import { useMemo, useState } from "react";

import type { HistoryEntry } from "../types";
import { LatexBlock } from "./LatexBlock";
import { SectionCard } from "./SectionCard";

interface HistoryPanelProps {
  entries: HistoryEntry[];
  onReuse: (entry: HistoryEntry) => void;
  onApplyResult: (entry: HistoryEntry) => void;
  onClear: () => void;
}

function isLongHistoryEntry(entry: HistoryEntry) {
  return entry.resultLatex.length > 180 || entry.resultPlain.length > 160;
}

function buildHistoryPreview(entry: HistoryEntry) {
  const normalized = entry.resultPlain.replace(/\s+/g, " ").trim();
  if (normalized.length <= 120) {
    return normalized;
  }
  return `${normalized.slice(0, 120).trimEnd()}...`;
}

export function HistoryPanel({ entries, onReuse, onApplyResult, onClear }: HistoryPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const visibleExpandedIds = useMemo(
    () =>
      entries.reduce<Record<string, boolean>>((accumulator, entry) => {
        if (expandedIds[entry.id]) {
          accumulator[entry.id] = true;
        }
        return accumulator;
      }, {}),
    [entries, expandedIds],
  );

  function toggleEntry(entryId: string) {
    setExpandedIds((current) => ({
      ...current,
      [entryId]: !current[entryId],
    }));
  }

  return (
    <SectionCard
      title="Historia"
      subtitle="Ostatnie obliczenia są zapisywane lokalnie w przeglądarce."
      action={
        <button className="ghost-button" onClick={onClear} type="button">
          Wyczyść
        </button>
      }
    >
      {entries.length === 0 ? (
        <div className="placeholder">Historia jest pusta.</div>
      ) : (
        <div className="history-list">
          {entries.map((entry) => {
            const isLong = isLongHistoryEntry(entry);
            const isExpanded = Boolean(visibleExpandedIds[entry.id]);

            return (
              <article className="history-item" key={entry.id}>
                <div className="history-item__top">
                  <strong>{entry.title}</strong>
                  <span>{new Date(entry.createdAt).toLocaleString("pl-PL")}</span>
                </div>

                {isLong && !isExpanded ? (
                  <div className="history-item__summary">
                    <span className="history-item__summary-label">Skrót wyniku</span>
                    <code title={entry.resultPlain}>{buildHistoryPreview(entry)}</code>
                  </div>
                ) : (
                  <div className="history-item__math history-item__math--scroll">
                    <LatexBlock latex={entry.resultLatex} />
                  </div>
                )}

                <div className="history-item__actions">
                  <div className="button-row">
                    {isLong ? (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() => toggleEntry(entry.id)}
                      >
                        {isExpanded ? "Zwiń wynik" : "Pokaż wynik"}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => onReuse(entry)}>
                      Użyj ponownie
                    </button>
                    <button type="button" className="ghost-button" onClick={() => onApplyResult(entry)}>
                      Wstaw wynik
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
