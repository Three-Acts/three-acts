import { validateDesign, type StyleChange } from "@three-acts/design";
export type SourceReference = { path: string; start: number; sha: string };
export type SourceEdit = { start: number; style: StyleChange; target: string };
export type SourceContent = { code: string; edits: SourceEdit[] };
export const sourceId = (path: string) => `source:${path}`;
export function sourcePath(id: string): string {
  const path = id.startsWith("source:") ? id.slice(7) : id;
  if (
    !/^apps\/web\/src\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_[\].-]+\.(?:astro|tsx|jsx)$/.test(
      path,
    ) ||
    path.includes("..")
  )
    throw new Error("Invalid element source path.");
  return path;
}
export function validateSourceContent(input: unknown): SourceContent {
  const value = input as SourceContent;
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !["code", "edits"].includes(key)) ||
    typeof value.code !== "string" ||
    value.code.length > 200000 ||
    !Array.isArray(value.edits) ||
    value.edits.length > 200
  )
    throw new Error("Invalid source draft.");
  const seen = new Set<string>();
  const edits = value.edits.map((edit) => {
    if (
      !edit ||
      Object.keys(edit).some(
        (key) => !["start", "style", "target"].includes(key),
      ) ||
      !Number.isInteger(edit.start) ||
      edit.start < 0 ||
      edit.start > 200000 ||
      seen.has(`${edit.start}:${edit.target}`) ||
      typeof edit.target !== "string" ||
      !/^[a-zA-Z][a-zA-Z0-9_.:-]{0,179}$/.test(edit.target)
    )
      throw new Error("Invalid source edit.");
    seen.add(`${edit.start}:${edit.target}`);
    const design = validateDesign({
      version: 1,
      elements: { [edit.target]: edit.style },
      components: {},
      instances: {},
      customCss: {},
    });
    return {
      start: edit.start,
      target: edit.target,
      style: design.elements[edit.target],
    };
  });
  return { code: value.code, edits };
}
export function readSourceReference(value: unknown): SourceReference | null {
  try {
    const ref = value as SourceReference;
    if (
      !ref ||
      !Number.isInteger(ref.start) ||
      ref.start < 0 ||
      typeof ref.sha !== "string" ||
      !/^[a-f0-9]{40}$/.test(ref.sha)
    )
      return null;
    return { path: sourcePath(ref.path), start: ref.start, sha: ref.sha };
  } catch {
    return null;
  }
}
