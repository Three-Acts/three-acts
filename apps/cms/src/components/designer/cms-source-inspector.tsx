import { cmsSourceField, collectionRegistry, type CmsSource } from "@three-acts/cms-schema";
import { ArrowUpRight } from "lucide-react";
import { BareIconButton, Tooltip } from "../atoms";

export function CmsSourceInspector({ source, disabled, onOpen }: { source?: CmsSource; disabled: boolean; onOpen?: (source: CmsSource) => void }) {
  const collection = source && collectionRegistry.find(collection => collection.id === source.collectionId);
  const field = source && cmsSourceField(source);
  return <section aria-label="CMS source" className="grid gap-1 border-b border-cms-line px-2 py-2 text-ui">
    {source && collection ? <>
      <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-violet-400">{collection.label} · {field?.label ?? "Item"}</span><Tooltip content="Edit this CMS item, then return to your canvas selection"><BareIconButton aria-label="Edit CMS item" className="size-6 shrink-0" disabled={disabled || !onOpen} onClick={() => onOpen?.(source)}><ArrowUpRight size={13}/></BareIconButton></Tooltip></div>
      <span className="truncate text-cms-text" title={source.label}>{source.label}</span>
      <details><summary className="cursor-pointer text-[10px] text-cms-subtle">Source identity</summary><code className="block break-words text-[10px] text-cms-muted">{source.collectionId} / {source.recordId}{source.field ? ` / ${source.field}` : ""}</code></details>
    </> : <p className="m-0 leading-4 text-cms-muted">This CMS element has no registered record identity. Select its bound content to open a source item.</p>}
  </section>;
}
