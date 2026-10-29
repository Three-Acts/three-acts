import { useMemo } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { foldGutter, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

// The same chevron geometry, size, and stroke treatment as the CMS Lucide icons.
function foldMarker(open: boolean): HTMLElement {
  const marker = document.createElement("span");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "12");
  svg.setAttribute("height", "12");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  path.setAttribute("d", open ? "m6 9 6 6 6-6" : "m9 6 6 6-6 6");
  svg.append(path);
  marker.append(svg);
  marker.className = "cms-fold-marker";
  return marker;
}

const jsonLanguage = json();
const editorTheme = EditorView.theme({
  "&": { backgroundColor: "var(--color-cms-surface)", color: "var(--color-cms-text)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", fontSize: "var(--text-field)", lineHeight: "20px", minHeight: "180px" },
  ".cm-content": { padding: "8px 0", caretColor: "var(--color-cms-text)", minHeight: "180px" },
  ".cm-line": { padding: "0 10px" },
  ".cm-gutters": { height: "auto", alignSelf: "stretch", backgroundColor: "var(--color-cms-bg)", color: "var(--color-cms-subtle)", borderRight: "1px solid var(--color-cms-line-strong)" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 6px 0 10px" },
  ".cm-foldGutter .cm-gutterElement": { padding: "0 4px 0 0" },
  ".cms-fold-marker": { display: "inline-flex", alignItems: "center", height: "20px", verticalAlign: "top", cursor: "pointer" },
  ".cms-fold-marker:hover": { color: "var(--color-cms-text)" },
  ".cm-activeLine": { backgroundColor: "var(--color-cms-raised)" },
  ".cm-activeLineGutter": { backgroundColor: "var(--color-cms-raised)", color: "var(--color-cms-text)" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--color-cms-text)" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "var(--color-cms-accent-press)" },
  ".cm-searchMatch": { backgroundColor: "var(--color-cms-raised)", outline: "1px solid var(--color-cms-pending)" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--color-cms-accent-press)", outlineColor: "var(--color-cms-accent)" },
  ".cm-foldPlaceholder": { border: "1px solid var(--color-cms-line-strong)", borderRadius: "var(--radius-cms)", backgroundColor: "var(--color-cms-raised)", color: "var(--color-cms-muted)" },
  ".cm-panels": { backgroundColor: "var(--color-cms-bg)", color: "var(--color-cms-text)", fontFamily: "var(--font-sans)", fontSize: "var(--text-ui)", borderColor: "var(--color-cms-line-strong)" },
  ".cm-panel.cm-search": { padding: "8px 28px 8px 8px", lineHeight: "24px" },
  ".cm-textfield": { border: "1px solid var(--color-cms-line-strong)", borderRadius: "var(--radius-cms)", backgroundColor: "var(--color-cms-surface)", color: "var(--color-cms-text)", fontFamily: "var(--font-mono)", fontSize: "var(--text-field)", padding: "3px 6px" },
  ".cm-button": { border: "1px solid var(--color-cms-action-line)", borderRadius: "var(--radius-cms)", backgroundImage: "none", backgroundColor: "var(--color-cms-action-bg)", color: "var(--color-cms-text)", fontSize: "var(--text-ui)", fontFamily: "var(--font-sans)", padding: "3px 6px", minHeight: "24px" },
  ".cm-button:hover": { backgroundColor: "var(--color-cms-action-hover)" },
  ".cm-search label": { color: "var(--color-cms-muted)" },
  ".cm-search input[type=checkbox]": { accentColor: "var(--color-cms-accent)", verticalAlign: "middle" },
  ".cm-search [name=close]": { width: "24px", height: "24px", fontSize: "0", color: "var(--color-cms-muted)", display: "grid", placeItems: "center" },
  ".cm-search [name=close]::before": { content: "''", display: "block", width: "12px", height: "12px", backgroundColor: "currentColor", maskImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m18 6-12 12M6 6l12 12'/%3E%3C/svg%3E\")", maskSize: "contain" }
}, { dark: true });

const cmsTheme = [editorTheme, syntaxHighlighting(HighlightStyle.define([
  { tag: tags.propertyName, color: "var(--color-cms-pending)" },
  { tag: tags.string, color: "var(--color-cms-success)" },
  { tag: [tags.number, tags.bool, tags.null], color: "var(--color-cms-draft)" },
  { tag: tags.punctuation, color: "var(--color-cms-muted)" },
  { tag: tags.invalid, color: "var(--color-cms-danger)" }
]))];

type CodeEditorProps = {
  id: string;
  labelledBy: string;
  describedBy?: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
};

export function CodeEditor({ id, labelledBy, describedBy, value, onChange, readOnly = false, required }: CodeEditorProps) {
  const basicSetup = useMemo(() => ({ autocompletion: false, foldGutter: false, highlightActiveLine: !readOnly, highlightActiveLineGutter: !readOnly }), [readOnly]);
  const extensions = useMemo(() => [
    jsonLanguage,
    foldGutter({ markerDOM: foldMarker }),
    EditorView.lineWrapping,
    EditorView.contentAttributes.of({
      id,
      role: "textbox",
      tabindex: "0",
      "aria-multiline": "true",
      "aria-labelledby": labelledBy,
      ...(describedBy ? { "aria-describedby": describedBy } : {}),
      "aria-readonly": String(readOnly),
      "aria-required": String(Boolean(required))
    })
  ], [id, labelledBy, describedBy, readOnly, required]);

  return (
    <div className="min-w-0 overflow-hidden rounded-cms border border-cms-line-strong shadow-cms-well focus-within:border-cms-accent focus-within:outline-3 focus-within:outline-solid focus-within:outline-cms-accent/20">
      <CodeMirror
        basicSetup={basicSetup}
        editable={!readOnly}
        extensions={extensions}
        indentWithTab={false}
        maxHeight="360px"
        minHeight="180px"
        onChange={onChange}
        placeholder={readOnly ? "No value" : "Enter JSON…"}
        readOnly={readOnly}
        theme={cmsTheme}
        value={value}
      />
    </div>
  );
}
