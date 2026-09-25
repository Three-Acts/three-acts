import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle, Settings2 } from "lucide-react";
import { cn } from "@three-acts/utils";
import { useCmsBackend } from "../../cms/backend-context";
import type { CmsField } from "../../cms/types";
import { parseSchemaMarkup } from "../../cms/types";
import { formatDateTime } from "../../lib/format";
import { useSettingsRecord } from "../../hooks/use-settings-record";
import { Button, FormField, PanelHeader, ScrollArea, StatusPill, Textarea } from "../atoms";
import { DetailRow, EditorSection, FieldControl } from "../editor";
import type { SettingsViewProps } from "./index";
import { RedirectSettingsView } from "./redirect-settings-view";

/** Field keys per section, in display order. Unknown keys are skipped; unlisted fields land in "Other". */
const SECTIONS: Array<{ title: string; keys: string[] }> = [
  { title: "General", keys: ["siteName", "locale"] },
  { title: "Search engines", keys: ["defaultMetaDescription", "allowIndexing"] },
  { title: "Social", keys: ["defaultOgImage", "twitterHandle"] },
  { title: "Brand", keys: ["favicon"] }
];

const SCHEMA_KEY = "schemaMarkup";
const HIDDEN_KEYS = new Set(["titleTemplate"]);

export function SiteSettingsView({ collection, onDirtyChange, onSaved, redirectCollection }: SettingsViewProps) {
  const { data } = useCmsBackend();
  const { discard, draft, isDirty, isSaving, load, reportError, save, updateValue, uploadAsset, uploadGallery, uploadGalleryItem, uploadingField } =
    useSettingsRecord({ collection, onDirtyChange, onSaved });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "redirects">("general");

  // A singleton: whatever the collection holds first is the site's settings.
  useEffect(() => {
    let isMounted = true;

    data
      .listRecords(collection.id, { limit: 1 })
      .then(({ records }) => {
        if (isMounted) {
          load(records[0] ?? null);
        }
      })
      .catch((error) => {
        if (isMounted) {
          reportError(error, "Unable to load site settings");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [collection.id, data, load, reportError]);

  if (activeSection === "redirects" && redirectCollection) {
    return (
      <SiteSettingsLayout activeSection={activeSection} onSectionChange={setActiveSection} showRedirects>
        <RedirectSettingsView collection={redirectCollection} onDirtyChange={onDirtyChange} onSaved={onSaved} />
      </SiteSettingsLayout>
    );
  }

  async function handleCreate() {
    setIsCreating(true);

    try {
      load(await data.createRecord(collection.id));
      onSaved();
    } catch (error) {
      reportError(error, "Unable to create site settings");
    } finally {
      setIsCreating(false);
    }
  }

  if (isLoading) {
    return (
      <SiteSettingsLayout activeSection={activeSection} onSectionChange={setActiveSection} showRedirects={Boolean(redirectCollection)}>
        <SettingsShell title={collection.label}>
        <div aria-busy="true" className="grid flex-1 place-items-center p-8 text-center">
          <p className="m-0 text-ui text-cms-subtle">Loading site settings…</p>
        </div>
        </SettingsShell>
      </SiteSettingsLayout>
    );
  }

  if (!draft) {
    return (
      <SiteSettingsLayout activeSection={activeSection} onSectionChange={setActiveSection} showRedirects={Boolean(redirectCollection)}>
        <SettingsShell title={collection.label}>
        <div className="grid flex-1 place-items-center p-8">
          <div className="grid max-w-sm justify-items-center gap-3 text-center">
            <span className="grid size-9 place-items-center rounded-cms-lg bg-cms-surface text-cms-muted shadow-cms-control">
              <Settings2 size={16} aria-hidden="true" />
            </span>
            <div className="grid gap-1">
              <p className="m-0 text-ui-lg font-semibold text-cms-text">No site settings yet</p>
              <p className="m-0 text-ui text-cms-subtle">
                Create them to set the site name, title template, and the SEO and social defaults every page falls back to.
              </p>
            </div>
            <Button disabled={isCreating} onClick={handleCreate} variant="primary">
              {isCreating ? "Creating…" : "Create site settings"}
            </Button>
          </div>
        </div>
        </SettingsShell>
      </SiteSettingsLayout>
    );
  }

  const fieldsByKey = new Map(collection.fields.map((field) => [field.key, field] as const));
  const sectionedKeys = new Set([...SECTIONS.flatMap((section) => section.keys), SCHEMA_KEY, ...HIDDEN_KEYS]);
  const otherFields = collection.fields.filter((field) => !sectionedKeys.has(field.key));
  const schemaField = fieldsByKey.get(SCHEMA_KEY);
  const schemaText = String(draft.values[SCHEMA_KEY] ?? "");
  const schemaResult = parseSchemaMarkup(schemaText);

  function renderField(field: CmsField) {
    // `draft` is non-null past the early returns above; re-narrow for the closure.
    if (!draft) {
      return null;
    }

    return (
      <Fragment key={field.key}>
        <FieldControl
          field={field}
          onAssetUpload={uploadAsset}
          onGalleryItemUpload={uploadGalleryItem}
          onGalleryUpload={uploadGallery}
          onUpdateValue={updateValue}
          record={draft}
          uploadingField={uploadingField}
        />
      </Fragment>
    );
  }

  function handleFormatSchema() {
    if (schemaResult.ok && schemaResult.value.length > 0) {
      const value = schemaResult.value.length === 1 ? schemaResult.value[0] : schemaResult.value;
      updateValue(SCHEMA_KEY, JSON.stringify(value, null, 2));
    }
  }

  // The API rejects invalid JSON-LD on every save, so block it here with the reason inline.
  const saveBlocked = !schemaResult.ok;

  return (
    <SiteSettingsLayout activeSection={activeSection} onSectionChange={setActiveSection} showRedirects={Boolean(redirectCollection)}>
    <SettingsShell
      actions={
        <>
          {isDirty ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-1 text-ui text-cms-subtle">
                <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-cms-pending" />
                Unsaved
              </span>
              <Button disabled={isSaving} onClick={discard} variant="ghost">
                Discard
              </Button>
            </>
          ) : null}
          <StatusPill status={draft.publishStatus} />
          <Button disabled={isSaving || saveBlocked} onClick={() => void save("queued_to_publish")}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </>
      }
      title={collection.label}
    >
      <ScrollArea className="min-h-0 flex-1" viewportClassName="[overflow-anchor:none]">
        <div className="w-full">
          {SECTIONS.map((section) => {
            const fields = section.keys.flatMap((key) => {
              const field = fieldsByKey.get(key);
              return field ? [field] : [];
            });

            return fields.length > 0 ? (
              <EditorSection key={section.title} title={section.title}>
                {fields.map(renderField)}
              </EditorSection>
            ) : null;
          })}

          {schemaField ? (
            <EditorSection title="Structured data">
              <FormField description={schemaField.helpText} label={schemaField.label} required={schemaField.required}>
                <Textarea
                  aria-invalid={!schemaResult.ok || undefined}
                  className={cn(
                    "min-h-44 resize-y font-mono leading-5",
                    !schemaResult.ok && "border-cms-danger focus-visible:border-cms-danger"
                  )}
                  onChange={(event) => updateValue(SCHEMA_KEY, event.target.value)}
                  placeholder={'{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Three Acts"\n}'}
                  spellCheck={false}
                  value={schemaText}
                />
                <div className="flex min-h-6 items-center justify-between gap-3">
                  {schemaResult.ok ? (
                    <span className="text-ui text-cms-subtle">
                      {schemaResult.value.length === 0
                        ? "No structured data."
                        : `Valid JSON-LD · ${schemaResult.value.length} object${schemaResult.value.length === 1 ? "" : "s"}`}
                    </span>
                  ) : (
                    <span className="inline-flex min-w-0 items-start gap-1.5 text-ui text-cms-danger" role="alert">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 shrink-0" size={12} />
                      {schemaResult.error}
                    </span>
                  )}
                  <Button
                    className="shrink-0"
                    disabled={!schemaResult.ok || schemaResult.value.length === 0}
                    onClick={handleFormatSchema}
                    variant="ghost"
                  >
                    Format
                  </Button>
                </div>
              </FormField>
            </EditorSection>
          ) : null}

          {otherFields.length > 0 ? <EditorSection title="Other">{otherFields.map(renderField)}</EditorSection> : null}

          <EditorSection title="Item details">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailRow label="Publish status">
                <StatusPill status={draft.publishStatus} />
              </DetailRow>
              <DetailRow label="Modified">
                <span className="tabular-nums">{formatDateTime(draft.modifiedAt)}</span>
              </DetailRow>
            </div>
          </EditorSection>
        </div>
      </ScrollArea>
    </SettingsShell>
    </SiteSettingsLayout>
  );
}

function SiteSettingsLayout({
  activeSection,
  children,
  onSectionChange,
  showRedirects
}: {
  activeSection: "general" | "redirects";
  children: ReactNode;
  onSectionChange: (section: "general" | "redirects") => void;
  showRedirects: boolean;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <aside aria-label="Site settings sections" className="flex w-pane shrink-0 flex-col border-r border-cms-line-strong bg-cms-bg">
        <PanelHeader>
          <span className="text-ui-lg font-semibold text-cms-text">Site settings</span>
        </PanelHeader>
        <nav className="grid gap-0.5 p-2" aria-label="Site settings sections">
          <button
            aria-current={activeSection === "general" ? "page" : undefined}
            className={cn("h-8 rounded-cms px-2 text-left text-ui", activeSection === "general" ? "bg-cms-raised font-medium text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text")}
            onClick={() => onSectionChange("general")}
            type="button"
          >
            General
          </button>
          {showRedirects ? (
            <button
              aria-current={activeSection === "redirects" ? "page" : undefined}
              className={cn("h-8 rounded-cms px-2 text-left text-ui", activeSection === "redirects" ? "bg-cms-raised font-medium text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text")}
              onClick={() => onSectionChange("redirects")}
              type="button"
            >
              Redirects
            </button>
          ) : null}
        </nav>
      </aside>
      {children}
    </div>
  );
}

function SettingsShell({ actions, children, title }: { actions?: ReactNode; children: ReactNode; title: string }) {
  return (
    <section aria-label={title} className="flex min-h-0 min-w-0 flex-1 flex-col bg-cms-bg">
      <PanelHeader className="justify-between">
        <h2 className="truncate text-ui-lg font-semibold text-cms-text">{title}</h2>
        {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
      </PanelHeader>
      {children}
    </section>
  );
}
