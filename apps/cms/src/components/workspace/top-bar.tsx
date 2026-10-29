import { Loader2, Rocket, UserCircle } from "lucide-react";
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
  /** Records queued across every collection; the Publish button only renders while this is > 0. */
  queuedCount: number;
  user: AuthUser;
};

export function TopBar({ activeTab, availableTabs, onPublished, onSignOut, onTabChange, queuedCount, user }: TopBarProps) {
  const { publish, isPublishing } = usePublish({ onPublished });

  return (
    <PanelHeader className="justify-between border-cms-line-strong bg-cms-bg">
      <div className="flex min-w-0 items-center gap-3">
        <Logo />
        <WorkspaceTabs activeTab={activeTab} available={availableTabs} onChange={onTabChange} />
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <Tooltip content="Sign out">
          {/* The tooltip is visual only, so the action stays in the accessible name. */}
          <Button aria-label={`Sign out ${user.name}`} className="max-w-50" onClick={onSignOut} variant="ghost">
            <UserCircle size={15} />
            <span className="truncate">{user.name}</span>
          </Button>
        </Tooltip>
        {queuedCount > 0 ? (
          <Tooltip content="Build and deploy the live site">
            <Button disabled={isPublishing} onClick={publish} variant="primary">
              {isPublishing ? <Loader2 className="animate-spin" size={13} /> : <Rocket size={13} />}
              {isPublishing ? "Publishing…" : "Publish site"}
            </Button>
          </Tooltip>
        ) : null}
      </div>
    </PanelHeader>
  );
}
