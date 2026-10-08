import { Menu } from "@base-ui-components/react/menu";
import { Plus, MoreHorizontal } from "lucide-react";
import { homeSections, type HomeSectionType } from "@three-acts/static-content";
import { Tooltip } from "../atoms";
import { popupClass } from "../atoms/styles";

const itemClass = "flex cursor-default items-center gap-6 rounded-cms-sm px-2 py-1.5 text-ui outline-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-cms-raised";
const triggerClass = "grid size-6 shrink-0 place-items-center rounded-cms text-cms-muted hover:bg-cms-raised hover:text-cms-text disabled:opacity-40";
export function InsertSection({ disabled, onInsert }: { disabled: boolean; onInsert: (type: HomeSectionType) => void }) {
  return <Menu.Root><Tooltip content="Insert an approved section after the selection"><Menu.Trigger className={triggerClass} disabled={disabled} aria-label="Insert section"><Plus size={13}/></Menu.Trigger></Tooltip>
    <Menu.Portal><Menu.Positioner sideOffset={4} align="end" className="z-60 outline-none"><Menu.Popup aria-label="Approved sections" className={`${popupClass} min-w-46 p-1`}>
      {(Object.keys(homeSections) as HomeSectionType[]).map(type => <Menu.Item key={type} className={itemClass} onClick={() => onInsert(type)}>{homeSections[type].label}</Menu.Item>)}
    </Menu.Popup></Menu.Positioner></Menu.Portal>
  </Menu.Root>;
}
export function SectionActions({ disabled, hidden, first, last, onMove, onDuplicate, onToggle }: {
  disabled: boolean; hidden: boolean; first: boolean; last: boolean;
  onMove: (delta: number) => void; onDuplicate: () => void; onToggle: () => void;
}) {
  return <Menu.Root><Tooltip content="Section actions. Alt+↑/↓ reorders the selected section in Navigator."><Menu.Trigger className={triggerClass} disabled={disabled} aria-label="Section actions"><MoreHorizontal size={14}/></Menu.Trigger></Tooltip>
    <Menu.Portal><Menu.Positioner sideOffset={4} align="end" className="z-60 outline-none"><Menu.Popup aria-label="Section actions" className={`${popupClass} min-w-46 p-1`}>
      <Menu.Item className={itemClass} disabled={first} onClick={() => onMove(-1)}>Move up<span className="ml-auto text-cms-subtle">Alt ↑</span></Menu.Item>
      <Menu.Item className={itemClass} disabled={last} onClick={() => onMove(1)}>Move down<span className="ml-auto text-cms-subtle">Alt ↓</span></Menu.Item>
      <Menu.Item className={itemClass} onClick={onDuplicate}>Duplicate</Menu.Item>
      <Menu.Item className={itemClass} onClick={onToggle}>{hidden ? "Show section" : "Hide section"}</Menu.Item>
    </Menu.Popup></Menu.Positioner></Menu.Portal>
  </Menu.Root>;
}
