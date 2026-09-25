import { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import type { CmsField, ImageField, PublishStatus } from "../../cms/types";
import { applyTitleTemplate, parseSchemaMarkup } from "../../cms/types";
import { hasPublishWorkflow, isEditable } from "../../lib/records";
import { Button, ConfirmDialog, PanelHeader, ScrollArea, StatusPill, useToast } from "../atoms";
import { EditorSection, FieldControl } from "../editor";
import { SchemaMarkupField, SeoTextField } from "./page-settings/fields";
import { PageList } from "./page-settings/page-list";
import { SearchResultPreview, SocialCardPreview } from "./page-settings/previews";
import {
  absoluteUrl,
  canonicalFor,
  DESCRIPTION_LIMIT,
  imageSrc,
  text,
  TITLE_LIMIT,
  validateCanonicalUrl,
  validatePagePath
} from "./page-settings/seo";
import type { SiteDefaults } from "./page-settings/seo";
import { usePageSettings } from "./page-settings/use-page-settings";
import type { SettingsViewProps } from "./index";


const noop = () => {};

/**
 * Per-page SEO for the site's static routes (Webflow's "Page settings"): a
 * page list on the left, the selected page's settings in the middle, and
 * live search/social previews on the right, rendered through the sitewide
 * title template and default share image.
 */
export function PageSettingsView({ collection, onDirtyChange, onSaved }: SettingsViewProps) {
  const settings = usePageSettings(collection, { onDirtyChange, onSaved });
  const { draft, isDirty, isSaving, pages, selectedId } = settings;
  const toast = useToast();
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  // Required-but-empty errors only appear once a save has been attempted;
  // format errors (bad path, bad JSON) show as they're typed.
  const [showRequired, setShowRequired] = useState(false);
  const editable = isEditable(collection);
  const publishable = hasPublishWorkflow(collection);

  function guard(action: () => void) {
    if (isDirty) {
      setPendingAction(() => action);
    } else {
      action();
    }
  }

  function selectPage(pageId: string) {
    if (pageId === selectedId) {
      return;
    }

    guard(() => {
      setShowRequired(false);
      settings.selectPage(pageId);
    });
  }

  const values = draft?.values ?? {};
  const pageName = text(values, "pageName");
  const pagePath = text(values, "pagePath");
  const otherPaths = pages.filter((page) => page.id !== draft?.id).map((page) => text(page.values, "pagePath"));
  const nameError = showRequired && !pageName.trim() ? "A page name is required." : null;
  const rawPathError = validatePagePath(pagePath, otherPaths);
  const pathError = rawPathError && (pagePath || showRequired) ? rawPathError : null;
  const canonicalError = validateCanonicalUrl(text(values, "canonicalUrl"));
  const schemaResult = parseSchemaMarkup(text(values, "schemaMarkup"));
  const blockingErrors = [
    !pageName.trim() ? "page name" : null,
    rawPathError ? "page path" : null,
    canonicalError ? "canonical URL" : null,
    schemaResult.ok ? null : "schema markup"
  ].filter((item): item is string => item !== null);

  async function handleSave(nextStatus?: Exclude<PublishStatus, "published">) {
    // Draft-only saves (and unpublishing) may carry an unfinished page; a
    // page queued for the live site must be complete and valid.
    if (blockingErrors.length > 0 && nextStatus !== "not_published") {
      setShowRequired(true);
      const description = `Fix the ${blockingErrors.join(", ")} before saving.`;
      // Base UI's toast `add` flushes synchronously; defer it out of React's update.
      window.setTimeout(() => toast.push({ tone: "error", title: "Check this page’s settings", description, duration: 6000 }), 0);
      return;
    }

    const saved = await settings.save(nextStatus);
    if (saved) {
      setShowRequired(false);
    }
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <PageList
        isLoading={settings.isLoading}
        onSelect={selectPage}
        pages={pages}
        selectedId={selectedId}
        showStatus={publishable}
        title={collection.label}
      />

      {draft ? (
        <section aria-label={`${pageName || "Untitled page"} settings`} className="flex min-h-0 min-w-0 flex-1 flex-col bg-cms-bg">
          <PanelHeader className="justify-between">
            <div className="flex min-w-0 items-baseline gap-2">
              <h2 className="truncate text-ui-lg font-semibold text-cms-text">{pageName || "Untitled page"}</h2>
              <span className="truncate font-mono text-ui text-cms-subtle">{pagePath}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {isDirty ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-1 text-ui text-cms-subtle">
                    <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-cms-pending" />
                    Unsaved
                  </span>
                  <Button disabled={isSaving} onClick={() => void settings.discard()} variant="ghost">
                    Discard
                  </Button>
                </>
              ) : null}
              {publishable ? <StatusPill status={draft.publishStatus} /> : null}
              {editable ? (
                <Button disabled={isSaving || !isDirty} onClick={() => void handleSave()} variant={publishable ? "normal" : "primary"}>
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              ) : null}
            </div>
          </PanelHeader>

          <div className="flex min-h-0 flex-1">
            <ScrollArea className="min-h-0 min-w-0 flex-1" viewportClassName="[overflow-anchor:none]">
              {settings.hasConflict ? (
                <div
                  className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-cms border border-cms-danger-line bg-cms-danger-surface px-3 py-2 text-ui text-cms-text"
                  role="alert"
                >
                  <span className="min-w-0">This page was changed elsewhere. Reload it to get the latest version, then reapply your edits.</span>
                  <Button onClick={() => void settings.discard()}>Reload latest</Button>
                </div>
              ) : null}

              <PageSettingsForm
                canonicalError={canonicalError}
                editable={editable}
                fields={collection.fields}
                nameError={nameError}
                onUpdateValue={settings.updateValue}
                onUpload={settings.uploadAsset}
                pathError={pathError}
                record={draft}
                site={settings.site}
                uploadingField={settings.uploadingField}
              />

            </ScrollArea>
          </div>
        </section>
      ) : (
        <div className="grid min-w-0 flex-1 place-items-center p-8 text-center">
          <div className="grid justify-items-center gap-2">
            <FileText aria-hidden="true" className="text-cms-subtle" size={20} />
            <p className="m-0 text-ui text-cms-subtle">
              {settings.isLoading ? "Loading pages…" : pages.length === 0 ? "Add a page to edit its SEO settings." : "Select a page to edit its settings."}
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        confirmLabel="Discard"
        description="You have unsaved changes to this page. Discard them?"
        onConfirm={() => pendingAction?.()}
        onOpenChange={(open) => {
          if (!open) {
            setPendingAction(null);
          }
        }}
        open={pendingAction !== null}
        title="Discard unsaved changes?"
      />
    </div>
  );
}

type PageSettingsFormProps = {
  canonicalError: string | null;
  editable: boolean;
  fields: CmsField[];
  nameError: string | null;
  onUpdateValue: (fieldKey: string, value: string) => void;
  onUpload: ReturnType<typeof usePageSettings>["uploadAsset"];
  pathError: string | null;
  record: NonNullable<ReturnType<typeof usePageSettings>["draft"]>;
  site: SiteDefaults;
  uploadingField: string | null;
};

function PageSettingsForm({
  canonicalError,
  editable,
  fields,
  nameError,
  onUpdateValue,
  onUpload,
  pathError,
  record,
  site,
  uploadingField
}: PageSettingsFormProps) {
  const values = record.values;
  const pageName = text(values, "pageName");
  const pagePath = text(values, "pagePath");
  const metaTitle = text(values, "metaTitle");
  const metaDescription = text(values, "metaDescription");
  const titleFallback = metaTitle || pageName;
  const descriptionFallback = metaDescription || site.defaultMetaDescription;
  const renderedTitle = applyTitleTemplate(site.titleTemplate, titleFallback);
  const pageUrl = absoluteUrl(text(values, "canonicalUrl") || pagePath || "/");
  const searchTitle = text(values, "searchTitle") || renderedTitle;
  const searchDescription = text(values, "searchDescription") || descriptionFallback;
  const socialTitle = text(values, "ogTitle") || titleFallback;
  const socialDescription = text(values, "ogDescription") || descriptionFallback;
  const socialImage = imageSrc(text(values, "ogImage")) || site.defaultOgImage;

  // Labels and help come from the registry when it defines the field; the
  // fallbacks keep the form usable against an older registry.
  function label(key: string, fallback: string): string {
    return fields.find((field) => field.key === key)?.label ?? fallback;
  }

  function imageField(key: string, fallbackLabel: string, helpText: string): ImageField {
    const found = fields.find((field) => field.key === key);
    const base: ImageField =
      found?.type === "image" ? (found as ImageField) : { key, label: fallbackLabel, type: "image", bucket: "cms-assets", accept: "image/*" };
    return { ...base, helpText };
  }

  const bind = (key: string) => ({
    onChange: (value: string) => onUpdateValue(key, value),
    value: text(values, key)
  });

  const renderImage = (field: ImageField) => (
    <FieldControl
      field={field}
      onAssetUpload={onUpload}
      onGalleryItemUpload={noop}
      onGalleryUpload={noop}
      onUpdateValue={(key, value) => onUpdateValue(key, typeof value === "string" ? value : "")}
      readOnly={!editable}
      record={record}
      uploadingField={uploadingField}
    />
  );

  const siteImageHint = site.defaultOgImage ? "Leave empty to use the site’s default share image." : "Recommended 1200 × 630.";

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" disabled={!editable}>
      <EditorSection title="Page">
        <SeoTextField {...bind("pageName")} error={nameError} hint="Only shown in the CMS." label={label("pageName", "Page name")} required />
        <SeoTextField
          {...bind("pagePath")}
          error={pathError}
          hint="The route on the live site these settings apply to."
          label={label("pagePath", "Page path")}
          mono
          placeholder="/about"
          required
        />
        {pagePath && !pathError ? (
          <a
            className="-mt-2 mb-4 flex min-h-6 items-center gap-1.5 overflow-hidden rounded-cms bg-cms-surface px-2 font-mono text-ui text-cms-subtle transition-colors hover:bg-cms-raised hover:text-cms-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cms-focus last:mb-0"
            href={canonicalFor(pagePath)}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink aria-hidden="true" size={12} />
            <span className="truncate">{canonicalFor(pagePath)}</span>
          </a>
        ) : null}
      </EditorSection>

      <EditorSection title="SEO">
        <SeoTextField
          {...bind("metaTitle")}
          countValue={renderedTitle}
          hint={site.titleTemplate ? `Shown as “${renderedTitle}”. The count includes the site title template.` : "The title tag for browser tabs and search results."}
          label={label("metaTitle", "Title tag")}
          limit={TITLE_LIMIT}
          placeholder={pageName}
        />
        <SeoTextField
          {...bind("metaDescription")}
          countValue={metaDescription}
          hint={metaDescription || !site.defaultMetaDescription ? "The snippet under the title in search results." : "Leave empty to use the site’s default description."}
          label={label("metaDescription", "Meta description")}
          limit={DESCRIPTION_LIMIT}
          multiline
          placeholder={site.defaultMetaDescription || "Summarize this page in a sentence or two."}
        />
        <SeoTextField
          {...bind("canonicalUrl")}
          error={canonicalError}
          hint="Leave empty to use this page’s own URL. Set it only when another URL is the primary copy."
          label={label("canonicalUrl", "Canonical URL")}
          mono
          placeholder={pagePath ? canonicalFor(pagePath) : undefined}
        />
      </EditorSection>

      <EditorSection title="Open Graph">
        <p className="-mt-1 mb-3 text-ui leading-5 text-cms-subtle">How this page looks when it’s shared on social platforms and in messages.</p>
        <SeoTextField
          {...bind("ogTitle")}
          countValue={text(values, "ogTitle") || titleFallback}
          hint={text(values, "ogTitle") ? undefined : "Leave empty to use the title tag."}
          label={label("ogTitle", "Open Graph title")}
          limit={TITLE_LIMIT}
          placeholder={titleFallback}
        />
        <SeoTextField
          {...bind("ogDescription")}
          countValue={text(values, "ogDescription")}
          hint={text(values, "ogDescription") ? undefined : "Leave empty to use the meta description."}
          label={label("ogDescription", "Open Graph description")}
          limit={DESCRIPTION_LIMIT}
          multiline
          placeholder={descriptionFallback}
        />
        {renderImage(imageField("ogImage", "Open Graph image", siteImageHint))}
        <SocialCardPreview description={socialDescription} imageSrc={socialImage} title={socialTitle} url={pageUrl} />
      </EditorSection>

      <EditorSection title="Search">
        <p className="-mt-1 mb-3 text-ui leading-5 text-cms-subtle">Overrides for how this page is listed in search results.</p>
        <SeoTextField
          {...bind("searchTitle")}
          hint={text(values, "searchTitle") ? undefined : "Leave empty to use the title tag."}
          label={label("searchTitle", "Search title")}
          placeholder={titleFallback}
        />
        <SeoTextField
          {...bind("searchDescription")}
          hint={text(values, "searchDescription") ? undefined : "Leave empty to use the meta description."}
          label={label("searchDescription", "Search description")}
          multiline
          placeholder={descriptionFallback}
        />
        {renderImage(imageField("searchImage", "Search image", "Leave empty to use the Open Graph image."))}
        <SearchResultPreview
          description={searchDescription}
          faviconSrc={site.favicon}
          siteName={site.siteName}
          title={searchTitle}
          url={pageUrl}
        />
      </EditorSection>

      <EditorSection title="Schema markup">
        <SchemaMarkupField {...bind("schemaMarkup")} />
      </EditorSection>
    </fieldset>
  );
}
