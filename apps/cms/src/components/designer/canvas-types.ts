export type CanvasNode = {
  selector: string;
  parentSelector: string | null;
  tag: string;
  label: string;
  category: "element" | "component" | "cms";
  binding?: { id: string; path: string };
  depth: number;
};

export type CanvasSelection = {
  selector: string;
  tag: string;
  label: string;
  category: "element" | "component" | "cms";
  binding?: { id?: string; path?: string; collectionId?: string; field?: string };
  textState?: "editable" | "unbound" | "structured" | "empty";
  textField?: { id: string; path: string; value: string };
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
