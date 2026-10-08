export type HistoryCommand = "undo" | "redo";
/** Shared between the CMS document and its separately focused canvas iframe. */
export function historyShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; shiftKey: boolean }): HistoryCommand | null {
  if ((!event.ctrlKey && !event.metaKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  return key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey ? "redo" : null;
}
