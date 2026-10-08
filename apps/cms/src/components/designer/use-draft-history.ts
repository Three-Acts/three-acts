import { useCallback, useRef, useState } from "react";
import type { Drafts } from "./drafts";
import { createHistory, endHistoryGroup, recordHistory, redoHistory, undoHistory, type DraftHistory, type HistoryEdit } from "./history";

export function useDraftHistory() {
  const [history, setHistory] = useState(createHistory);
  const current = useRef(history);
  const apply = useCallback((next: DraftHistory) => {
    current.current = next;
    setHistory(next);
    return next.present;
  }, []);
  const record = useCallback((drafts: Drafts, edit: HistoryEdit) => apply(recordHistory(current.current, drafts, edit)), [apply]);
  const reset = useCallback((drafts: Drafts) => apply(createHistory(drafts)), [apply]);
  const endGroup = useCallback(() => { apply(endHistoryGroup(current.current)); }, [apply]);
  const undo = useCallback(() => apply(undoHistory(current.current)), [apply]);
  const redo = useCallback(() => apply(redoHistory(current.current)), [apply]);
  return { drafts: history.present, undoLabel: history.past.at(-1)?.label, redoLabel: history.future.at(-1)?.label, record, reset, endGroup, undo, redo };
}
