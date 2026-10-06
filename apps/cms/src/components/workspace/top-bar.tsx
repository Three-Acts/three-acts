import { ArrowUpRight, ChevronDown, Loader2, Rocket, UserCircle, X } from "lucide-react";
import { Popover } from "@base-ui-components/react/popover";
import type { AuthUser } from "@three-acts/auth";
import { Button, Logo, PanelHeader, Tooltip } from "../atoms";
import { usePublish } from "../../hooks/use-publish";
import { WorkspaceTabs } from "./workspace-tabs";
import type { WorkspaceTab } from "./workspace-tabs";

type TopBarProps = {
  activeTab: WorkspaceTab;
  availableTabs: WorkspaceTab[];
  onTabChange: (tab: WorkspaceTab) => void;
  /** Called after queued records have been published so the workspace can refresh its list. */
  onPublished?: () => void;
  onSignOut: () => Promise<void>;
  /** Records queued across every collection for the site deployment section. */
  queuedCount: number;
  user: AuthUser;
  designerToolbarRef?: (element: HTMLDivElement | null) => void;
  editorBusy?: boolean;
  publishOpen: boolean;
  onPublishOpenChange: (open: boolean) => void;
  viewSiteUrl?: string | null;
};

export function TopBar({ activeTab, availableTabs, onPublished, onSignOut, onTabChange, queuedCount, user, designerToolbarRef, editorBusy = false, publishOpen, onPublishOpenChange, viewSiteUrl }: TopBarProps) {
  const { publish, isPublishing } = usePublish({ onPublished });

  return (
    <PanelHeader className="justify-between gap-2 border-cms-line-strong bg-cms-bg" render={<header aria-label="Workspace toolbar"/>}>
      <div className="flex shrink-0 items-center gap-3">
        <Logo />
        <WorkspaceTabs activeTab={activeTab} available={availableTabs} onChange={onTabChange} />
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        {activeTab === "page-settings" && viewSiteUrl && <a href={viewSiteUrl} target="_blank" rel="noopener noreferrer" aria-label="View site" title="View site" className="flex h-7 items-center gap-1 rounded-cms px-1.5 text-ui text-cms-muted hover:bg-cms-raised hover:text-cms-text focus-visible:outline-1 focus-visible:outline-cms-accent"><ArrowUpRight size={14}/><span className="hidden sm:inline">View site</span></a>}
        <Tooltip content="Sign out">
          {/* The tooltip is visual only, so the action stays in the accessible name. */}
          <Button aria-label={`Sign out ${user.name}`} disabled={editorBusy} className={activeTab === "page-settings" ? "size-7 shrink-0 p-1" : "max-w-50"} onClick={onSignOut} variant="ghost">
            <UserCircle size={15} />
            <span className={activeTab === "page-settings" ? "sr-only" : "truncate"}>{user.name}</span>
          </Button>
        </Tooltip>
        {(activeTab === "page-settings" || queuedCount > 0 || isPublishing) && <Popover.Root open={publishOpen} onOpenChange={onPublishOpenChange}>
          <Popover.Trigger render={<Button variant="primary"/>} aria-label="Publish" disabled={isPublishing || editorBusy}>
            {isPublishing ? <Loader2 className="animate-spin" size={13}/> : <Rocket size={13}/>}
            {isPublishing ? "Publishing…" : "Publish"}<ChevronDown size={12}/>
          </Popover.Trigger>
          <Popover.Portal><Popover.Positioner align="end" sideOffset={5} className="z-50">
            <Popover.Popup role="dialog" aria-label="Publishing" className="flex max-h-[calc(100dvh-64px)] w-96 max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-cms border border-cms-line-strong bg-cms-bg text-cms-text shadow-cms-popup outline-none">
              <header className="flex h-9 shrink-0 items-center justify-between border-b border-cms-line px-3">
                <h2 className="m-0 text-ui font-semibold">Source &amp; publishing</h2>
                <button type="button" aria-label="Close publishing" className="grid size-6 place-items-center rounded-cms text-cms-muted hover:bg-cms-raised focus-visible:outline-1 focus-visible:outline-cms-accent" onClick={() => onPublishOpenChange(false)}><X size={13}/></button>
              </header>
              <div className="min-h-0 overflow-y-auto">
                {activeTab === "page-settings" && <div ref={designerToolbarRef} aria-label="Source actions"/>}
                <section aria-label="Site deployment" className="grid gap-2 border-t border-cms-line p-3">
                  <div className="flex items-center justify-between gap-2 text-ui"><strong className="font-medium">Site deployment</strong><span className="text-cms-subtle">{queuedCount} queued CMS record{queuedCount === 1 ? "" : "s"}</span></div>
                  <p className="m-0 text-ui leading-4 text-cms-muted">Publishes queued CMS records and requests a site build. Push browser drafts to GitHub before deploying them.</p>
                </section>
              </div>
              <footer className="flex shrink-0 justify-end gap-1.5 border-t border-cms-line bg-cms-surface px-3 py-2">
                <Button onClick={() => onPublishOpenChange(false)}>Close</Button>
                <Button variant="primary" disabled={isPublishing || editorBusy} onClick={() => { onPublishOpenChange(false); void publish(); }}><Rocket size={13}/>Publish site</Button>
              </footer>
            </Popover.Popup>
          </Popover.Positioner></Popover.Portal>
        </Popover.Root>}
      </div>
    </PanelHeader>
  );
}
