import { Database, FileText, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@three-acts/utils";
import { focusRing } from "../atoms";

/** Top-level workspace areas, switched from the top bar (Webflow's Design | CMS | Insights). */
export type WorkspaceTab = "cms" | "site-settings" | "page-settings";

const tabs: Array<{ id: WorkspaceTab; label: string; icon: LucideIcon }> = [
  { id: "cms", label: "CMS", icon: Database },
  { id: "site-settings", label: "Site", icon: Settings2 },
  { id: "page-settings", label: "Page", icon: FileText }
];

type WorkspaceTabsProps = {
  activeTab: WorkspaceTab;
  /** Tabs to offer; settings tabs are hidden when the registry has no matching collection. */
  available: WorkspaceTab[];
  onChange: (tab: WorkspaceTab) => void;
};

export function WorkspaceTabs({ activeTab, available, onChange }: WorkspaceTabsProps) {
  return (
    <nav aria-label="Workspace" className="flex items-center gap-0.5">
      {tabs
        .filter((tab) => available.includes(tab.id))
        .map(({ id, label, icon: Icon }) => {
          const active = id === activeTab;

          return (
            <button
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-cms px-2 text-ui transition-colors",
                // Same location treatment as the sidebar: fill and weight, not the accent.
                active ? "bg-cms-raised font-medium text-cms-text" : "text-cms-muted hover:bg-cms-surface hover:text-cms-text",
                focusRing
              )}
              key={id}
              onClick={() => onChange(id)}
              type="button"
            >
              <Icon size={14} />
              {label}
            </button>
          );
        })}
    </nav>
  );
}
