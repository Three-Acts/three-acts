import type { CmsCollectionSummary } from "../../cms/types";

/** Props shared by every dedicated settings screen the workspace mounts in place of the table. */
export type SettingsViewProps = {
  collection: CmsCollectionSummary;
  /** Optional site subview collection rendered alongside the site singleton. */
  redirectCollection?: CmsCollectionSummary;
  /** Optional media collection rendered alongside the site singleton. */
  mediaCollection?: CmsCollectionSummary;
  /** Lets the workspace guard navigation away from unsaved edits. */
  onDirtyChange: (dirty: boolean) => void;
  /** Called after a save/status change so the workspace can refresh summaries (queued counts). */
  onSaved: () => void;
};

export { SiteSettingsView } from "./site-settings-view";
export { PageSettingsView } from "./page-settings-view";
export { MediaSettingsView } from "./redirect-settings-view";
