import type { PublishStatus } from "../../cms/types";

export type PagePresentation = {
  state: "changed" | "draft" | "published" | "saved";
  color: string;
  label: string;
};

/** Unsaved changes take priority over the saved CMS publication state. */
export function getPagePresentation(status?: PublishStatus, changed = false): PagePresentation {
  if (changed) return { state: "changed", color: "text-cms-accent", label: "Changes" };
  if (status && status !== "published") {
    const label = status === "queued_to_publish" ? "Queued to publish" : status === "not_published" ? "Unpublished" : "Draft";
    return { state: "draft", color: "text-cms-draft", label };
  }
  return { state: status === "published" ? "published" : "saved", color: "text-cms-text", label: status === "published" ? "Published" : "Saved" };
}
