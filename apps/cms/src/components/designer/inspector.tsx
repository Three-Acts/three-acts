import { Image, Link, Type } from "lucide-react";
import { contentFields, type ContentObject, type ContentField } from "@three-acts/static-content";
import { Button, FormField, PanelHeader, ScrollArea, SearchInput, Textarea } from "../atoms";
import { fieldLabel } from "./drafts";

export function Inspector({ content, selected, query, onQuery, onSelect, onChange, disabled }: {
  content: ContentObject; selected: string | null; query: string; onQuery: (value: string) => void;
  onSelect: (field: ContentField) => void; onChange: (field: ContentField, value: string | number | boolean) => void; disabled: boolean;
}) {
  const fields = contentFields(content);
  const active = fields.find((field) => field.path.join(".") === selected);
  const filtered = fields.filter((field) => `${fieldLabel(field.path)} ${field.value}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <aside aria-label="Content inspector" className="flex min-h-0 w-60 shrink-0 flex-col border-l border-cms-line-strong bg-cms-bg">
      <PanelHeader className="h-8 justify-between gap-2 bg-cms-bg px-2">
        <span className="flex min-w-0 items-center gap-2 text-ui font-semibold text-cms-text"><Type aria-hidden="true" size={14} />Content</span>
        <span className="shrink-0 text-ui tabular-nums text-cms-subtle">{fields.length} fields</span>
      </PanelHeader>

      <section className="shrink-0 border-b border-cms-line px-2 py-2" aria-label="Selected field">
        {active ? (
          <>
            {typeof active.value === "boolean" ? (
              <FormField className="mb-0 gap-1" htmlFor="selected-field" label={fieldLabel(active.path)}>
                <input
                  id="selected-field"
                  type="checkbox"
                  checked={active.value}
                  disabled={disabled}
                  onChange={(event) => onChange(active, event.target.checked)}
                  className="size-4 accent-cms-accent"
                />
              </FormField>
            ) : (
              <FormField className="mb-0 gap-1" htmlFor="selected-field" label={fieldLabel(active.path)}>
                <Textarea
                  id="selected-field"
                  rows={String(active.value).length > 120 ? 6 : 2}
                  value={String(active.value)}
                  disabled={disabled}
                  onChange={(event) => onChange(active, typeof active.value === "number" ? Number(event.target.value) : event.target.value)}
                  className="resize-y"
                />
              </FormField>
            )}
            <p className="mb-0 mt-1 text-ui leading-4 text-cms-subtle">Canvas updates are saved in your draft until you push.</p>
            {(active.path.includes("metadata_1") || (active.path[0] === "site" && ["name", "description", "defaultImage", "twitter", "locale"].includes(active.path[1]))) && (
              <p className="mb-0 mt-1 rounded-cms border border-cms-danger-line bg-cms-danger-surface px-2 py-1 text-ui leading-4 text-cms-muted">
                Published CMS settings can override this value on your website.
              </p>
            )}
          </>
        ) : (
          <div className="grid gap-0.5 py-1">
            <h3 className="m-0 text-ui font-medium text-cms-text">Select something to edit</h3>
            <p className="m-0 text-ui leading-4 text-cms-subtle">Click the canvas or choose a field below.</p>
          </div>
        )}
      </section>

      <div className="shrink-0 border-b border-cms-line px-2 py-1.5">
        <SearchInput ariaLabel="Search fields" placeholder="Find a field…" value={query} onChange={onQuery} />
      </div>

      <ScrollArea className="min-h-0 flex-1" viewportClassName="py-1">
        <div className="px-1.5">
          {filtered.map((field) => {
            const key = field.path.join(".");
            const leaf = field.path.at(-1) ?? "";
            const isSelected = key === selected;
            return (
              <Button
                key={key}
                aria-pressed={isSelected}
                aria-label={`Edit ${fieldLabel(field.path)}: ${String(field.value) || "Empty"}`}
                title={`${fieldLabel(field.path)}: ${String(field.value) || "Empty"}`}
                className={`h-7 w-full justify-start gap-2 px-1.5 text-left ${isSelected ? "bg-cms-raised text-cms-text" : "bg-transparent text-cms-muted shadow-none hover:bg-cms-surface hover:text-cms-text"}`}
                disabled={disabled}
                onClick={() => onSelect(field)}
                variant="ghost"
              >
                {/href|url/.test(leaf) ? <Link aria-hidden="true" className="shrink-0 text-cms-subtle" size={14} /> : /src|alt/.test(leaf) ? <Image aria-hidden="true" className="shrink-0 text-cms-subtle" size={14} /> : <Type aria-hidden="true" className="shrink-0 text-cms-subtle" size={14} />}
                <span className="block min-w-0 flex-1 truncate text-ui">{fieldLabel(field.path)}</span>
              </Button>
            );
          })}
          {!filtered.length && <p className="m-0 px-2 py-3 text-ui text-cms-subtle">No fields match your search.</p>}
        </div>
      </ScrollArea>
    </aside>
  );
}
