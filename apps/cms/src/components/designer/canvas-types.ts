import type { CmsSource } from "@three-acts/cms-schema";
export type CanvasVisibility = { state: "visible" | "hidden" | "revealed"; reason?: string };
export type CanvasTreeStatus = { limit: number; maximum: number; loaded: number; total: number; hasMore: boolean; capped: boolean };
export type CanvasNode = {
  visibility?: CanvasVisibility;
  selector: string;
  parentSelector: string | null;
  tag: string;
  label: string;
  category: "element" | "component" | "cms";
  binding?: { id: string; path: string };
  depth: number;
};

export type CanvasSelection = {
  visibility?: CanvasVisibility;
  cmsSource?: CmsSource;
  selector: string;
  tag: string;
  label: string;
  category: "element" | "component" | "cms";
  binding?: { id?: string; path?: string; collectionId?: string; field?: string };
  textState?: "editable" | "unbound" | "structured" | "empty";
  textField?: { id: string; path: string; value: string };
  textFormat?: "prose";
  attributes?: CanvasAttribute[];
  editable: boolean;
  breadcrumbs: Array<{ selector: string; label: string }>;
  classNames?: string[];
  styles: Record<string, string>;
  sourceClasses?: string[];
  designTarget?: { kind: "element"; id: string } | { kind: "component"; component: string; part: string };
  component?: { name: string; instanceId?: string; props: Record<string, string>; sourceProps?: Record<string, string>; fields: Array<{ id: string; path: string; label: string; value: string }> };
  editingComponent?: string;
};

export type CanvasAttribute = {
  name: "href" | "src" | "alt" | "title" | "target" | "aria-label";
  value: string;
  binding?: { id: string; path: string };
};
