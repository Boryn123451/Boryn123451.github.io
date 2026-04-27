import type { MemoryEntry } from "../types";
import { LatexBlock } from "./LatexBlock";
import { SectionCard } from "./SectionCard";

interface MemoryPanelProps {
  memory: MemoryEntry | null;
  canStore: boolean;
  onStore: () => void;
  onRecall: () => void;
  onClear: () => void;
}

export function MemoryPanel({
  memory,
  canStore,
  onStore,
  onRecall,
  onClear,
}: MemoryPanelProps) {
  return (
    <SectionCard
      title="Pamięć"
      subtitle="Przechowuj symboliczną albo numeryczną wartość ostatniego wyniku."
    >
      <div className="memory-display">
        {memory ? <LatexBlock latex={memory.latex} /> : <span className="muted">Pamięć jest pusta.</span>}
      </div>

      <div className="button-row">
        <button type="button" onClick={onStore} disabled={!canStore}>
          MS
        </button>
        <button type="button" onClick={onRecall} disabled={!memory}>
          MR
        </button>
        <button type="button" className="ghost-button" onClick={onClear} disabled={!memory}>
          MC
        </button>
      </div>
    </SectionCard>
  );
}
