import type { Drafts } from "./drafts";

export type HistoryEdit = { label: string; group?: string; at?: number };
type Transaction = { before: Drafts; after: Drafts; label: string; group?: string; at: number };
export type DraftHistory = { present: Drafts; past: Transaction[]; future: Transaction[]; group: string | null };
const maxTransactions = 100;
const typingWindow = 1500;
const equal = (left: Drafts, right: Drafts) => JSON.stringify(left) === JSON.stringify(right);

/** Snapshots are immutable draft maps; their original blob SHAs travel with edits. */
export function createHistory(present: Drafts = {}): DraftHistory {
  return { present, past: [], future: [], group: null };
}
export function endHistoryGroup(history: DraftHistory): DraftHistory {
  return history.group === null ? history : { ...history, group: null };
}
export function recordHistory(history: DraftHistory, next: Drafts, edit: HistoryEdit): DraftHistory {
  if (equal(history.present, next)) return history;
  const at = edit.at ?? Date.now();
  const last = history.past.at(-1);
  const grouped = Boolean(edit.group && edit.group === history.group && last?.group === edit.group && at - last.at >= 0 && at - last.at <= typingWindow && !history.future.length);
  const before = grouped ? last!.before : history.present;
  const entry: Transaction = { before, after: next, label: edit.label, group: edit.group, at };
  const past = grouped ? history.past.slice(0, -1) : history.past;
  return { present: next, past: equal(before, next) ? past : [...past, entry].slice(-maxTransactions), future: [], group: edit.group ?? null };
}
export function undoHistory(history: DraftHistory): DraftHistory {
  const entry = history.past.at(-1);
  return entry ? { present: entry.before, past: history.past.slice(0, -1), future: [...history.future, entry], group: null } : history;
}
export function redoHistory(history: DraftHistory): DraftHistory {
  const entry = history.future.at(-1);
  return entry ? { present: entry.after, past: [...history.past, entry], future: history.future.slice(0, -1), group: null } : history;
}
